import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { CanvasPreview } from './components/CanvasPreview';
import { CaptionTimeline } from './components/CaptionTimeline';
import { StyleSidebar } from './components/StyleSidebar';
import { MediaBin } from './components/MediaBin';
import { ExportCard } from './components/ExportCard';
import { AIScriptModal } from './components/AIScriptModal';
import { MicRecorderModal } from './components/MicRecorderModal';
import { ImportScriptModal } from './components/ImportScriptModal';
import { AIAudioSyncModal } from './components/AIAudioSyncModal';

import { AspectRatio, CaptionItem, ExportResolution, MediaAsset, MotionEffectId, ParticleEffectId, ProjectData, TransitionEffectId } from './types';
import { INITIAL_CAPTIONS, PRESETS } from './constants';
import { parseSubtitleFile } from './utils/time';
import { exportVideoToWebM } from './utils/exportVideo';
import {
  deleteStoredAudioTrack,
  getStoredAudioTrack,
  saveAudioTrack,
  deleteStoredBgAudioTrack,
  getStoredBgAudioTrack,
  saveBgAudioTrack,
} from './utils/db';

export default function App() {
  // Project Settings
  const [projectName, setProjectName] = useState('Untitled voice story');
  const [ratio, setRatio] = useState<AspectRatio>('16:9');
  const [presetId, setPresetId] = useState('sunset');
  const [motionEffect, setMotionEffect] = useState<MotionEffectId>('kenburns-zoom-in');
  const [particleEffect, setParticleEffect] = useState<ParticleEffectId>('soft-sparkles');
  const [transitionEffect, setTransitionEffect] = useState<TransitionEffectId>('soft-ambient');
  const [captionSize, setCaptionSize] = useState(34);
  const [captionPosition, setCaptionPosition] = useState(78);

  // Content
  const [captions, setCaptions] = useState<CaptionItem[]>(INITIAL_CAPTIONS);
  const [media, setMedia] = useState<MediaAsset[]>([]);

  // Voice track
  const [audioName, setAudioName] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [voiceVolume, setVoiceVolume] = useState(1.0);

  // Background Audio track (Loops continuously across video)
  const [bgAudioName, setBgAudioName] = useState('');
  const [bgAudioUrl, setBgAudioUrl] = useState('');
  const [bgAudioVolume, setBgAudioVolume] = useState(0.3);

  // Pointer Edit State
  const [activePointerEdit, setActivePointerEdit] = useState<{captionId: string, pointerId: string} | null>(null);

  // Initial persistence loaded flag
  const [isLoaded, setIsLoaded] = useState(false);

  // Player State
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(13.2);
  const [playing, setPlaying] = useState(false);

  // Export State
  const [exportResolution, setExportResolution] = useState<ExportResolution>('1080p');
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('Ready when you are.');
  const [exportUrl, setExportUrl] = useState('');

  // Modals
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiAudioSyncOpen, setIsAiAudioSyncOpen] = useState(false);
  const [isMicModalOpen, setIsMicModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: '', visible: false });
  const toastTimerRef = useRef<any>(null);

  const animFrameRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(0);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2800);
  }, []);

  // Recalculate duration from captions or audio
  useEffect(() => {
    const maxCaptionEnd = Math.max(1, ...captions.map((c) => Number(c.end) || 0));
    setDuration(maxCaptionEnd);
  }, [captions]);

  // Load persistent Project State (Captions, Audio & Visual Media) on app startup
  useEffect(() => {
    async function initPersistentData() {
      // 1. Restore Captions & Project Settings from localStorage
      try {
        const saved = localStorage.getItem('sonora-studio-state');
        if (saved) {
          const parsed: ProjectData = JSON.parse(saved);
          if (parsed.projectName) setProjectName(parsed.projectName);
          if (parsed.ratio) setRatio(parsed.ratio);
          if (parsed.preset && PRESETS[parsed.preset]) setPresetId(parsed.preset);
          if (parsed.motionEffect) setMotionEffect(parsed.motionEffect);
          if (parsed.particleEffect) setParticleEffect(parsed.particleEffect);
          if (parsed.transitionEffect) setTransitionEffect(parsed.transitionEffect);
          if (parsed.captionSize) setCaptionSize(parsed.captionSize);
          if (parsed.captionPosition) setCaptionPosition(parsed.captionPosition);
          if (parsed.bgAudioVolume !== undefined) setBgAudioVolume(parsed.bgAudioVolume);
          if (parsed.voiceVolume !== undefined) setVoiceVolume(parsed.voiceVolume);
          if (Array.isArray(parsed.captions) && parsed.captions.length) {
            setCaptions(parsed.captions);
          }
        }
      } catch (e) {
        console.warn('Error reading localStorage state:', e);
      }

      // 2. Restore Audio Tracks from IndexedDB
      try {
        const storedAudio = await getStoredAudioTrack();
        if (storedAudio && storedAudio.blob) {
          const url = URL.createObjectURL(storedAudio.blob);
          setAudioUrl(url);
          setAudioName(storedAudio.name || 'Saved Voice Track');

          const tempAudio = new Audio(url);
          tempAudio.onloadedmetadata = () => {
            if (tempAudio.duration) {
              setDuration((prev) => Math.max(tempAudio.duration, prev));
            }
          };
        }
      } catch (e) {
        console.warn('Error reading stored audio track:', e);
      }

      try {
        const storedBgAudio = await getStoredBgAudioTrack();
        if (storedBgAudio && storedBgAudio.blob) {
          const bgUrl = URL.createObjectURL(storedBgAudio.blob);
          setBgAudioUrl(bgUrl);
          setBgAudioName(storedBgAudio.name || 'Saved Background Sound');
        }
      } catch (e) {
        console.warn('Error reading stored background audio track:', e);
      }

      // Flag as ready so future updates are safely saved
      setIsLoaded(true);
    }

    initPersistentData();
  }, []);

  // Save Captions & Project Meta to localStorage whenever updated
  const saveProjectMeta = useCallback(() => {
    if (!isLoaded) return;
    try {
      const data: ProjectData = {
        projectName,
        ratio,
        preset: presetId,
        motionEffect,
        particleEffect,
        transitionEffect,
        captionSize,
        captionPosition,
        captions,
        bgAudioVolume,
        voiceVolume,
      };
      localStorage.setItem('sonora-studio-state', JSON.stringify(data));
    } catch (e) {
      console.warn('Error saving project state:', e);
    }
  }, [
    isLoaded,
    projectName,
    ratio,
    presetId,
    motionEffect,
    particleEffect,
    transitionEffect,
    captionSize,
    captionPosition,
    captions,
    bgAudioVolume,
    voiceVolume,
  ]);

  useEffect(() => {
    saveProjectMeta();
  }, [saveProjectMeta]);

  // Playback Animation Loop (Fallback when NO voice audio track is present)
  const tick = useCallback(() => {
    // When voice audio is active, CanvasPreview's master audio clock directly drives currentTime
    // This completely eliminates any clock drift between audio playback and canvas/captions/images!
    if (audioUrl) return;

    const now = performance.now();
    const delta = (now - (lastTickTimeRef.current || now)) / 1000;
    lastTickTimeRef.current = now;

    setCurrentTime((prev) => {
      const nextTime = prev + delta;
      if (nextTime >= duration) {
        setPlaying(false);
        return 0;
      }
      return nextTime;
    });

    if (playing) {
      animFrameRef.current = requestAnimationFrame(tick);
    }
  }, [duration, playing, audioUrl]);

  useEffect(() => {
    if (playing) {
      lastTickTimeRef.current = performance.now();
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [playing, tick]);

  // Tab Title & Navigation Guard during Video Export
  useEffect(() => {
    if (!exporting) {
      document.title = projectName ? `${projectName} — Timescribe` : 'Timescribe — AI Voice & Subtitles';
      return;
    }

    document.title = `[${Math.round(exportProgress)}%] Rendering Video...`;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Video rendering is in progress. Leaving now will cancel export.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [exporting, exportProgress, projectName]);

  // Add Audio File & Save to Persistent Storage
  const handleAudioSelect = async (file: File) => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioName(file.name);

    // Persist audio track across page reloads
    await saveAudioTrack(file, file.name);

    // Get audio duration
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      if (tempAudio.duration) {
        setDuration(Math.max(tempAudio.duration, duration));
      }
    };

    showToast(`Loaded audio track: ${file.name} (saved persistently)`);
  };

  // Delete Audio Track explicitly
  const handleDeleteAudio = async () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl('');
    setAudioName('');
    await deleteStoredAudioTrack();
    showToast('Voice audio track deleted.');
  };

  // Add Background Audio File & Save to Persistent Storage (Auto-loops)
  const handleBgAudioSelect = async (file: File) => {
    if (bgAudioUrl) URL.revokeObjectURL(bgAudioUrl);

    const url = URL.createObjectURL(file);
    setBgAudioUrl(url);
    setBgAudioName(file.name);

    await saveBgAudioTrack(file, file.name);
    showToast(`Loaded background sound: ${file.name} (auto-loops across video)`);
  };

  // Delete Background Audio Track
  const handleDeleteBgAudio = async () => {
    if (bgAudioUrl) URL.revokeObjectURL(bgAudioUrl);
    setBgAudioUrl('');
    setBgAudioName('');
    await deleteStoredBgAudioTrack();
    showToast('Background sound deleted.');
  };

  const handleVoiceVolumeChange = (vol: number) => {
    setVoiceVolume(vol);
  };

  const handleBgAudioVolumeChange = (vol: number) => {
    setBgAudioVolume(vol);
  };

  // Add Visual Media Files
  const handleMediaSelect = (files: FileList) => {
    const incoming = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    const newAssets: MediaAsset[] = incoming.map((file, idx) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const element = isVideo ? document.createElement('video') : new Image();
      element.src = url;
      if (isVideo) {
        (element as HTMLVideoElement).muted = true;
        (element as HTMLVideoElement).playsInline = true;
      }

      return {
        id: `media-${Date.now()}-${idx}`,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        element,
        file,
      };
    });

    setMedia((prev) => [...prev, ...newAssets]);
    showToast(`Added ${newAssets.length} visual asset(s).`);
  };

  // Add Folder Visual Files (Naturally sorted & auto-mapped with cyclic rotation)
  const handleFolderSelect = (files: FileList) => {
    const incoming = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );

    if (!incoming.length) {
      showToast('No image or video files found in the selected folder.');
      return;
    }

    // Sort naturally by path/name (1.jpg, 2.jpg, ... 10.jpg)
    incoming.sort((a, b) => {
      const nameA = (a as any).webkitRelativePath || a.name;
      const nameB = (b as any).webkitRelativePath || b.name;
      return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const newAssets: MediaAsset[] = incoming.map((file, idx) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const element = isVideo ? document.createElement('video') : new Image();
      element.src = url;
      if (isVideo) {
        (element as HTMLVideoElement).muted = true;
        (element as HTMLVideoElement).playsInline = true;
      }

      return {
        id: `media-${Date.now()}-${idx}`,
        name: file.name,
        type: isVideo ? 'video' : 'image',
        url,
        element,
        file,
      };
    });

    const updatedMedia = [...media, ...newAssets];
    setMedia(updatedMedia);

    // Auto-map all caption timeline blocks to rotate over folder images
    setCaptions((prevCaptions) =>
      prevCaptions.map((cap, idx) => ({
        ...cap,
        mediaIndex: idx, // Render engine automatically wraps (idx % media.length)
      }))
    );

    const folderCount = newAssets.length;
    const captionCount = captions.length;
    if (captionCount > folderCount) {
      const rotatedExtra = captionCount - folderCount;
      showToast(
        `Folder loaded: ${folderCount} images auto-mapped across ${captionCount} beats (${folderCount} first + ${rotatedExtra} in rotation).`
      );
    } else {
      showToast(`Folder loaded: ${folderCount} images imported to media bin.`);
    }
  };

  const handleRemoveMedia = (id: string) => {
    setMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((m) => m.id !== id);
    });
  };

  // Import Subtitle file (.srt, .vtt)
  const handleScriptImport = (content: string) => {
    const parsed = parseSubtitleFile(content);
    if (!parsed.length) {
      showToast('No valid subtitle timestamps found in file.');
      return;
    }
    setCaptions(parsed);
    setCurrentTime(0);
    showToast(`Imported ${parsed.length} captions.`);
  };

  const handleApplyImportCaptions = (newCaptions: CaptionItem[], append: boolean) => {
    if (append && captions.length) {
      const maxEnd = Math.max(...captions.map((c) => c.end));
      const offsetCaptions = newCaptions.map((c, idx) => ({
        ...c,
        id: `cap-imp-${Date.now()}-${idx}`,
        start: Number((c.start + maxEnd).toFixed(2)),
        end: Number((c.end + maxEnd).toFixed(2)),
      }));
      setCaptions((prev) => [...prev, ...offsetCaptions]);
    } else {
      setCaptions(newCaptions);
      setCurrentTime(0);
    }
  };

  // Apply AI Script & TTS
  const handleApplyAiScript = async ({
    title,
    captions: newCaptions,
    audioBlob,
    audioName: newAudioName,
  }: {
    title: string;
    captions: CaptionItem[];
    audioBlob?: Blob;
    audioName?: string;
  }) => {
    if (title) setProjectName(title);
    if (newCaptions.length) setCaptions(newCaptions);

    if (audioBlob) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(audioBlob);
      const name = newAudioName || 'AI Voiceover';
      setAudioUrl(url);
      setAudioName(name);
      await saveAudioTrack(audioBlob, name);
    }

    setCurrentTime(0);
  };

  // Video Export Handler
  const handleExportWebM = async () => {
    if (exporting) return;
    setPlaying(false);
    setExporting(true);
    setExportProgress(2);
    setExportStatus('Starting render engine...');
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl('');
    }

    try {
      const resultUrl = await exportVideoToWebM({
        ratio,
        resolution: exportResolution,
        captions,
        media,
        audioUrl,
        voiceVolume,
        bgAudioUrl,
        bgAudioVolume,
        duration,
        presetId,
        motionEffect,
        particleEffect,
        transitionEffect,
        captionSize,
        captionPosition,
        projectName,
        onProgress: (prog, status) => {
          setExportProgress(prog);
          setExportStatus(status);
        },
      });

      setExportUrl(resultUrl);
      showToast(`${exportResolution.toUpperCase()} Video export completed!`);
    } catch (err: any) {
      console.error(err);
      setExportStatus('Export failed on this browser.');
      showToast(err.message || 'Export error');
    } finally {
      setExporting(false);
    }
  };

  // Download WebM Video
  const handleDownloadWebM = () => {
    if (!exportUrl) return;
    const a = document.createElement('a');
    a.href = exportUrl;
    const cleanName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.download = `${cleanName || 'story'}-${exportResolution}.webm`;
    a.click();
    showToast(`Downloaded ${exportResolution.toUpperCase()} WebM video!`);
  };

  // Clear Project Reset
  const handleClearProject = async () => {
    setPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (bgAudioUrl) URL.revokeObjectURL(bgAudioUrl);
    media.forEach((m) => URL.revokeObjectURL(m.url));
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    await deleteStoredAudioTrack();
    await deleteStoredBgAudioTrack();

    setProjectName('Untitled voice story');
    setRatio('16:9');
    setPresetId('sunset');
    setMotionEffect('kenburns-zoom-in');
    setParticleEffect('soft-sparkles');
    setCaptionSize(34);
    setCaptionPosition(78);
    setCaptions(INITIAL_CAPTIONS);
    setMedia([]);
    setAudioName('');
    setAudioUrl('');
    setBgAudioName('');
    setBgAudioUrl('');
    setBgAudioVolume(0.3);
    setVoiceVolume(1.0);
    setCurrentTime(0);
    setExportUrl('');
    setExportStatus('Ready when you are.');
    setExportProgress(0);

    localStorage.removeItem('sonora-studio-state');
    showToast('Project reset.');
  };

  // Export JSON
  const handleExportJson = () => {
    const data: ProjectData = {
      projectName,
      ratio,
      preset: presetId,
      motionEffect,
      particleEffect,
      captionSize,
      captionPosition,
      captions,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-project.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Saved project JSON.');
  };

  // Import JSON
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await file.text();
        const data: ProjectData = JSON.parse(text);
        if (data.projectName) setProjectName(data.projectName);
        if (data.ratio) setRatio(data.ratio);
        if (data.preset) setPresetId(data.preset);
        if (data.motionEffect) setMotionEffect(data.motionEffect);
        if (data.particleEffect) setParticleEffect(data.particleEffect);
        if (data.captionSize) setCaptionSize(data.captionSize);
        if (data.captionPosition) setCaptionPosition(data.captionPosition);
        if (Array.isArray(data.captions)) setCaptions(data.captions);
        showToast('Project JSON loaded successfully.');
      } catch (err) {
        showToast('Invalid project JSON file.');
      }
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0b0a13] text-white flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* Header */}
      <Header
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onClearProject={handleClearProject}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 pb-24 flex flex-col gap-6">
        {/* Top Toolbar */}
        <Toolbar
          ratio={ratio}
          onRatioChange={setRatio}
          onAudioSelect={handleAudioSelect}
          onBgAudioSelect={handleBgAudioSelect}
          onMediaSelect={handleMediaSelect}
          onFolderSelect={handleFolderSelect}
          onScriptImport={handleScriptImport}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onOpenAiAudioSync={() => setIsAiAudioSyncOpen(true)}
          onOpenMicModal={() => setIsMicModalOpen(true)}
          onExportWebM={handleExportWebM}
          exporting={exporting}
        />

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
          {/* Left Column: Canvas Stage & Caption Timeline */}
          <div className="flex flex-col gap-6">
            <CanvasPreview
              ratio={ratio}
              projectName={projectName}
              presetId={presetId}
              motionEffect={motionEffect}
              particleEffect={particleEffect}
              transitionEffect={transitionEffect}
              captionSize={captionSize}
              captionPosition={captionPosition}
              captions={captions}
              media={media}
              audioName={audioName}
              audioUrl={audioUrl}
              voiceVolume={voiceVolume}
              onVoiceVolumeChange={handleVoiceVolumeChange}
              bgAudioName={bgAudioName}
              bgAudioUrl={bgAudioUrl}
              bgAudioVolume={bgAudioVolume}
              onBgAudioVolumeChange={handleBgAudioVolumeChange}
              onBgAudioSelect={handleBgAudioSelect}
              onDeleteBgAudio={handleDeleteBgAudio}
              currentTime={currentTime}
              duration={duration}
              playing={playing}
              onTimeChange={setCurrentTime}
              onTogglePlay={() => setPlaying(!playing)}
              onAudioSelect={handleAudioSelect}
              onDeleteAudio={handleDeleteAudio}
              onMediaSelect={handleMediaSelect}
              onOpenAiAudioSync={() => setIsAiAudioSyncOpen(true)}
              onCanvasClick={activePointerEdit ? (x, y) => {
                setCaptions(prev => prev.map(c => {
                  if (c.id === activePointerEdit.captionId) {
                    return {
                      ...c,
                      pointers: c.pointers?.map(p => p.id === activePointerEdit.pointerId ? { ...p, x, y } : p)
                    };
                  }
                  return c;
                }));
                setActivePointerEdit(null);
                showToast('Target pointer positioned');
              } : undefined}
            />

            {/* Target Editing Overlay */}
            {activePointerEdit && (
              <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 p-3 rounded-xl flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">Target Pointer Mode Active</span>
                  <span className="text-xs opacity-80">- Click anywhere on the video preview above to place the arrow.</span>
                </div>
                <button 
                  onClick={() => setActivePointerEdit(null)}
                  className="px-3 py-1 bg-black/40 hover:bg-black/60 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}

            <CaptionTimeline
              captions={captions}
              media={media}
              currentTime={currentTime}
              onCaptionsChange={setCaptions}
              activePointerEdit={activePointerEdit}
              onStartPointerEdit={(captionId, pointerId) => setActivePointerEdit({ captionId, pointerId })}
              onJumpToTime={setCurrentTime}
              onOpenAiAudioSync={() => setIsAiAudioSyncOpen(true)}
              onAddCaption={() => {
                const end = Math.max(1, ...captions.map((c) => c.end));
                setCaptions((prev) => [
                  ...prev,
                  {
                    id: `cap-${Date.now()}`,
                    start: end,
                    end: end + 3,
                    text: 'New story caption',
                    mediaIndex: prev.length,
                  },
                ]);
              }}
              onShowToast={showToast}
            />
          </div>

          {/* Right Column: Styling, Media Bin & Video Export */}
          <div className="flex flex-col gap-6">
            <StyleSidebar
              presetId={presetId}
              motionEffect={motionEffect}
              particleEffect={particleEffect}
              transitionEffect={transitionEffect}
              captionSize={captionSize}
              captionPosition={captionPosition}
              onPresetChange={setPresetId}
              onMotionEffectChange={setMotionEffect}
              onParticleEffectChange={setParticleEffect}
              onTransitionEffectChange={setTransitionEffect}
              onCaptionSizeChange={setCaptionSize}
              onCaptionPositionChange={setCaptionPosition}
            />

            <MediaBin
              media={media}
              onRemoveMedia={handleRemoveMedia}
              onAddFolderClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                (input as any).webkitdirectory = true;
                (input as any).directory = true;
                input.multiple = true;
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files?.length) handleFolderSelect(files);
                };
                input.click();
              }}
              onAddMediaClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*';
                input.multiple = true;
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  if (files?.length) handleMediaSelect(files);
                };
                input.click();
              }}
            />

            <ExportCard
              ratio={ratio}
              exportResolution={exportResolution}
              onResolutionChange={setExportResolution}
              exporting={exporting}
              exportProgress={exportProgress}
              exportStatus={exportStatus}
              exportUrl={exportUrl}
              projectName={projectName}
              onExportClick={handleExportWebM}
              onDownloadClick={handleDownloadWebM}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <ImportScriptModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onApplyCaptions={handleApplyImportCaptions}
        onShowToast={showToast}
      />

      <AIScriptModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApplyScript={handleApplyAiScript}
        onShowToast={showToast}
      />

      <MicRecorderModal
        isOpen={isMicModalOpen}
        onClose={() => setIsMicModalOpen(false)}
        onSaveRecord={handleAudioSelect}
        onShowToast={showToast}
      />

      <AIAudioSyncModal
        isOpen={isAiAudioSyncOpen}
        onClose={() => setIsAiAudioSyncOpen(false)}
        audioUrl={audioUrl}
        audioName={audioName}
        captions={captions}
        media={media}
        duration={duration}
        onApplySync={(syncedCaptions, newDuration) => {
          setCaptions(syncedCaptions);
          if (newDuration) {
            setDuration(newDuration);
          }
          setCurrentTime(0);
        }}
        onAudioSelect={handleAudioSelect}
        onShowToast={showToast}
      />

      {/* Toast Banner */}
      <div
        className={`fixed left-1/2 bottom-6 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full border border-white/15 bg-[#171427]/95 text-white text-xs font-medium shadow-2xl transition-all duration-300 pointer-events-none ${
          toast.visible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
