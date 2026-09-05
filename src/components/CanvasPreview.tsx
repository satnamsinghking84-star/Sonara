import React, { useEffect, useRef } from 'react';
import { Play, Pause, Music, Disc3, Image as ImageIcon, Volume2, VolumeX, Trash2, Repeat, Sparkles } from 'lucide-react';
import { AspectRatio, CaptionItem, MediaAsset, MotionEffectId, ParticleEffectId, TransitionEffectId } from '../types';
import { ASPECT_RATIO_CONFIGS, PRESETS } from '../constants';
import { drawCanvasFrame } from '../utils/exportVideo';
import { formatTime } from '../utils/time';

interface CanvasPreviewProps {
  ratio: AspectRatio;
  projectName: string;
  presetId: string;
  motionEffect: MotionEffectId;
  particleEffect?: ParticleEffectId;
  transitionEffect?: TransitionEffectId;
  captionSize: number;
  captionPosition: number;
  captions: CaptionItem[];
  media: MediaAsset[];
  audioName: string;
  audioUrl: string;
  voiceVolume?: number;
  onVoiceVolumeChange?: (vol: number) => void;
  bgAudioName?: string;
  bgAudioUrl?: string;
  bgAudioVolume?: number;
  onBgAudioVolumeChange?: (vol: number) => void;
  onBgAudioSelect?: (file: File) => void;
  onDeleteBgAudio?: () => void;
  currentTime: number;
  duration: number;
  playing: boolean;
  onTimeChange: (time: number) => void;
  onTogglePlay: () => void;
  onAudioSelect: (file: File) => void;
  onDeleteAudio?: () => void;
  onMediaSelect: (files: FileList) => void;
  onCanvasClick?: (x: number, y: number) => void;
  onOpenAiAudioSync?: () => void;
}

export const CanvasPreview: React.FC<CanvasPreviewProps> = ({
  ratio,
  projectName,
  presetId,
  motionEffect,
  particleEffect = 'soft-sparkles' as ParticleEffectId,
  transitionEffect = 'crossfade' as TransitionEffectId,
  captionSize,
  captionPosition,
  captions,
  media,
  audioName,
  audioUrl,
  voiceVolume = 1.0,
  onVoiceVolumeChange,
  bgAudioName,
  bgAudioUrl,
  bgAudioVolume = 0.3,
  onBgAudioVolumeChange,
  onBgAudioSelect,
  onDeleteBgAudio,
  currentTime,
  duration,
  playing,
  onTimeChange,
  onTogglePlay,
  onAudioSelect,
  onDeleteAudio,
  onMediaSelect,
  onCanvasClick,
  onOpenAiAudioSync,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const voiceFileInputRef = useRef<HTMLInputElement>(null);
  const [muted, setMuted] = React.useState(false);
  const animSyncRef = useRef<number | null>(null);

  const config = ASPECT_RATIO_CONFIGS[ratio] || ASPECT_RATIO_CONFIGS['16:9'];
  const style = PRESETS[presetId] || PRESETS.sunset;

  // Sync Voice Audio track
  useEffect(() => {
    if (!audioRef.current) return;
    if (audioUrl && audioRef.current.src !== audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Sync Background Audio track
  useEffect(() => {
    if (!bgAudioRef.current) return;
    if (bgAudioUrl && bgAudioRef.current.src !== bgAudioUrl) {
      bgAudioRef.current.src = bgAudioUrl;
      bgAudioRef.current.loop = true;
      bgAudioRef.current.load();
    }
  }, [bgAudioUrl]);

  // Volume adjustments
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = voiceVolume;
    }
  }, [voiceVolume]);

  useEffect(() => {
    if (bgAudioRef.current) {
      bgAudioRef.current.volume = bgAudioVolume;
    }
  }, [bgAudioVolume]);

  // Master Voice Audio Sync & Playback Clock
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (playing) {
      // Seek audio if current playhead is different by more than 0.2s
      if (Math.abs(audio.currentTime - currentTime) > 0.2) {
        audio.currentTime = Math.min(currentTime, audio.duration || currentTime);
      }
      audio.play().catch((err) => console.warn('Audio play notice:', err));

      // Continuous master-clock loop: Audio is the absolute authority
      const masterAudioLoop = () => {
        if (audioRef.current && playing) {
          const currentAudioTime = audioRef.current.currentTime;
          onTimeChange(currentAudioTime);

          if (audioRef.current.ended || currentAudioTime >= duration) {
            onTogglePlay();
            onTimeChange(0);
            return;
          }
          animSyncRef.current = requestAnimationFrame(masterAudioLoop);
        }
      };

      animSyncRef.current = requestAnimationFrame(masterAudioLoop);
    } else {
      audio.pause();
      if (animSyncRef.current) {
        cancelAnimationFrame(animSyncRef.current);
      }
    }

    return () => {
      if (animSyncRef.current) {
        cancelAnimationFrame(animSyncRef.current);
      }
    };
  }, [playing, audioUrl, duration]);

  // Sync audio position when user scrubs/seeks while paused
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && audioUrl && !playing) {
      if (Math.abs(audio.currentTime - currentTime) > 0.05) {
        audio.currentTime = currentTime;
      }
    }
  }, [currentTime, playing, audioUrl]);

  // Background Audio playback
  useEffect(() => {
    const bgAudio = bgAudioRef.current;
    if (!bgAudio || !bgAudioUrl) return;

    if (playing) {
      bgAudio.currentTime = currentTime % (bgAudio.duration || 1);
      bgAudio.play().catch(() => {});
    } else {
      bgAudio.pause();
    }
  }, [playing, bgAudioUrl]);

  // Handle Canvas redraw on time or state change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = config.width;
    canvas.height = config.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawCanvasFrame(ctx, {
        width: config.width,
        height: config.height,
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
    }
  }, [
    currentTime,
    config,
    captions,
    media,
    style,
    motionEffect,
    particleEffect,
    transitionEffect,
    captionSize,
    captionPosition,
    projectName,
  ]);

  // Audio drag drop
  const handleDropAudio = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0]) {
      onAudioSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDropBgAudio = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.[0] && onBgAudioSelect) {
      onBgAudioSelect(e.dataTransfer.files[0]);
    }
  };

  // Media drag drop
  const handleDropMedia = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      onMediaSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border border-white/10 rounded-2xl bg-[#12101e]/90 shadow-2xl">
      <input
        ref={voiceFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onAudioSelect(e.target.files[0]);
          e.target.value = '';
        }}
      />
      {onBgAudioSelect && (
        <input
          ref={bgFileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onBgAudioSelect(e.target.files[0]);
            e.target.value = '';
          }}
        />
      )}

      {/* Audio & Media Quick Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Voice Track Card */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropAudio}
          onClick={() => !audioUrl && voiceFileInputRef.current?.click()}
          className={`relative flex flex-col justify-between p-3.5 border rounded-xl transition ${
            audioUrl
              ? 'border-violet-500/40 bg-gradient-to-br from-violet-500/15 to-purple-500/5'
              : 'border-dashed border-violet-500/30 hover:border-violet-400/60 bg-violet-500/10 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-white truncate">
                {audioName || 'Add Voice Track'}
              </span>
              <span className="block text-[10px] text-white/50 truncate">
                {audioUrl ? 'Voice saved' : 'Click / Drop Voice File'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {audioUrl && onOpenAiAudioSync && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAiAudioSync();
                  }}
                  title="AI Synchronize Time Scraps & Images with this Voice Track"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/25 hover:bg-violet-500/40 text-violet-200 border border-violet-500/40 text-[11px] font-bold shadow-sm transition"
                >
                  <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
                  <span>AI Sync</span>
                </button>
              )}
              {audioUrl && onDeleteAudio && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAudio();
                  }}
                  title="Delete voice track"
                  className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 transition shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Voice Volume Control Slider */}
          {audioUrl && onVoiceVolumeChange && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-violet-300 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={voiceVolume}
                onChange={(e) => onVoiceVolumeChange(Number(e.target.value))}
                className="flex-1 accent-violet-400 h-1 cursor-pointer rounded bg-white/10"
                title={`Voice volume: ${Math.round(voiceVolume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-white/70 min-w-[32px] text-right">
                {Math.round(voiceVolume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 2. Background Music (BGM) Track Card */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropBgAudio}
          onClick={() => !bgAudioUrl && bgFileInputRef.current?.click()}
          className={`relative flex flex-col justify-between p-3.5 border rounded-xl transition ${
            bgAudioUrl
              ? 'border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 to-blue-500/5'
              : 'border-dashed border-indigo-500/30 hover:border-indigo-400/60 bg-indigo-500/10 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0">
              <Disc3 className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-white truncate">
                {bgAudioName || 'Background Sound'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-indigo-300/80 truncate">
                <Repeat className="w-3 h-3 text-indigo-400 shrink-0" />
                {bgAudioUrl ? 'Auto-looped across video' : 'Click / Drop BG Music'}
              </span>
            </div>
            {bgAudioUrl && onDeleteBgAudio && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBgAudio();
                }}
                title="Delete background sound"
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30 transition shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Background Volume Control Slider */}
          {bgAudioUrl && onBgAudioVolumeChange && (
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={bgAudioVolume}
                onChange={(e) => onBgAudioVolumeChange(Number(e.target.value))}
                className="flex-1 accent-indigo-400 h-1 cursor-pointer rounded bg-white/10"
                title={`Background sound volume: ${Math.round(bgAudioVolume * 100)}%`}
              />
              <span className="text-[10px] font-mono text-indigo-200 min-w-[32px] text-right">
                {Math.round(bgAudioVolume * 100)}%
              </span>
            </div>
          )}
        </div>

        {/* 3. Visual Media Assets Card */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropMedia}
          className="flex flex-col justify-between p-3.5 border border-dashed border-fuchsia-500/30 hover:border-fuchsia-400/60 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-violet-500/5 transition cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-white truncate">
                {media.length ? `${media.length} visual asset(s)` : 'Add images or videos'}
              </span>
              <span className="block text-[10px] text-white/50 truncate">
                Auto-assigned across captions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Canvas Container */}
      <div className="relative flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] p-3 rounded-xl bg-[#080712] border border-white/10 overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={(e) => {
            if (!onCanvasClick || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            onCanvasClick(x, y);
          }}
          className={`max-w-full max-h-[60vh] rounded-lg shadow-2xl object-contain bg-[#161323] ${onCanvasClick ? 'cursor-crosshair' : ''}`}
          style={{
            aspectRatio: `${config.width} / ${config.height}`,
          }}
        />

        {/* Voice Audio element */}
        <audio
          ref={audioRef}
          muted={muted}
          onEnded={() => {
            if (playing) onTogglePlay();
          }}
        />

        {/* Background Audio element */}
        <audio
          ref={bgAudioRef}
          muted={muted}
          loop
        />
      </div>

      {/* Transport Control Bar */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl">
        {/* Play / Pause */}
        <button
          onClick={onTogglePlay}
          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition shadow-lg shadow-violet-500/20 shrink-0"
        >
          {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        {/* Timeline Scrubber Slider */}
        <input
          type="range"
          min={0}
          max={Math.max(1, duration)}
          step={0.05}
          value={Math.min(currentTime, duration)}
          onChange={(e) => onTimeChange(Number(e.target.value))}
          className="flex-1 accent-violet-400 cursor-pointer h-1.5 rounded-lg bg-white/10"
        />

        {/* Time Code Label */}
        <div className="text-xs font-mono font-medium text-white/70 min-w-[90px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Mute Toggle */}
        <button
          onClick={() => setMuted(!muted)}
          className="p-1.5 text-white/60 hover:text-white transition"
          title={muted ? 'Unmute' : 'Mute All Audio'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

