import fixWebmDuration from 'fix-webm-duration';
import { AspectRatio, CaptionItem, ExportResolution, MediaAsset, MotionEffectId, ParticleEffectId, PresetStyle, TransitionEffectId } from '../types';
import { getExportDimensions, PRESETS } from '../constants';

interface ExportOptions {
  canvas?: HTMLCanvasElement;
  ratio: AspectRatio;
  resolution?: ExportResolution;
  captions: CaptionItem[];
  media: MediaAsset[];
  audioUrl?: string;
  voiceVolume?: number;
  bgAudioUrl?: string;
  bgAudioVolume?: number;
  duration: number;
  presetId: string;
  motionEffect: MotionEffectId;
  particleEffect?: ParticleEffectId;
  transitionEffect?: TransitionEffectId;
  captionSize: number;
  captionPosition: number;
  projectName: string;
  onProgress: (progress: number, status: string) => void;
}

export async function exportVideoToWebM(options: ExportOptions): Promise<string> {
  const {
    ratio,
    resolution = '1080p',
    captions,
    media,
    audioUrl,
    voiceVolume = 1.0,
    bgAudioUrl,
    bgAudioVolume = 0.3,
    duration,
    presetId,
    motionEffect,
    particleEffect = 'soft-sparkles' as ParticleEffectId,
    transitionEffect = 'crossfade' as TransitionEffectId,
    captionSize,
    captionPosition,
    projectName,
    onProgress,
  } = options;

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('This browser does not support local canvas video recording.');
  }

  const exportDim = getExportDimensions(ratio, resolution);
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportDim.width;
  exportCanvas.height = exportDim.height;

  if (!exportCanvas.captureStream) {
    throw new Error('This browser does not support canvas captureStream.');
  }

  const ctx = exportCanvas.getContext('2d', { alpha: false, desynchronized: false });
  if (!ctx) {
    throw new Error('Could not initialize canvas context');
  }

  // Pre-load all media image elements to avoid blank frames
  onProgress(2, 'Pre-buffering visual assets...');
  await Promise.all(
    media.map((item) => {
      if (item.type === 'image' && item.element) {
        const img = item.element as HTMLImageElement;
        if (!img.complete) {
          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
      }
      return Promise.resolve();
    })
  );

  onProgress(5, `Initializing 60 FPS (${exportDim.label}) export engine...`);

  const fps = 60;
  const videoStream = exportCanvas.captureStream(fps);
  let outputStream = videoStream;
  let exportAudio: HTMLAudioElement | null = null;
  let exportBgAudio: HTMLAudioElement | null = null;
  let audioContext: AudioContext | null = null;

  if (audioUrl || bgAudioUrl) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      if (audioUrl) {
        exportAudio = new Audio(audioUrl);
        exportAudio.crossOrigin = 'anonymous';
        exportAudio.preload = 'auto';

        await new Promise<void>((resolve) => {
          if (!exportAudio) return resolve();
          exportAudio.onloadedmetadata = () => resolve();
          exportAudio.onerror = () => resolve();
          exportAudio.load();
        });

        const voiceSource = audioContext.createMediaElementSource(exportAudio);
        const voiceGain = audioContext.createGain();
        voiceGain.gain.value = voiceVolume;
        voiceSource.connect(voiceGain);
        voiceGain.connect(destination);
      }

      if (bgAudioUrl) {
        exportBgAudio = new Audio(bgAudioUrl);
        exportBgAudio.crossOrigin = 'anonymous';
        exportBgAudio.preload = 'auto';
        exportBgAudio.loop = true; // Automatically loop background audio throughout the video

        await new Promise<void>((resolve) => {
          if (!exportBgAudio) return resolve();
          exportBgAudio.onloadedmetadata = () => resolve();
          exportBgAudio.onerror = () => resolve();
          exportBgAudio.load();
        });

        const bgSource = audioContext.createMediaElementSource(exportBgAudio);
        const bgGain = audioContext.createGain();
        bgGain.gain.value = bgAudioVolume;
        bgSource.connect(bgGain);
        bgGain.connect(destination);
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      outputStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);
    } catch (e) {
      console.warn('Audio stream mixin failed, continuing with silent video track:', e);
    }
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(outputStream, {
    mimeType,
    videoBitsPerSecond: exportDim.bitrate,
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  return new Promise<string>((resolve, reject) => {
    let wakeLockSentinel: any = null;

    // Try acquiring WakeLock to prevent screen timeout during render
    if ('wakeLock' in navigator && (navigator as any).wakeLock) {
      (navigator as any).wakeLock
        .request('screen')
        .then((lock: any) => {
          wakeLockSentinel = lock;
        })
        .catch(() => {
          // Wake lock not available or denied, fail silently
        });
    }

    // Web Worker script to maintain 60 FPS ticks even when tab is in background / minimized
    const workerScript = `
      let timer = null;
      onmessage = function(e) {
        if (e.data && e.data.action === 'start') {
          const fps = e.data.fps || 60;
          const interval = Math.floor(1000 / fps);
          if (timer) clearInterval(timer);
          timer = setInterval(function() {
            postMessage('tick');
          }, interval);
        } else if (e.data && e.data.action === 'stop') {
          if (timer) clearInterval(timer);
          timer = null;
        }
      };
    `;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    let worker: Worker | null = null;
    try {
      worker = new Worker(workerUrl);
    } catch (e) {
      console.warn('Worker creation failed, using fallback interval:', e);
    }

    const releaseWakeLockAndWorker = () => {
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
        worker = null;
      }
      URL.revokeObjectURL(workerUrl);
    };

    recorder.onerror = (err) => {
      releaseWakeLockAndWorker();
      if (exportAudio) exportAudio.pause();
      if (exportBgAudio) exportBgAudio.pause();
      if (audioContext) audioContext.close().catch(() => {});
      reject(err);
    };

    recorder.onstop = async () => {
      releaseWakeLockAndWorker();
      if (exportAudio) exportAudio.pause();
      if (exportBgAudio) exportBgAudio.pause();
      if (audioContext) audioContext.close().catch(() => {});

      const rawBlob = new Blob(chunks, { type: 'video/webm' });
      const durationMs = Math.round(duration * 1000);

      let finalBlob = rawBlob;
      try {
        finalBlob = await new Promise<Blob>((resolveBlob) => {
          fixWebmDuration(rawBlob, durationMs, (fixedBlob) => {
            resolveBlob(fixedBlob);
          });
        });
      } catch (err) {
        console.warn('WebM duration header patching failed, using raw blob fallback:', err);
      }

      const exportUrl = URL.createObjectURL(finalBlob);
      onProgress(100, `Export ready (${exportDim.label}) — ${(finalBlob.size / 1024 / 1024).toFixed(1)} MB WebM`);

      // Auto-trigger video download immediately upon completion
      try {
        const safeName = (projectName || 'voice-story').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const fileName = `${safeName}-${resolution}.webm`;
        const a = document.createElement('a');
        a.href = exportUrl;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 1000);
      } catch (e) {
        console.warn('Auto download trigger error:', e);
      }

      resolve(exportUrl);
    };

    if (recorder.state === 'inactive') {
      recorder.start(100);
    }

    if (exportAudio) {
      exportAudio.currentTime = 0;
      exportAudio.play().catch(() => {});
    }

    if (exportBgAudio) {
      exportBgAudio.currentTime = 0;
      exportBgAudio.play().catch(() => {});
    }

    const style = PRESETS[presetId] || PRESETS.sunset;
    const startTime = performance.now();
    let animFrameId: number | null = null;
    let isFinished = false;
    let lastRenderTime = 0;
    const frameInterval = 1000 / fps;
    const videoTrack = videoStream.getVideoTracks()[0] as any;

    function stepExport() {
      if (isFinished) return;

      const now = performance.now();
      const delta = now - lastRenderTime;

      if (delta >= frameInterval - 1.5) {
        lastRenderTime = now - (delta % frameInterval);

        let currentTime = 0;
        if (exportAudio && !exportAudio.paused) {
          currentTime = exportAudio.currentTime;
        } else if (exportAudio && exportAudio.ended) {
          currentTime = duration;
        } else {
          currentTime = (now - startTime) / 1000;
        }

        currentTime = Math.min(duration, Math.max(0, currentTime));
        const progress = Math.max(5, Math.min(98, (currentTime / duration) * 98));

        const isBg = document.hidden;
        const statusText = isBg
          ? `⚡ Background rendering (${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s)`
          : `Rendering video (${currentTime.toFixed(1)}s / ${duration.toFixed(1)}s)`;

        onProgress(progress, statusText);

        // Draw high-quality canvas frame deterministically
        drawCanvasFrame(ctx!, {
          width: exportDim.width,
          height: exportDim.height,
          time: currentTime,
          captions,
          media,
          style,
          motionEffect,
          particleEffect,
          transitionEffect,
          captionSize,
          captionPosition,
          projectName,
        });

        // Trigger precise 1-to-1 frame capture for smooth stutter-free playback
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try {
            videoTrack.requestFrame();
          } catch (e) {
            // Fallback gracefully
          }
        }

        const done = exportAudio
          ? (exportAudio.ended || currentTime >= duration)
          : (currentTime >= duration);

        if (done) {
          isFinished = true;
          if (worker) {
            worker.postMessage({ action: 'stop' });
          }
          if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
          }
          setTimeout(() => {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }, 150);
          return;
        }
      }

      if (!isFinished && !document.hidden) {
        animFrameId = requestAnimationFrame(stepExport);
      }
    }

    if (worker) {
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          if (document.hidden && !isFinished) {
            stepExport();
          }
        }
      };
      worker.postMessage({ action: 'start', fps });
    } else {
      setInterval(() => {
        if (document.hidden && !isFinished) {
          stepExport();
        }
      }, 1000 / fps);
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !isFinished) {
        if (animFrameId) cancelAnimationFrame(animFrameId);
        animFrameId = requestAnimationFrame(stepExport);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const originalOnStop = recorder.onstop;
    recorder.onstop = (e) => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (originalOnStop) originalOnStop.call(recorder, e);
    };

    animFrameId = requestAnimationFrame(stepExport);
  });
}

export function drawCanvasFrame(
  ctx: CanvasRenderingContext2D,
  params: {
    width: number;
    height: number;
    time: number;
    captions: CaptionItem[];
    media: MediaAsset[];
    style: PresetStyle;
    motionEffect?: MotionEffectId;
    particleEffect?: ParticleEffectId;
    transitionEffect?: TransitionEffectId;
    captionSize: number;
    captionPosition: number;
    projectName: string;
  }
) {
  const {
    width,
    height,
    time,
    captions,
    media,
    style,
    motionEffect = 'kenburns-zoom-in',
    particleEffect = 'soft-sparkles' as ParticleEffectId,
    transitionEffect = 'crossfade' as TransitionEffectId,
    captionSize,
    captionPosition,
    projectName,
  } = params;

  ctx.clearRect(0, 0, width, height);

  // Active caption & media determination with zero jump/flash
  let activeCaption: CaptionItem | null = null;
  let activeCaptionIdx = 0;
  let prevCaption: CaptionItem | null = null;
  let prevCaptionIdx = -1;

  if (captions.length) {
    const exactIdx = captions.findIndex((item) => time >= item.start && time < item.end);
    if (exactIdx >= 0) {
      activeCaption = captions[exactIdx];
      activeCaptionIdx = exactIdx;
      if (exactIdx > 0) {
        prevCaptionIdx = exactIdx - 1;
        prevCaption = captions[prevCaptionIdx];
      }
    } else if (time < captions[0].start) {
      activeCaption = captions[0];
      activeCaptionIdx = 0;
    } else {
      // If in gap between captions or past last caption, stay on the last caption that started <= time
      let prevIdx = 0;
      for (let i = 0; i < captions.length; i++) {
        if (captions[i].start <= time) {
          prevIdx = i;
        } else {
          break;
        }
      }
      activeCaption = captions[prevIdx];
      activeCaptionIdx = prevIdx;
      if (prevIdx > 0) {
        prevCaptionIdx = prevIdx - 1;
        prevCaption = captions[prevCaptionIdx];
      }
    }
  }

  const activeMotion = activeCaption?.motionEffect || motionEffect;
  const activeTransition = activeCaption?.transitionEffect || transitionEffect || 'crossfade';

  let mediaIndex = 0;
  if (activeCaption && media.length) {
    if (activeCaption.mediaIndex !== undefined && activeCaption.mediaIndex >= 0) {
      mediaIndex = activeCaption.mediaIndex % media.length;
    } else {
      // Auto-assign: map caption index to available media pool sequentially
      mediaIndex = activeCaptionIdx % media.length;
    }
  }

  let prevMediaIndex = -1;
  if (prevCaption && media.length) {
    if (prevCaption.mediaIndex !== undefined && prevCaption.mediaIndex >= 0) {
      prevMediaIndex = prevCaption.mediaIndex % media.length;
    } else {
      prevMediaIndex = prevCaptionIdx % media.length;
    }
  }

  const asset = media.length ? media[mediaIndex] : null;
  const prevAsset = (media.length && prevMediaIndex >= 0) ? media[prevMediaIndex] : null;

  const TRANSITION_DURATION = 0.35;
  let inTransition = false;
  let transitionProgress = 1.0;

  if (activeCaption && prevAsset && prevAsset.element && asset && asset.element && activeTransition !== 'none' && prevMediaIndex !== mediaIndex) {
    const timeSinceStart = time - activeCaption.start;
    if (timeSinceStart >= 0 && timeSinceStart < TRANSITION_DURATION) {
      inTransition = true;
      // Immediately start transitioning into the new image at activeCaption.start
      // so the visual change synchronizes precisely with the audio speech
      const rawProgress = timeSinceStart / TRANSITION_DURATION;
      transitionProgress = Math.min(1, Math.max(0, rawProgress));
    }
  }

  // Background visual or default bright backdrop
  if (asset && asset.element) {
    if (inTransition && prevAsset && prevAsset.element) {
      drawTransitionImage(
        ctx,
        prevAsset.element,
        asset.element,
        width,
        height,
        time,
        activeMotion,
        activeCaption,
        prevCaption,
        activeTransition,
        transitionProgress
      );
    } else {
      drawCoverImage(ctx, asset.element, width, height, time, activeMotion, activeCaption);
    }
    // Subtle, light gradient vignette at bottom only for text legibility (keeps image bright)
    const veil = ctx.createLinearGradient(0, height * 0.55, 0, height);
    veil.addColorStop(0, 'rgba(0, 0, 0, 0)');
    veil.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);
  } else {
    // Dynamic Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#24154a');
    gradient.addColorStop(0.52, '#151228');
    gradient.addColorStop(1, '#090810');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Glowing motion orbs
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#a78bfa';
    ctx.beginPath();
    const orbX1 = width * 0.74 + Math.sin(time * 0.8) * 30;
    const orbY1 = height * 0.22 + Math.cos(time * 0.8) * 20;
    ctx.arc(orbX1, orbY1, width * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f0abfc';
    ctx.beginPath();
    const orbX2 = width * 0.15 + Math.cos(time * 0.9) * 25;
    const orbY2 = height * 0.85 + Math.sin(time * 0.9) * 25;
    ctx.arc(orbX2, orbY2, width * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Animated floating ambient particles
  drawParticles(ctx, width, height, time, particleEffect);

  if (activeCaption?.textOnlyBg) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
  }

  // Project title watermark top left
  if (projectName) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.letterSpacing = '1px';
    ctx.fillText(projectName.toUpperCase(), width * 0.06, height * 0.08);
    ctx.restore();
  }

  // Draw active caption
  if (activeCaption) {
    ctx.save();
    const maxWidth = width * 0.82;
    const scaledSize = Math.max(18, captionSize * (width / 960));

    ctx.fillStyle = activeCaption.textOnlyBg ? '#ffffff' : style.color;
    if (activeCaption.textOnlyBg) {
      ctx.font = `900 ${scaledSize * 1.5}px "Montserrat", "Inter", system-ui, sans-serif`;
    } else {
      ctx.font = `${style.weight} ${scaledSize}px ${style.font}`;
    }
    ctx.textAlign = 'center';

    const textToDraw =
      (style.textTransform === 'uppercase' || activeCaption.textOnlyBg)
        ? activeCaption.text.toUpperCase()
        : activeCaption.text;

    const words = textToDraw.trim().split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = scaledSize * 1.25;
    const totalHeight = lines.length * lineHeight;
    const effectivePosition = activeCaption.textOnlyBg ? 50 : captionPosition;
    const centerY = height * (effectivePosition / 100);
    const startY = centerY - totalHeight / 2 + lineHeight / 2;

    lines.forEach((lineText, idx) => {
      const y = startY + idx * lineHeight;

      // Optional Box backdrop
      if (style.hasBox && !activeCaption.textOnlyBg) {
        const metrics = ctx.measureText(lineText);
        const paddingX = scaledSize * 0.4;
        const paddingY = scaledSize * 0.2;
        ctx.fillStyle = style.bgColor || 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(
          width / 2 - metrics.width / 2 - paddingX,
          y - scaledSize * 0.8 - paddingY,
          metrics.width + paddingX * 2,
          scaledSize * 1.1 + paddingY * 2
        );
        ctx.fillStyle = activeCaption.textOnlyBg ? '#ffffff' : style.color;
      }

      // Shadow glow
      if (style.hasShadow && !activeCaption.textOnlyBg) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 2;
      }

      ctx.fillText(lineText, width / 2, y);
      ctx.shadowBlur = 0;
    });

    if (activeCaption.pointers && activeCaption.pointers.length > 0) {
      const captionDuration = activeCaption.end - activeCaption.start;
      const timeInCaption = time - activeCaption.start;
      const progressPercent = captionDuration > 0 ? (timeInCaption / captionDuration) * 100 : 0;

      activeCaption.pointers.forEach(ptr => {
        if (progressPercent >= ptr.startTime && progressPercent <= ptr.endTime) {
          const { x, y, angle } = ptr;
          const px = width * (x / 100);
          const py = height * (y / 100);
          
          const bounce = Math.sin(timeInCaption * 8) * (width * 0.015);
          
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate((angle * Math.PI) / 180);
          ctx.translate(-bounce, 0); 

          const scale = width / 1080;
          ctx.scale(scale, scale);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-40, -25);
          ctx.lineTo(-28, -12);
          ctx.lineTo(-90, -12);
          ctx.lineTo(-90, 12);
          ctx.lineTo(-28, 12);
          ctx.lineTo(-40, 25);
          ctx.closePath();

          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 5;

          ctx.fillStyle = '#ef4444';
          ctx.fill();
          
          ctx.shadowColor = 'transparent';
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          ctx.restore();
        }
      });
    }

    ctx.restore();
  }
}

function drawTransitionImage(
  ctx: CanvasRenderingContext2D,
  prevSource: HTMLImageElement | HTMLVideoElement,
  nextSource: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  time: number,
  motionId: MotionEffectId,
  activeCaption: CaptionItem | null,
  prevCaption: CaptionItem | null,
  transitionId: TransitionEffectId,
  progress: number
) {
  // Gentle Ease-In & Ease-Out S-curve (cosine easing)
  const p = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, progress)));

  switch (transitionId) {
    case 'none':
      drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
      break;

    case 'soft-ambient':
    default: {
      // 1. Soft Ambient Dissolve (0.4s smooth dissolve, 0.2s pause, zero ghosting fade-through-dark)
      const prevOpacity = Math.max(0, 1 - Math.pow(p, 1.15));
      if (prevOpacity > 0.005) {
        ctx.save();
        ctx.globalAlpha = prevOpacity;
        drawCoverImage(ctx, prevSource, width, height, time, motionId, prevCaption);
        ctx.restore();
      }

      // Soft ambient dark dip at transition midpoint (prevents double exposure & character ghosting overlap)
      const ambientDarkAlpha = Math.sin(p * Math.PI) * 0.72;
      if (ambientDarkAlpha > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${ambientDarkAlpha})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      const nextOpacity = Math.max(0, Math.pow(p, 1.15));
      if (nextOpacity > 0.005) {
        ctx.save();
        ctx.globalAlpha = nextOpacity;
        drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
        ctx.restore();
      }
      break;
    }

    case 'crossfade': {
      // 2. Cinematic Crossfade
      const prevAlpha = Math.max(0, 1 - p);
      if (prevAlpha > 0.005) {
        ctx.save();
        ctx.globalAlpha = prevAlpha;
        drawCoverImage(ctx, prevSource, width, height, time, motionId, prevCaption);
        ctx.restore();
      }

      const darkBlend = Math.sin(p * Math.PI) * 0.45;
      if (darkBlend > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${darkBlend})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      if (p > 0.005) {
        ctx.save();
        ctx.globalAlpha = p;
        drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
        ctx.restore();
      }
      break;
    }

    case 'seamless-morph':
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      const prevScaleMorph = 1.0 + p * 0.02;
      ctx.translate(width / 2, height / 2);
      ctx.scale(prevScaleMorph, prevScaleMorph);
      ctx.translate(-width / 2, -height / 2);
      drawCoverImage(ctx, prevSource, width, height, time, motionId, prevCaption);
      ctx.restore();

      const morphDark = Math.sin(p * Math.PI) * 0.5;
      if (morphDark > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${morphDark})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = p;
      const nextScaleMorph = 0.98 + p * 0.02;
      ctx.translate(width / 2, height / 2);
      ctx.scale(nextScaleMorph, nextScaleMorph);
      ctx.translate(-width / 2, -height / 2);
      drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
      ctx.restore();
      break;

    case 'gentle-focus':
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * 1.05);
      const prevScaleFocus = 1.0 + p * 0.02;
      ctx.translate(width / 2, height / 2);
      ctx.scale(prevScaleFocus, prevScaleFocus);
      ctx.translate(-width / 2, -height / 2);
      drawCoverImage(ctx, prevSource, width, height, time, motionId, prevCaption);
      ctx.restore();

      const focusDark = Math.sin(p * Math.PI) * 0.6;
      if (focusDark > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${focusDark})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = Math.min(1, p * 1.05);
      const nextScaleFocus = 0.98 + p * 0.02;
      ctx.translate(width / 2, height / 2);
      ctx.scale(nextScaleFocus, nextScaleFocus);
      ctx.translate(-width / 2, -height / 2);
      drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
      ctx.restore();
      break;

    case 'silky-film-melt':
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      drawCoverImage(ctx, prevSource, width, height, time, motionId, prevCaption);
      ctx.restore();

      const filmDark = Math.sin(p * Math.PI) * 0.55;
      if (filmDark > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${filmDark})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = Math.pow(p, 1.1);
      drawCoverImage(ctx, nextSource, width, height, time, motionId, activeCaption);
      ctx.restore();
      break;
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: HTMLImageElement | HTMLVideoElement,
  width: number,
  height: number,
  time: number,
  motionId: MotionEffectId = 'kenburns-zoom-in',
  activeCaption?: CaptionItem | null
) {
  const img = source as HTMLImageElement;
  const video = source as HTMLVideoElement;
  const sourceWidth = video.videoWidth || img.naturalWidth || source.width || 1;
  const sourceHeight = video.videoHeight || img.naturalHeight || source.height || 1;

  const baseScale = Math.max(width / sourceWidth, height / sourceHeight);
  const sw = width / baseScale;
  const sh = height / baseScale;

  let zoomScale = 1.0;
  let panX = 0;
  let panY = 0;
  let rotationAngle = 0;

  // Compute smoothstep progression (0 to 1) for current caption scene
  let progress = 0.5;
  if (activeCaption && activeCaption.end > activeCaption.start) {
    const raw = Math.min(
      1,
      Math.max(0, (time - activeCaption.start) / (activeCaption.end - activeCaption.start))
    );
    progress = raw * raw * (3 - 2 * raw); // Smoothstep curve
  } else {
    progress = (Math.sin(time * 0.8) + 1) / 2; // Continuous smooth wave
  }

  switch (motionId) {
    case 'none':
    case 'static-clean':
      zoomScale = 1.0;
      panX = 0;
      panY = 0;
      rotationAngle = 0;
      break;
    case 'kenburns-zoom-in':
      zoomScale = 1.01 + progress * 0.05;
      panX = (progress - 0.5) * 8;
      panY = (progress - 0.5) * 5;
      break;
    case 'kenburns-zoom-out':
      zoomScale = 1.06 - progress * 0.05;
      panX = (0.5 - progress) * 8;
      panY = (0.5 - progress) * 5;
      break;
    case 'pan-left-right':
      zoomScale = 1.05;
      panX = (progress - 0.5) * 20;
      panY = 0;
      break;
    case 'pan-right-left':
      zoomScale = 1.05;
      panX = (0.5 - progress) * 20;
      panY = 0;
      break;
    case 'pan-up':
      zoomScale = 1.05;
      panX = 0;
      panY = (0.5 - progress) * 16;
      break;
    case 'pan-down':
      zoomScale = 1.05;
      panX = 0;
      panY = (progress - 0.5) * 16;
      break;
    case 'pulse-breath':
      const pulseWave = (Math.sin(time * Math.PI * 1.5) + 1) / 2;
      zoomScale = 1.01 + pulseWave * 0.03;
      break;
    case 'tilt-orbit':
      zoomScale = 1.05;
      rotationAngle = Math.sin(time * 0.7) * 0.015;
      panX = Math.cos(time * 0.7) * 8;
      panY = Math.sin(time * 0.7) * 6;
      break;
    case 'hyper-punch':
      const punchVal = Math.sin(progress * Math.PI);
      zoomScale = 1.01 + punchVal * 0.05;
      panX = (progress - 0.5) * 4;
      break;
    case 'cinematic-drift':
      zoomScale = 1.05;
      panX = Math.sin(time * 0.4) * 12;
      panY = Math.cos(time * 0.4) * 8;
      break;
    case 'diagonal-up-right':
      zoomScale = 1.04;
      panX = (progress - 0.5) * 16;
      panY = (0.5 - progress) * 12;
      break;
    case 'diagonal-down-left':
      zoomScale = 1.04;
      panX = (0.5 - progress) * 16;
      panY = (progress - 0.5) * 12;
      break;
    case 'vortex-spin':
      zoomScale = 1.02 + progress * 0.03;
      rotationAngle = (progress - 0.5) * 0.025;
      panX = Math.sin(progress * Math.PI) * 5;
      break;
    case 'whip-zoom-in':
      const whipProgress = Math.pow(progress, 0.5); // Ease-out curve
      zoomScale = 1.00 + whipProgress * 0.04;
      break;
    case 'slow-reveal-pan':
      zoomScale = 1.06;
      panX = (progress - 0.5) * 32;
      break;
    case 'parallax-float':
      zoomScale = 1.04;
      panX = Math.sin(time * 0.8) * 10;
      panY = Math.sin(time * 1.6) * 6; // Figure-8 wave
      break;
    case 'soft-bounce':
      const spring = Math.sin(progress * Math.PI * 1.2) * Math.exp(-progress * 2);
      zoomScale = 1.02 + spring * 0.04;
      panY = -spring * 8;
      break;
    case 'dramatic-push':
      zoomScale = 1.01 + Math.pow(progress, 2) * 0.06; // Quadratic acceleration
      break;
    case 'cinematic-shutter':
      zoomScale = 1.04;
      panX = Math.sin(time * 4.2) * 2.5 + Math.cos(time * 7.1) * 1.5;
      panY = Math.cos(time * 3.8) * 2.0 + Math.sin(time * 6.3) * 1.2;
      rotationAngle = Math.sin(time * 5.5) * 0.005;
      break;
    case 'cinematic-push':
      // Cinematic slow smooth push-in with vertical focus lift
      zoomScale = 1.01 + Math.pow(progress, 1.2) * 0.05;
      panY = -progress * 4;
      break;
    case 'cinematic-pull':
      // Cinematic slow smooth pull-out revealing broader perspective
      zoomScale = 1.06 - Math.pow(progress, 1.2) * 0.05;
      panY = progress * 4;
      break;
    case 'depth-breathe':
      // Depth of field breathing effect simulating organic lens focus breathing
      zoomScale = 1.02 + Math.sin(time * 1.4) * 0.02;
      panX = Math.cos(time * 0.9) * 5;
      panY = Math.sin(time * 0.9) * 3;
      break;
    case 'soft-focus-reveal':
      // Soft focus reveal: smooth lens aperture reveal & zoom perspective
      zoomScale = 1.05 - Math.pow(progress, 1.2) * 0.04;
      panY = (1 - progress) * 8;
      panX = (progress - 0.5) * 6;
      break;
    case 'focus-pull':
      // Rack focus shift: smooth optical depth push with subtle lens tilt & pan
      const focusRack = Math.sin(progress * Math.PI);
      zoomScale = 1.01 + focusRack * 0.045;
      panX = (progress - 0.5) * 12;
      panY = -focusRack * 5;
      rotationAngle = (progress - 0.5) * 0.008;
      break;
    // --- 8 Experimental Test Motion Effects ---
    case 'vertigo-dolly-zoom':
      // Hitchcock Vertigo dolly zoom counter-perspective shift
      const dolly = Math.sin(progress * Math.PI);
      zoomScale = 1.09 - dolly * 0.07;
      panX = (progress - 0.5) * 8;
      panY = (0.5 - progress) * 4;
      break;
    case 'd-parallax-tilt':
      // 3D optical tilt perspective shift
      rotationAngle = Math.sin(progress * Math.PI * 2) * 0.016;
      zoomScale = 1.03 + Math.abs(Math.sin(progress * Math.PI)) * 0.035;
      panX = Math.cos(progress * Math.PI) * 14;
      panY = Math.sin(progress * Math.PI) * 7;
      break;
    case 'anamorphic-sweep':
      // Wide horizontal anamorphic flare glide
      zoomScale = 1.05;
      panX = (progress - 0.5) * 38;
      panY = Math.sin(progress * Math.PI) * -5;
      break;
    case 'hyperlapse-speed-ramp':
      // Rapid entrance speed ramp with smooth deceleration
      const ramp = Math.pow(progress, 0.32);
      zoomScale = 1.0 + ramp * 0.06;
      panX = (1 - ramp) * 20;
      break;
    case 'dutch-angle-roll':
      // Stylized tilted horizon roll & drift
      rotationAngle = -0.022 + progress * 0.044;
      zoomScale = 1.05;
      panX = (progress - 0.5) * 12;
      panY = (0.5 - progress) * 6;
      break;
    case 'cross-zoom-impact':
      // High-energy elastic zoom impact
      const impact = Math.sin(progress * Math.PI * 2.2) * Math.exp(-progress * 2.2);
      zoomScale = 1.02 + impact * 0.055;
      panX = impact * 10;
      break;
    case 'orbit-arc-glide':
      // Orbital curved arc motion around subject
      const arcAngle = (progress - 0.5) * 1.1;
      zoomScale = 1.04;
      panX = Math.sin(arcAngle) * 22;
      panY = (1 - Math.cos(arcAngle)) * 14 - 5;
      rotationAngle = arcAngle * 0.018;
      break;
    case 'glitch-pulse-push':
      // Cyberpunk micro glitch jitter push
      const jitter = (Math.sin(time * 26) > 0.72 ? 1 : 0) * (Math.cos(time * 38) * 3);
      zoomScale = 1.02 + progress * 0.045;
      panX = (progress - 0.5) * 10 + jitter;
      panY = jitter * 0.6;
      break;
    case 'static-clean':
    default:
      zoomScale = 1.0;
      panX = 0;
      panY = 0;
      rotationAngle = 0;
      break;
  }

  // Auto-calculate minimum safe scale so pan/rotate NEVER pull image inside canvas edges (prevents black borders)
  const panScaleNeeded = 1 + (Math.max(Math.abs(panX), Math.abs(panY)) * 2.6) / Math.min(width, height);
  const rotScaleNeeded = 1 + Math.abs(rotationAngle) * 2.2;

  const minSafeZoom = Math.max(panScaleNeeded, rotScaleNeeded, 1.01);
  const finalZoomScale = Math.max(zoomScale, minSafeZoom);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  if (rotationAngle !== 0) ctx.rotate(rotationAngle);
  ctx.scale(finalZoomScale, finalZoomScale);
  ctx.translate(-width / 2 + panX, -height / 2 + panY);

  const sx = (sourceWidth - sw) / 2;
  const sy = (sourceHeight - sh) / 2;

  try {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  } catch (e) {
    // Fallback if image fails to draw
  }

  ctx.restore();
}


function drawParticles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  effect: ParticleEffectId = 'floating-dust'
) {
  if (effect === 'none') return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  switch (effect) {
    case 'retro-1950s-tv': {
      ctx.save();
      // B&W effect
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      
      // Heavy static
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      for(let i = 0; i < 400; i++) {
         const x = Math.random() * width;
         const y = Math.random() * height;
         ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for(let i = 0; i < 400; i++) {
         const x = Math.random() * width;
         const y = Math.random() * height;
         ctx.fillRect(x, y, 2, 2);
      }
      
      // Rolling horizontal band
      const rollY = (time * 150) % height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(0, rollY, width, height * 0.1);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, rollY + height * 0.1, width, height * 0.05);
      
      ctx.restore();
      break;
    }
    case 'ancient-daguerreotype': {
      ctx.save();
      // Silver-gelatin tint (desaturated sepia)
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(80, 75, 70, 1)';
      ctx.fillRect(0, 0, width, height);
      
      // Heavy blurred vignette & chemical stains
      ctx.globalCompositeOperation = 'multiply';
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.9);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.8, 'rgba(150,140,130,0.8)');
      grad.addColorStop(1, 'rgba(30,20,15,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Chemical stains (large blotches)
      ctx.globalCompositeOperation = 'overlay';
      for(let i = 0; i < 5; i++) {
        const sx = ((Math.sin(i * 13) + 1)/2) * width;
        const sy = ((Math.cos(i * 17) + 1)/2) * height;
        const sgrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 100 + i * 50);
        sgrad.addColorStop(0, 'rgba(0,0,0,0.15)');
        sgrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sgrad;
        ctx.beginPath();
        ctx.arc(sx, sy, 300, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'cold-war-microfilm': {
      ctx.save();
      // High contrast dark green/black overlay
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(20, 40, 20, 0.5)';
      ctx.fillRect(0, 0, width, height);
      
      ctx.globalCompositeOperation = 'screen';
      // Fast scanning artifact lines
      const t = Math.floor(time * 24);
      for(let i=0; i<3; i++) {
         const lineY = (Math.sin(t * 0.1 + i) * 0.5 + 0.5) * height;
         ctx.fillStyle = 'rgba(150, 255, 150, 0.15)';
         ctx.fillRect(0, lineY, width, 2 + Math.random() * 3);
      }
      
      // Heavy dust
      ctx.fillStyle = 'rgba(200, 255, 200, 0.4)';
      for(let i=0; i<50; i++) {
        const x = (Math.sin(i * 123.45 + t) * 0.5 + 0.5) * width;
        const y = (Math.cos(i * 678.9 - t) * 0.5 + 0.5) * height;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
      ctx.restore();
      break;
    }
    case 'eight-mm-kodachrome': {
      ctx.save();
      // Saturated warm colors overlay
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 150, 50, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      // Light leaks (magenta/orange on edges)
      ctx.globalCompositeOperation = 'screen';
      const leakOp = 0.1 + ((Math.sin(time * 2) + 1)/2) * 0.15;
      const leakGrad = ctx.createLinearGradient(0, 0, width * 0.3, 0);
      leakGrad.addColorStop(0, `rgba(255, 50, 150, ${leakOp})`);
      leakGrad.addColorStop(1, 'rgba(255, 50, 150, 0)');
      ctx.fillStyle = leakGrad;
      ctx.fillRect(0, 0, width * 0.3, height);

      const leakGrad2 = ctx.createLinearGradient(width, 0, width * 0.7, 0);
      leakGrad2.addColorStop(0, `rgba(255, 150, 50, ${leakOp * 0.8})`);
      leakGrad2.addColorStop(1, 'rgba(255, 150, 50, 0)');
      ctx.fillStyle = leakGrad2;
      ctx.fillRect(width * 0.7, 0, width * 0.3, height);

      // Heavy film grain
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      for(let i=0; i<200; i++) {
         const x = Math.random() * width;
         const y = Math.random() * height;
         ctx.fillRect(x, y, 2, 2);
      }
      ctx.restore();
      break;
    }
    case 'silent-cinema': {
      ctx.save();
      // B&W contrast
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      ctx.globalCompositeOperation = 'multiply';
      const t = Math.floor(time * 10); // Perfect medium vintage speed
      
      // Iris vignette with moderate realistic flicker
      const iris = ctx.createRadialGradient(width/2, height/2, width*0.35, width/2, height/2, width*0.8);
      iris.addColorStop(0, 'rgba(255,255,255,1)');
      iris.addColorStop(1, `rgba(0,0,0,${0.8 + Math.random() * 0.1})`); // Moderate realistic flicker
      ctx.fillStyle = iris;
      ctx.fillRect(0, 0, width, height);
      
      // Moderate vertical scratches
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; // Medium opacity
      for(let i=0; i<2; i++) {
        if(Math.random() > 0.5) { // Show up 50% of the time (sweet spot)
          const sx = (Math.sin(t * 3.1 + i) * 0.5 + 0.5) * width;
          ctx.fillRect(sx, 0, 1 + Math.random() * 1.5, height); // Medium thickness
        }
      }
      ctx.restore();
      break;
    }
    case 'interstellar-black-hole': {
      ctx.save();
      const cx = width / 2;
      const cy = height / 2;
      
      // Deep space background gradient
      const spaceGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.8);
      spaceGlow.addColorStop(0, 'rgba(15, 5, 25, 1)');
      spaceGlow.addColorStop(1, 'rgba(0, 0, 0, 1)');
      ctx.fillStyle = spaceGlow;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'screen';

      // Accretion disk (Event Horizon glow)
      const coreGlow = ctx.createRadialGradient(cx, cy, width * 0.1, cx, cy, width * 0.5);
      coreGlow.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Center is dark
      coreGlow.addColorStop(0.1, 'rgba(217, 70, 239, 0.8)'); // Intense purple/magenta edge
      coreGlow.addColorStop(0.4, 'rgba(139, 92, 246, 0.3)'); // Violet fade
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.save();
      // Apply 3D perspective to the accretion disk
      ctx.translate(cx, cy);
      ctx.scale(1, 0.3); // Flatten into a disk
      ctx.rotate(time * 0.5);
      ctx.translate(-cx, -cy);
      
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Black Hole core (absolute black)
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(cx, cy, width * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      
      // Star matter getting sucked in
      ctx.globalCompositeOperation = 'screen';
      const particleCount = 200;
      for (let i = 0; i < particleCount; i++) {
        const seed = i * 123.45;
        // Particles move inwards as time progresses
        const radius = ((seed * 10 - time * 150) % (width * 0.8) + (width * 0.8)) % (width * 0.8);
        if (radius < width * 0.12) continue; // inside event horizon

        // Spiral angle
        const angle = seed + radius * 0.01 + time; 
        
        // Flatten Y for 3D perspective
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius * 0.3;

        const size = Math.max(0.5, 3 - (radius / (width * 0.3)));
        const opacity = Math.min(1, radius / (width * 0.3));
        
        ctx.fillStyle = `rgba(255, 230, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'quantum-ethereal-fluid': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      // Flowing luminous ribbons
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        for (let x = 0; x <= width + 50; x += 40) {
          const wave1 = Math.sin(x * 0.003 + time * 0.8 + i);
          const wave2 = Math.cos(x * 0.005 - time * 1.2 + i * 1.5);
          const wave3 = Math.sin(x * 0.002 + time * 0.5 - i * 0.8);
          
          const y = height / 2 
            + wave1 * (height * 0.25) 
            + wave2 * (height * 0.15)
            + wave3 * (height * 0.1);
            
          ctx.lineTo(x, y);
        }
        
        ctx.lineWidth = 40 + i * 25;
        
        // Shifting bio-luminescent colors
        const hue = (time * 15 + i * 35) % 360;
        ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.12)`;
        
        // Add a blur glow
        ctx.shadowColor = `hsla(${hue}, 80%, 65%, 0.5)`;
        ctx.shadowBlur = 30;
        
        ctx.stroke();
      }
      
      ctx.restore();
      break;
    }
    case 'hypnotic-sacred-geometry': {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.max(width, height) * 0.6;

      ctx.lineWidth = 1.5;

      for (let ring = 1; ring <= 5; ring++) {
        const r = (maxRadius / 5) * ring;
        const points = 6 + ring * 6; // Hexagonal expansion
        
        // Alternating rotation directions
        const rotation = time * (0.15 / ring) * (ring % 2 === 0 ? 1 : -1);

        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const angle = rotation + (i * Math.PI * 2) / points;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;

          // Connect to inner ring for a web effect
          const innerR = r - (maxRadius / 5);
          // Twist the connection slightly
          const innerAngle = rotation + ((i + 0.5) * Math.PI * 2) / points;
          const ix = cx + Math.cos(innerAngle) * innerR;
          const iy = cy + Math.sin(innerAngle) * innerR;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          
          // Draw spoke to inner ring
          ctx.lineTo(ix, iy);
          ctx.lineTo(x, y); // Go back to continue outer ring
        }
        ctx.closePath();
        
        // Glowing gold/amber wireframe
        const pulse = Math.sin(time * 2 + ring) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(251, 191, 36, ${0.1 + pulse * 0.25})`; // Amber-400
        ctx.stroke();
      }
      
      // Floating glowing motes in the background
      for(let i=0; i<40; i++) {
         const angle = (i * 13.5 + time * 0.2) % (Math.PI * 2);
         const dist = (i * 25 + Math.sin(time + i) * 50) % maxRadius;
         const x = cx + Math.cos(angle) * dist;
         const y = cy + Math.sin(angle) * dist;
         
         ctx.fillStyle = `rgba(251, 191, 36, ${0.15 + Math.sin(time*3 + i)*0.15})`;
         ctx.beginPath();
         ctx.arc(x, y, 1.5 + (i%2), 0, Math.PI*2);
         ctx.fill();
      }
      
      ctx.restore();
      break;
    }
    case 'floating-dust': {
      const count = 24;
      for (let i = 0; i < count; i++) {
        const seed = i * 19.317;
        const x = (((Math.sin(seed * 1.5) + 1) / 2) * width + Math.sin(time * 0.4 + seed) * 15 + width) % width;
        const baseY = ((Math.cos(seed * 1.23) + 1) / 2) * height;
        const speed = 6 + (i % 4) * 2;
        const y = (baseY - ((time * speed) % (height + 40)) + height + 40) % (height + 40) - 20;

        const pulse = 0.2 + (0.35 * (Math.sin(time * 1.2 + seed) + 1)) / 2;
        const radius = 1.2 + (i % 3) * 0.8;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
        glow.addColorStop(0, `rgba(241, 245, 249, ${pulse})`);
        glow.addColorStop(1, 'rgba(241, 245, 249, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'soft-sparkles': {
      const count = 20;
      for (let i = 0; i < count; i++) {
        const seed = i * 23.811;
        const x = ((Math.sin(seed * 1.8) + 1) / 2) * width;
        const y = ((Math.cos(seed * 2.3) + 1) / 2) * height;
        const shimmer = Math.sin(time * 3.5 + seed);

        if (shimmer > -0.2) {
          const alpha = Math.max(0, (shimmer + 0.2) / 1.2) * 0.75;
          const size = 2 + (i % 4) * 1.5;

          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(time * 0.5 + seed);

          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(-size * 2, -0.75, size * 4, 1.5);
          ctx.fillRect(-0.75, -size * 2, 1.5, size * 4);

          const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
          glow.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }
      break;
    }

    case 'silver-snow': {
      const count = 30;
      for (let i = 0; i < count; i++) {
        const seed = i * 18.731;
        const sway = Math.sin(time * 1.1 + seed) * 12;
        const x = (((Math.cos(seed * 1.4) + 1) / 2) * width + sway + width) % width;
        const speed = 18 + (i % 5) * 8;
        const y = ((time * speed + seed * 20) % (height + 40)) - 20;

        const pulse = 0.3 + (0.4 * (Math.sin(time * 1.5 + seed) + 1)) / 2;
        const radius = 1.0 + (i % 4) * 0.9;

        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        glow.addColorStop(0, `rgba(248, 250, 252, ${pulse})`);
        glow.addColorStop(1, 'rgba(203, 213, 225, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'vintage-film': {
      const prand = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      const t = Math.floor(time * 16); // 16 fps for vintage jitter feel
      
      // Sepia/Warm Tint
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(140, 100, 40, 0.15)`;
      ctx.fillRect(0, 0, width, height);

      // Scratches (Vertical lines)
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = `rgba(255, 255, 255, 0.25)`;
      const scratchCount = 1 + Math.floor(prand(t * 1.1) * 4);
      for (let i = 0; i < scratchCount; i++) {
        const sx = prand(t * 1.2 + i) * width;
        ctx.lineWidth = 0.5 + prand(t * 1.3 + i) * 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx + (prand(t * 1.4 + i) - 0.5) * 30, height);
        ctx.stroke();
      }

      // Dust and Grain
      ctx.fillStyle = `rgba(0, 0, 0, 0.4)`;
      ctx.globalCompositeOperation = 'overlay';
      const dustCount = 40;
      for (let i = 0; i < dustCount; i++) {
        const dx = prand(t * 2.1 + i) * width;
        const dy = prand(t * 2.2 + i) * height;
        const size = prand(t * 2.3 + i) * 2.5;
        ctx.beginPath();
        ctx.arc(dx, dy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'crt-scanlines': {
      const prand = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };
      
      ctx.globalCompositeOperation = 'overlay';
      
      // Moving Scanlines
      const lineSize = 3;
      const offset = (time * 30) % (lineSize * 2);
      ctx.fillStyle = `rgba(0, 0, 0, 0.25)`;
      for (let y = -lineSize; y < height; y += lineSize * 2) {
        ctx.fillRect(0, y + offset, width, lineSize);
      }
      
      // Static Noise
      const t = Math.floor(time * 24);
      ctx.globalCompositeOperation = 'screen';
      const noiseCount = 180;
      ctx.fillStyle = `rgba(255, 255, 255, 0.12)`;
      for (let i = 0; i < noiseCount; i++) {
        const nx = prand(t * 3.1 + i) * width;
        const ny = prand(t * 3.2 + i) * height;
        ctx.fillRect(nx, ny, prand(t * 3.3 + i) * 6, prand(t * 3.4 + i) * 3);
      }
      
      // Moving rolling band
      const rollY = (time * 150) % (height * 1.5) - height * 0.25;
      ctx.fillStyle = `rgba(255, 255, 255, 0.06)`;
      ctx.fillRect(0, rollY, width, height * 0.12);
      
      break;
    }

    case 'ethereal-fireflies': {
      ctx.globalCompositeOperation = 'screen';
      const count = 40;
      for (let i = 0; i < count; i++) {
        const seed = i * 19.31;
        const x = (((Math.sin(seed + time * 0.4) + 1) / 2) * width + Math.cos(time * 0.7 + seed) * 40 + width) % width;
        const y = (((Math.cos(seed + time * 0.3) + 1) / 2) * height + Math.sin(time * 0.6 + seed) * 40 + height) % height;
        
        const pulse = 0.1 + ((Math.sin(time * 2 + seed) + 1) / 2) * 0.7;
        const size = 1.5 + (seed % 2);

        const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
        glow.addColorStop(0, `rgba(190, 242, 100, ${pulse})`); // lime-300
        glow.addColorStop(0.4, `rgba(132, 204, 22, ${pulse * 0.5})`); // lime-500
        glow.addColorStop(1, 'rgba(132, 204, 22, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, size * 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'luxury-gold': {
      ctx.globalCompositeOperation = 'screen';
      const count = 100;
      for (let i = 0; i < count; i++) {
        const seed = i * 7.51;
        const drift = Math.sin(time * 0.3 + seed) * 20;
        const x = (((seed * width * 0.13) + drift) + width) % width;
        const speed = 15 + (seed % 10);
        const y = (height + (seed * 50) - (time * speed)) % height;
        
        const size = 0.5 + (seed % 1.5);
        const opacity = 0.2 + ((Math.sin(time * (1 + seed % 3) + seed) + 1) / 2) * 0.8;

        ctx.fillStyle = `rgba(251, 191, 36, ${opacity})`; // amber-400
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        if (i % 5 === 0) {
            const glint = Math.pow(((Math.sin(time * 3 + seed) + 1) / 2), 4);
            if (glint > 0.5) {
                ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
                ctx.beginPath();
                ctx.arc(x, y, size * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
      }
      break;
    }

    case 'prism-light-leaks': {
      ctx.globalCompositeOperation = 'screen';
      
      const x1 = Math.sin(time * 0.5) * width * 0.5 + width * 0.5;
      const y1 = Math.cos(time * 0.3) * height * 0.2;
      const r1 = width * 0.6;
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      grad1.addColorStop(0, 'rgba(236, 72, 153, 0.4)'); // pink-500
      grad1.addColorStop(0.5, 'rgba(217, 70, 239, 0.1)'); // fuchsia-500
      grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const x2 = Math.cos(time * 0.4) * width * 0.3 + width;
      const y2 = Math.sin(time * 0.6) * height * 0.5 + height;
      const r2 = width * 0.8;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      grad2.addColorStop(0, 'rgba(6, 182, 212, 0.3)'); // cyan-500
      grad2.addColorStop(0.7, 'rgba(59, 130, 246, 0.1)'); // blue-500
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);
      
      const flareX = (time * width * 0.2) % (width * 2) - width * 0.5;
      const grad3 = ctx.createLinearGradient(flareX, 0, flareX + width * 0.3, height);
      grad3.addColorStop(0, 'rgba(249, 115, 22, 0)');
      grad3.addColorStop(0.5, 'rgba(249, 115, 22, 0.15)'); // orange-500
      grad3.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      break;
    }

    case 'film-grain': {
      ctx.globalCompositeOperation = 'overlay';
      // Film grain noise
      const noiseCount = Math.floor((width * height) * 0.005); 
      ctx.fillStyle = `rgba(255, 255, 255, 0.04)`;
      for (let i = 0; i < noiseCount; i++) {
        // Fast pseudo-random based on time and index
        const x = ((Math.sin(i * 13.1 + time * 1.3) + 1) / 2) * width;
        const y = ((Math.cos(i * 17.5 + time * 0.8) + 1) / 2) * height;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.fillStyle = `rgba(0, 0, 0, 0.04)`;
      for (let i = 0; i < noiseCount; i++) {
        const x = ((Math.cos(i * 11.1 + time * 1.5) + 1) / 2) * width;
        const y = ((Math.sin(i * 19.5 + time * 1.1) + 1) / 2) * height;
        ctx.fillRect(x, y, 2, 2);
      }
      
      // Dynamic Vignette
      const pulse = (Math.sin(time * 0.5) + 1) / 2;
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.8);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(0,0,0,${0.3 + pulse * 0.15})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Occasional Scratches
      if (Math.sin(time * 12.3) > 0.95) {
        ctx.fillStyle = `rgba(255, 255, 255, 0.08)`;
        const scratchX = (Math.cos(time * 5) + 1) / 2 * width;
        ctx.fillRect(scratchX, 0, 1 + Math.random() * 2, height);
      }
      if (Math.sin(time * 7.7) > 0.9) {
        ctx.fillStyle = `rgba(0, 0, 0, 0.08)`;
        const scratchX = (Math.sin(time * 3) + 1) / 2 * width;
        ctx.fillRect(scratchX, 0, 1 + Math.random(), height);
      }
      break;
    }

    case 'anamorphic-flares': {
      ctx.globalCompositeOperation = 'screen';
      
      // Primary Flare
      const flareY1 = height * 0.4 + Math.sin(time * 0.3) * height * 0.1;
      const flareX1 = ((time * 0.15) % 1) * width * 2 - width * 0.5;
      
      const grad1 = ctx.createLinearGradient(flareX1 - width, 0, flareX1 + width, 0);
      grad1.addColorStop(0, 'rgba(56, 189, 248, 0)');
      grad1.addColorStop(0.4, 'rgba(56, 189, 248, 0.1)');
      grad1.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
      grad1.addColorStop(0.6, 'rgba(56, 189, 248, 0.1)');
      grad1.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.ellipse(flareX1, flareY1, width, height * 0.015, 0, 0, Math.PI * 2);
      ctx.fill();

      // Secondary Subtle Flare
      const flareY2 = height * 0.6 + Math.cos(time * 0.2) * height * 0.15;
      const flareX2 = width * 1.5 - ((time * 0.1) % 1) * width * 2;
      
      const grad2 = ctx.createLinearGradient(flareX2 - width*0.8, 0, flareX2 + width*0.8, 0);
      grad2.addColorStop(0, 'rgba(96, 165, 250, 0)');
      grad2.addColorStop(0.4, 'rgba(96, 165, 250, 0.05)');
      grad2.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
      grad2.addColorStop(0.6, 'rgba(96, 165, 250, 0.05)');
      grad2.addColorStop(1, 'rgba(96, 165, 250, 0)');

      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.ellipse(flareX2, flareY2, width * 0.8, height * 0.01, 0, 0, Math.PI * 2);
      ctx.fill();

      break;
    }

    case 'ambient-dust': {
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 40; i++) {
        const seed = i * 13.5;
        const speed = 5 + (seed % 15); // slow drift
        const rawY = seed * 30 - time * speed;
        const y = ((rawY % height) + height) % height;
        const rawX = seed * 40 + Math.sin(time * 0.2 + seed) * 50;
        const x = ((rawX % width) + width) % width;
        const size = 1 + (seed % 6); // varying depths
        
        const opacity = 0.05 + ((Math.sin(time * 0.4 + seed) + 1) / 2) * 0.25;
        
        ctx.fillStyle = `rgba(229, 229, 229, ${opacity})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add extreme blur to larger motes to simulate depth-of-field
        if (size > 3) {
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
          ctx.beginPath();
          ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case 'elegant-glow': {
      ctx.globalCompositeOperation = 'overlay';
      const pulse = (Math.sin(time * 0.8) + 1) / 2;
      
      const r = width * 0.55 + pulse * width * 0.05;
      const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, r);
      
      grad.addColorStop(0, `rgba(255, 255, 255, 0.12)`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, 0.02)`);
      grad.addColorStop(1, `rgba(0, 0, 0, 0.6)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'super-8-burns': {
      ctx.globalCompositeOperation = 'screen';
      
      // Flickering warm edge burns
      const edgeBurn = Math.sin(time * 3.2) * 0.5 + 0.5;
      const flash = Math.pow((Math.sin(time * 8.4) + 1) / 2, 8); // sharp flash peaks

      // Right edge orange burn
      const grad1 = ctx.createLinearGradient(width * 0.7, 0, width, 0);
      grad1.addColorStop(0, 'rgba(234, 88, 12, 0)');
      grad1.addColorStop(1, `rgba(234, 88, 12, ${0.1 + edgeBurn * 0.3})`); // orange-600
      ctx.fillStyle = grad1;
      ctx.fillRect(width * 0.7, 0, width * 0.3, height);

      // Left edge red/yellow burn
      const grad2 = ctx.createLinearGradient(width * 0.3, 0, 0, 0);
      grad2.addColorStop(0, 'rgba(225, 29, 72, 0)');
      grad2.addColorStop(1, `rgba(225, 29, 72, ${0.1 + (1 - edgeBurn) * 0.2})`); // rose-600
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width * 0.3, height);

      // Intense full-screen flash
      if (flash > 0.3) {
        ctx.fillStyle = `rgba(251, 146, 60, ${flash * 0.3})`; // orange-400
        ctx.fillRect(0, 0, width, height);
      }

      // High-contrast jittery dust/dirt
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      for(let i=0; i<6; i++) {
        if (Math.sin(time * 15 + i) > 0.85) {
           const x = ((Math.cos(time * 7 + i) + 1) / 2) * width;
           const y = ((Math.sin(time * 11 + i) + 1) / 2) * height;
           ctx.fillRect(x, y, 1.5 + Math.random() * 2, 5 + Math.random() * 20);
        }
      }
      break;
    }

    case 'archival-sepia': {
      // Warm sepia overlay
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = 'rgba(112, 66, 20, 0.5)'; // deep sepia brown
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'multiply';
      
      // Vertical moving scratches
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for(let i = 0; i < 5; i++) {
        const scratchX = ((time * 0.3 + i * 0.2) % 1) * width;
        if (Math.random() > 0.2) {
          ctx.fillRect(scratchX, 0, 1 + Math.random(), height);
        }
      }

      // Heavy classic vignette
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.4, width/2, height/2, width*0.8);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      
      break;
    }

    case 'vhs-chroma': {
      // Interlaced scanlines
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for(let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1.5);
      }

      // Tracking distortion / static noise at the bottom
      if (Math.random() > 0.4) {
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        const trackY = height * 0.85 + Math.random() * (height * 0.1);
        ctx.fillRect(0, trackY, width, 2 + Math.random() * 5);

        for (let i = 0; i < 15; i++) {
          ctx.fillRect(Math.random() * width, trackY - 15 + Math.random()*30, Math.random() * 60, 1 + Math.random()*2);
        }
      }

      // RGB split edge distortion (chromatic aberration feel)
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(0, 255, 0, 0.04)';
      ctx.fillRect(3, 0, width, height);
      ctx.fillStyle = 'rgba(255, 0, 255, 0.04)';
      ctx.fillRect(-3, 0, width, height);

      break;
    }

    case 'cinematic-letterbox': {
      // 2.35:1 aspect ratio bars (ultra-widescreen)
      ctx.globalCompositeOperation = 'source-over';
      const targetHeight = width / 2.35;
      const barHeight = (height - targetHeight) / 2;
      
      if (barHeight > 0) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, barHeight); // Top bar
        ctx.fillRect(0, height - barHeight, width, barHeight + 2); // Bottom bar (+2 to cover pixel rounding gaps)
      }

      // Bleach bypass color grade (High contrast, slightly desaturated)
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(128, 128, 128, 0.25)'; // boosts mid-tone contrast
      ctx.fillRect(0, barHeight, width, targetHeight);
      
      break;
    }

    case 'evolving-color-grade': {
      // Find total duration to calculate progress
      // As we don't have total duration in drawParticles, we assume 15 seconds for a standard short
      const totalDuration = 15;
      
      const progress = Math.min(1, Math.max(0, time / totalDuration));
      
      // We want to shift from a cold, mysterious teal/blue to a warm, inviting orange/gold.
      // Start Color (Teal/Blue): rgb(14, 165, 233)
      // End Color (Warm Gold): rgb(245, 158, 11)
      
      const r = Math.round(14 + (245 - 14) * progress);
      const g = Math.round(165 + (158 - 165) * progress);
      const b = Math.round(233 + (11 - 233) * progress);
      
      // Apply color overlay
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      ctx.fillRect(0, 0, width, height);

      // Add a dynamic vignette that also shifts color slightly
      ctx.globalCompositeOperation = 'multiply';
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.4, width/2, height/2, width*0.8);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      
      // Vignette is darker and bluer at the start, slightly lighter and warmer at the end
      const vr = Math.round(10 + (40 - 10) * progress);
      const vg = Math.round(20 + (20 - 20) * progress);
      const vb = Math.round(50 + (10 - 50) * progress);
      grad.addColorStop(1, `rgba(${vr}, ${vg}, ${vb}, 0.7)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      
      // Optional: Add a subtle warm light leak at the end to signify "resolution"
      if (progress > 0.5) {
        ctx.globalCompositeOperation = 'screen';
        const leakOpacity = (progress - 0.5) * 2 * 0.4; // scales from 0 to 0.4
        const leakGrad = ctx.createLinearGradient(0, 0, width * 0.5, height * 0.5);
        leakGrad.addColorStop(0, `rgba(251, 191, 36, ${leakOpacity})`); // amber-400
        leakGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = leakGrad;
        ctx.fillRect(0, 0, width, height);
      }

      break;
    }

    case 'focus-isolation': {
      // 1. Dark vignette
      ctx.globalCompositeOperation = 'multiply';
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.25, width/2, height/2, width*0.8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
      grad.addColorStop(0.5, 'rgba(180, 180, 180, 1)'); 
      grad.addColorStop(1, 'rgba(40, 40, 40, 1)'); 
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      
      // 2. Desaturation at edges (Simulated via overlaying a grey color with 'saturation' blend mode)
      ctx.globalCompositeOperation = 'saturation';
      const desatGrad = ctx.createRadialGradient(width/2, height/2, width*0.3, width/2, height/2, width*0.9);
      desatGrad.addColorStop(0, 'rgba(128, 128, 128, 0)'); 
      desatGrad.addColorStop(1, 'rgba(128, 128, 128, 0.8)'); 
      ctx.fillStyle = desatGrad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'hypnotic-pulse': {
      // Pulse once per second roughly
      const pulse = (Math.sin(time * Math.PI * 1.5) + 1) / 2; 
      
      ctx.globalCompositeOperation = 'multiply';
      const radius = width * 0.6 + pulse * (width * 0.2); 
      const grad = ctx.createRadialGradient(width/2, height/2, width*0.2, width/2, height/2, radius);
      
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
      // Edges slightly dark and red-tinted for that primal heartbeat feeling
      grad.addColorStop(1, `rgba(${200 - pulse*50}, ${150 - pulse*50}, ${150 - pulse*50}, 1)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      break;
    }

    case 'subliminal-flash': {
      // Flash every 3 seconds for pattern interrupt
      const cycle = time % 3.0;
      
      if (cycle < 0.1) {
        const intensity = 1 - (cycle / 0.1); 
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.6})`;
        ctx.fillRect(0, 0, width, height);
        
        // Add subtle chromatic shift during flash
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.3})`;
        ctx.fillRect(5, 0, width, height);
        ctx.fillStyle = `rgba(0, 255, 255, ${intensity * 0.3})`;
        ctx.fillRect(-5, 0, width, height);
      }
      break;
    }

    case 'zeigarnik-progress': {
      // The Zeigarnik Effect: people need to see a task completed
      const totalDuration = 15; 
      const progress = Math.min(1, Math.max(0, time / totalDuration));
      
      const barHeight = 8;
      const barY = height - barHeight;
      
      ctx.globalCompositeOperation = 'source-over';
      
      // Background track
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, barY, width, barHeight);
      
      // Neon fill
      const currentWidth = width * progress;
      ctx.shadowColor = '#22c55e'; // Green neon glow
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#4ade80';
      
      ctx.fillRect(0, barY, currentWidth, barHeight);
      
      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      break;
    }

    case 'film-halation': {
      // Create a subtle red/orange edge bloom effect
      ctx.globalCompositeOperation = 'screen';
      
      // We simulate blooming from the edges towards the center
      const grad = ctx.createRadialGradient(width/2, height/2, width * 0.3, width/2, height/2, width * 0.8);
      grad.addColorStop(0, 'rgba(255, 60, 0, 0)');      // center is clear
      grad.addColorStop(0.7, 'rgba(255, 60, 0, 0.05)'); // mid edge bloom
      grad.addColorStop(1, 'rgba(255, 30, 0, 0.2)');    // strong orange/red bloom at edges
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Add a slight overall warm tint overlay to tie it together
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 100, 50, 0.05)';
      ctx.fillRect(0, 0, width, height);
      
      break;
    }
  }

  ctx.restore();
}
