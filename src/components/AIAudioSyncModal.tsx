import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  Loader2,
  Play,
  Pause,
  Music,
  Check,
  RotateCcw,
  Sliders,
  AlignLeft,
  Volume2,
  Upload,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { CaptionItem, MediaAsset } from '../types';
import { formatTime } from '../utils/time';

interface AIAudioSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string;
  audioName: string;
  captions: CaptionItem[];
  media: MediaAsset[];
  duration: number;
  onApplySync: (syncedCaptions: CaptionItem[], newDuration?: number) => void;
  onAudioSelect: (file: File) => void;
  onShowToast: (msg: string) => void;
}

export const AIAudioSyncModal: React.FC<AIAudioSyncModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  audioName,
  captions,
  media,
  duration,
  onApplySync,
  onAudioSelect,
  onShowToast,
}) => {
  const [syncMode, setSyncMode] = useState<'detect' | 'align'>('detect');
  const [pacing, setPacing] = useState<'sentence' | 'balanced' | 'phrase'>('balanced');
  const [autoMapMedia, setAutoMapMedia] = useState(true);
  const [loading, setLoading] = useState(false);
  const [syncedResult, setSyncedResult] = useState<CaptionItem[] | null>(null);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(null);

  // Mini audio player for previewing
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleTogglePreview = () => {
    if (!audioPreviewRef.current || !audioUrl) return;
    if (previewPlaying) {
      audioPreviewRef.current.pause();
      setPreviewPlaying(false);
    } else {
      audioPreviewRef.current.play().catch(() => {});
      setPreviewPlaying(true);
    }
  };

  const handlePlayBeat = (start: number, end: number) => {
    if (!audioPreviewRef.current || !audioUrl) return;
    audioPreviewRef.current.currentTime = start;
    audioPreviewRef.current.play().catch(() => {});
    setPreviewPlaying(true);

    const checkStop = () => {
      if (audioPreviewRef.current && audioPreviewRef.current.currentTime >= end) {
        audioPreviewRef.current.pause();
        setPreviewPlaying(false);
        audioPreviewRef.current.removeEventListener('timeupdate', checkStop);
      }
    };
    audioPreviewRef.current.addEventListener('timeupdate', checkStop);
  };

  const handleRunAiSync = async () => {
    if (!audioUrl) {
      onShowToast('Please load a voice audio track first.');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch audio blob from audioUrl
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();

      // 2. Convert blob to Base64
      const reader = new FileReader();
      const base64AudioPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1] || '';
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const audioBase64 = await base64AudioPromise;

      // 3. Prepare payload
      const existingCaptions = syncMode === 'align' ? captions : [];
      const mimeType = audioBlob.type || 'audio/webm';

      onShowToast('Gemini is analyzing voice audio timestamps...');

      // 4. Call server endpoint
      const res = await fetch('/api/ai/align-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          existingCaptions,
          pacing,
          audioDuration: duration,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to align audio timestamps.');
      }

      if (!Array.isArray(data.captions) || !data.captions.length) {
        throw new Error('No synchronized speech beats returned.');
      }

      // 5. Map to CaptionItem format
      const formattedCaptions: CaptionItem[] = data.captions.map((item: any, idx: number) => {
        let mediaIdx = idx;
        if (!autoMapMedia && captions[idx] && captions[idx].mediaIndex !== undefined) {
          mediaIdx = captions[idx].mediaIndex;
        }

        return {
          id: `cap-sync-${Date.now()}-${idx}`,
          start: Number(Number(item.start).toFixed(2)) || 0,
          end: Number(Number(item.end).toFixed(2)) || (Number(item.start) + 3),
          text: item.text || `Beat ${idx + 1}`,
          mediaIndex: mediaIdx,
          visualPrompt: item.visualPrompt,
        };
      });

      // Sort by start time just to guarantee strict monotonicity
      formattedCaptions.sort((a, b) => a.start - b.start);

      setSyncedResult(formattedCaptions);
      if (data.detectedDuration) {
        setDetectedDuration(data.detectedDuration);
      }
      onShowToast(`Synced ${formattedCaptions.length} beats perfectly with voice track!`);
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'Error aligning audio with AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!syncedResult || !syncedResult.length) return;
    const maxEnd = Math.max(...syncedResult.map((c) => c.end));
    onApplySync(syncedResult, detectedDuration || maxEnd);
    onShowToast(`Applied ${syncedResult.length} AI-synced time scraps!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-2xl my-auto border border-violet-500/30 rounded-2xl bg-[#12101e] shadow-2xl text-white relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Hidden Audio Player for Previewing */}
        {audioUrl && (
          <audio
            ref={audioPreviewRef}
            src={audioUrl}
            onTimeUpdate={() => {
              if (audioPreviewRef.current) {
                setPreviewCurrentTime(audioPreviewRef.current.currentTime);
              }
            }}
            onEnded={() => setPreviewPlaying(false)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30 shadow-md shadow-violet-500/10">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">AI Audio & Time Scrap Sync</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
                  Zero Drift
                </span>
              </div>
              <p className="text-xs text-white/50">
                Aligns each image transition and caption scrap with spoken voice timing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
          {/* 1. Voice Audio Track Info / Dropzone */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center justify-between">
              <span>Target Voice Track</span>
              {audioUrl && (
                <span className="text-violet-300 font-mono normal-case">
                  Duration: {formatTime(duration)}
                </span>
              )}
            </div>

            {audioUrl ? (
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={handleTogglePreview}
                    className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shrink-0 shadow-md transition"
                    title={previewPlaying ? 'Pause audio' : 'Play audio preview'}
                  >
                    {previewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-white truncate">
                      {audioName || 'Active Voice Track'}
                    </span>
                    <span className="text-[10px] text-white/50 font-mono">
                      Current: {formatTime(previewCurrentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-white/60 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/10 transition"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-violet-500/30 hover:border-violet-400/60 rounded-xl bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer transition text-center"
              >
                <Music className="w-7 h-7 text-violet-400 mb-2" />
                <span className="text-xs font-semibold text-white mb-1">
                  Click to select or drop a voice track
                </span>
                <span className="text-[11px] text-white/40">
                  Supports MP3, WAV, WebM, AAC audio files
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onAudioSelect(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>

          {/* 2. Sync Configuration Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mode Selector */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-violet-400" />
                <span>Sync Strategy</span>
              </label>
              <div className="flex flex-col gap-1.5">
                <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                  syncMode === 'detect'
                    ? 'border-violet-500/50 bg-violet-500/15 text-white'
                    : 'border-white/5 bg-black/20 text-white/60 hover:border-white/15'
                }`}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="detect"
                    checked={syncMode === 'detect'}
                    onChange={() => setSyncMode('detect')}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-semibold">Auto-Detect Story Beats</span>
                    <span className="block text-[10px] opacity-70">
                      Transcribes speech & sets exact start/end seconds per thought.
                    </span>
                  </div>
                </label>

                <label className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                  syncMode === 'align'
                    ? 'border-violet-500/50 bg-violet-500/15 text-white'
                    : 'border-white/5 bg-black/20 text-white/60 hover:border-white/15'
                }`}>
                  <input
                    type="radio"
                    name="syncMode"
                    value="align"
                    checked={syncMode === 'align'}
                    onChange={() => setSyncMode('align')}
                    className="mt-0.5 accent-violet-500"
                  />
                  <div className="text-left">
                    <span className="block text-xs font-semibold">Align Current Script</span>
                    <span className="block text-[10px] opacity-70">
                      Keeps current {captions.length} captions and recalibrates start/end times.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Pacing / Image Frequency */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col gap-2">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Visual Beat Pacing</span>
              </label>
              <div className="flex flex-col gap-1.5">
                {[
                  {
                    id: 'sentence',
                    name: 'Single Sentences',
                    desc: 'Dynamic image change with every statement.',
                  },
                  {
                    id: 'balanced',
                    name: 'Balanced Beats (Recommended)',
                    desc: 'Natural 3–5s cuts aligned to vocal pauses.',
                  },
                  {
                    id: 'phrase',
                    name: 'Extended Thoughts',
                    desc: 'Calmer cuts (5–8s) for longer scene stays.',
                  },
                ].map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                      pacing === item.id
                        ? 'border-fuchsia-500/50 bg-fuchsia-500/15 text-white'
                        : 'border-white/5 bg-black/20 text-white/60 hover:border-white/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pacing"
                      value={item.id}
                      checked={pacing === item.id}
                      onChange={() => setPacing(item.id as any)}
                      className="mt-0.5 accent-fuchsia-500"
                    />
                    <div className="text-left">
                      <span className="block text-xs font-semibold">{item.name}</span>
                      <span className="block text-[10px] opacity-70">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-map Visuals checkbox */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="block text-xs font-semibold text-white">
                  Auto-map Media Bin Images
                </span>
                <span className="block text-[10px] text-white/50">
                  Rotates available {media.length} visual assets across synced story beats automatically.
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoMapMedia}
              onChange={(e) => setAutoMapMedia(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-1">
            <button
              onClick={handleRunAiSync}
              disabled={loading || !audioUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Listening & Aligning Audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Run AI Audio Sync</span>
                </>
              )}
            </button>
          </div>

          {/* 3. Synced Results Preview Section */}
          {syncedResult && (
            <div className="mt-2 flex flex-col gap-2.5 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-300">
                    {syncedResult.length} Synchronized Story Beats Generated
                  </span>
                </div>
                <span className="text-[11px] font-mono text-emerald-400/80">
                  Span: 0.00s → {syncedResult[syncedResult.length - 1]?.end.toFixed(2)}s
                </span>
              </div>

              {/* Beats Scrollable List */}
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {syncedResult.map((beat, idx) => {
                  const mediaAsset = media.length ? media[beat.mediaIndex % media.length] : null;

                  return (
                    <div
                      key={beat.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-[10px] font-mono font-bold text-violet-300 px-1.5 py-0.5 rounded bg-violet-500/20 shrink-0">
                          #{idx + 1}
                        </span>

                        <span className="text-[10px] font-mono text-emerald-300 shrink-0 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {beat.start.toFixed(2)}s – {beat.end.toFixed(2)}s
                        </span>

                        <span className="text-xs text-white/90 truncate flex-1" title={beat.text}>
                          {beat.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {mediaAsset && (
                          <div className="flex items-center gap-1 text-[10px] text-white/50">
                            {mediaAsset.type === 'image' && mediaAsset.url && (
                              <img
                                src={mediaAsset.url}
                                alt=""
                                className="w-5 h-5 rounded object-cover border border-white/20"
                              />
                            )}
                            <span className="truncate max-w-[60px]">{mediaAsset.name}</span>
                          </div>
                        )}

                        <button
                          onClick={() => handlePlayBeat(beat.start, beat.end)}
                          title="Listen to this beat in audio"
                          className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition"
                        >
                          <Play className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Confirm Apply Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20">
                <span className="text-[11px] text-white/60">
                  Ready to lock timestamps & imagery to this audio track?
                </span>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Synced Beats to Timeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
