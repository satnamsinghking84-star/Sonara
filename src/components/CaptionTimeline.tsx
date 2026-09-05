import React, { useState } from 'react';
import { Plus, Trash2, Download, Clock, Sparkles, ChevronDown, ChevronRight, Target, Crosshair, Type } from 'lucide-react';
import { CaptionItem, MediaAsset } from '../types';
import { exportToSRT } from '../utils/time';

interface CaptionTimelineProps {
  captions: CaptionItem[];
  media: MediaAsset[];
  currentTime: number;
  onCaptionsChange: (captions: CaptionItem[]) => void;
  onJumpToTime: (time: number) => void;
  onAddCaption: () => void;
  onShowToast: (msg: string) => void;
  activePointerEdit?: { captionId: string, pointerId: string } | null;
  onStartPointerEdit?: (captionId: string, pointerId: string) => void;
  onOpenAiAudioSync?: () => void;
}

export const CaptionTimeline: React.FC<CaptionTimelineProps> = ({
  captions,
  media,
  currentTime,
  onCaptionsChange,
  onJumpToTime,
  onAddCaption,
  onShowToast,
  activePointerEdit,
  onStartPointerEdit,
  onOpenAiAudioSync,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const activeCaption = captions.find(
    (item) => currentTime >= item.start && currentTime < item.end
  );

  const handleUpdate = (id: string, field: keyof CaptionItem, value: any) => {
    const updated = captions.map((cap) => {
      if (cap.id === id) {
        return { ...cap, [field]: value };
      }
      return cap;
    });
    onCaptionsChange(updated);
  };

  const handleDelete = (id: string) => {
    const updated = captions.filter((c) => c.id !== id);
    if (!updated.length) {
      updated.push({
        id: `cap-${Date.now()}`,
        start: 0,
        end: 3,
        text: 'Add your first caption',
        mediaIndex: 0,
      });
    }
    onCaptionsChange(updated);
  };

  const handleExportSrt = () => {
    const srt = exportToSRT(captions);
    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Downloaded subtitles.srt');
  };

  return (
    <div className="flex flex-col border border-white/10 rounded-2xl bg-[#12101e]/90 shadow-xl overflow-hidden">
      {/* Title & Actions Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 p-4">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col text-left flex-1"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            Caption Timeline
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
            Timed Story Subtitles ({captions.length})
          </h2>
        </button>

        <div className="flex items-center gap-2">
          {/* AI Sync to Audio */}
          {onOpenAiAudioSync && (
            <button
              onClick={onOpenAiAudioSync}
              title="Use AI to align timestamps, captions & image transitions precisely with voice track"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 text-xs font-semibold transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden sm:inline">AI Sync to Audio</span>
            </button>
          )}

          {/* Export SRT */}
          <button
            onClick={handleExportSrt}
            title="Download .SRT subtitle file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export SRT</span>
          </button>

          {/* Add Caption */}
          <button
            onClick={onAddCaption}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-200 text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Block</span>
          </button>
          
          <button onClick={() => setIsOpen(!isOpen)} className="p-1 ml-1 text-white/50 hover:text-white">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 pt-3">
          {/* Caption List */}
          <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {captions.map((item, idx) => {
              const isActive = activeCaption?.id === item.id;

              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    // If user clicks outside inputs, seek timeline
                    const target = e.target as HTMLElement;
                    if (!['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'SVG', 'PATH'].includes(target.tagName)) {
                      onJumpToTime(item.start);
                    }
                  }}
                  className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${
                    isActive
                      ? 'border-violet-400/80 bg-violet-500/15 shadow-lg shadow-violet-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[80px_80px_1fr_90px_60px] gap-2 items-center">
                  {/* Start Time */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 mb-1 font-medium sm:hidden">
                      Start (s)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={item.start}
                      onChange={(e) =>
                        handleUpdate(item.id, 'start', Math.max(0, Number(e.target.value) || 0))
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-violet-400 font-mono text-center"
                    />
                  </div>

                  {/* End Time */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 mb-1 font-medium sm:hidden">
                      End (s)
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={item.end}
                      onChange={(e) =>
                        handleUpdate(
                          item.id,
                          'end',
                          Math.max(item.start + 0.1, Number(e.target.value) || 0.1)
                        )
                      }
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-violet-400 font-mono text-center"
                    />
                  </div>

                  {/* Caption Text */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 mb-1 font-medium sm:hidden">
                      Caption Text
                    </span>
                    <textarea
                      rows={1}
                      value={item.text}
                      onChange={(e) => handleUpdate(item.id, 'text', e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-violet-400 resize-none font-medium"
                      placeholder="Enter caption text..."
                    />
                  </div>

                  {/* Visual Asset Dropdown */}
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 mb-1 font-medium sm:hidden">
                      Visual
                    </span>
                    <select
                      value={item.mediaIndex}
                      onChange={(e) => handleUpdate(item.id, 'mediaIndex', Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-1.5 py-1 text-xs text-white outline-none focus:border-violet-400 truncate cursor-pointer"
                    >
                      <option value={-1} className="bg-[#12101e]">
                        Auto #{idx + 1}
                      </option>
                      {media.map((_, mIdx) => (
                        <option key={mIdx} value={mIdx} className="bg-[#12101e]">
                          Visual #{mIdx + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleUpdate(item.id, 'textOnlyBg', !item.textOnlyBg)}
                      title="Text Only (Black Background)"
                      className={`p-1.5 rounded-lg transition ${
                        item.textOnlyBg
                          ? 'text-yellow-300 bg-yellow-500/20 hover:bg-yellow-500/30' 
                          : 'text-white/40 hover:text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const newPointer = {
                          id: Math.random().toString(36).substring(7),
                          x: 50,
                          y: 50,
                          angle: 45,
                          startTime: 0,
                          endTime: 100,
                        };
                        const currentPointers = item.pointers || [];
                        handleUpdate(item.id, 'pointers', [...currentPointers, newPointer]);
                      }}
                      title="Add Callout Arrow"
                      className={`p-1.5 rounded-lg transition ${
                        item.pointers && item.pointers.length > 0
                          ? 'text-violet-300 bg-violet-500/20 hover:bg-violet-500/30' 
                          : 'text-white/40 hover:text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <Target className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete caption block"
                      className="p-1.5 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Multiple Pointer Controls */}
                {item.pointers && item.pointers.length > 0 && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10 mt-1 px-1">
                    {item.pointers.map((ptr, pIdx) => {
                      const isPicking = activePointerEdit?.pointerId === ptr.id;
                      return (
                      <div key={ptr.id} className={`flex flex-col gap-2 p-2 bg-black/20 border ${isPicking ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-white/5'} rounded-lg transition-colors`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-violet-300 font-bold uppercase tracking-wider">Arrow {pIdx + 1}</span>
                            <button
                              onClick={() => onStartPointerEdit?.(item.id, ptr.id)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                                isPicking 
                                  ? 'bg-emerald-500 text-black' 
                                  : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/40'
                              }`}
                            >
                              <Crosshair className="w-3 h-3" />
                              {isPicking ? 'Picking...' : 'Pick on Screen'}
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              const newPointers = item.pointers!.filter(p => p.id !== ptr.id);
                              handleUpdate(item.id, 'pointers', newPointers.length > 0 ? newPointers : undefined);
                            }}
                            className="text-white/40 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/50 w-8">Pos X</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ptr.x}
                              onChange={(e) => {
                                const updated = item.pointers!.map(p => p.id === ptr.id ? { ...p, x: Number(e.target.value) } : p);
                                handleUpdate(item.id, 'pointers', updated);
                              }}
                              className="w-full accent-violet-400 h-1 rounded-lg bg-white/10 cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/50 w-8">Pos Y</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ptr.y}
                              onChange={(e) => {
                                const updated = item.pointers!.map(p => p.id === ptr.id ? { ...p, y: Number(e.target.value) } : p);
                                handleUpdate(item.id, 'pointers', updated);
                              }}
                              className="w-full accent-violet-400 h-1 rounded-lg bg-white/10 cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/50 w-8">Angle</span>
                            <input
                              type="range"
                              min="0"
                              max="360"
                              value={ptr.angle}
                              onChange={(e) => {
                                const updated = item.pointers!.map(p => p.id === ptr.id ? { ...p, angle: Number(e.target.value) } : p);
                                handleUpdate(item.id, 'pointers', updated);
                              }}
                              className="w-full accent-violet-400 h-1 rounded-lg bg-white/10 cursor-pointer"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-400 w-12 font-medium">Show at %</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ptr.startTime}
                              onChange={(e) => {
                                const val = Math.min(Number(e.target.value), ptr.endTime);
                                const updated = item.pointers!.map(p => p.id === ptr.id ? { ...p, startTime: val } : p);
                                handleUpdate(item.id, 'pointers', updated);
                              }}
                              className="w-full accent-emerald-400 h-1 rounded-lg bg-white/10 cursor-pointer"
                            />
                            <span className="text-[10px] text-white/60 w-6 font-mono text-right">{ptr.startTime}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-rose-400 w-12 font-medium">Hide at %</span>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={ptr.endTime}
                              onChange={(e) => {
                                const val = Math.max(Number(e.target.value), ptr.startTime);
                                const updated = item.pointers!.map(p => p.id === ptr.id ? { ...p, endTime: val } : p);
                                handleUpdate(item.id, 'pointers', updated);
                              }}
                              className="w-full accent-rose-400 h-1 rounded-lg bg-white/10 cursor-pointer"
                            />
                            <span className="text-[10px] text-white/60 w-6 font-mono text-right">{ptr.endTime}%</span>
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
