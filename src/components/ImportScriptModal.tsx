import React, { useState, useEffect, useRef } from 'react';
import { FileText, X, Upload, Sparkles, Clock, Layers, Trash2, CheckCircle2, Zap } from 'lucide-react';
import { CaptionItem } from '../types';
import { parseScriptOrSubtitleText, formatTime, formatTimeMs } from '../utils/time';

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCaptions: (captions: CaptionItem[], append: boolean) => void;
  onShowToast: (msg: string) => void;
}

const SAMPLE_SRT = `1
00:00:00,270 --> 00:00:03,810
Jake buys a rental property. Marcus puts the same money into index

2
00:00:03,810 --> 00:00:07,309
funds. They both think they made the smarter choice. They're

3
00:00:07,309 --> 00:00:10,720
both wrong, because one of them forgot to count the hours and

4
00:00:10,720 --> 00:00:14,130
the other forgot to count the zeros. And when you actually

5
00:00:14,130 --> 00:00:17,750
run the numbers over 20 years, the gap will make your stomach drop.`;

export const ImportScriptModal: React.FC<ImportScriptModalProps> = ({
  isOpen,
  onClose,
  onApplyCaptions,
  onShowToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [defaultDuration, setDefaultDuration] = useState(3.0);
  const [splitMode, setSplitMode] = useState<'sentence' | 'words'>('sentence');
  const [appendMode, setAppendMode] = useState(false);
  const [parsedItems, setParsedItems] = useState<CaptionItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSrtDetected = inputText.includes('-->');

  // Auto-parse input text when text or settings change
  useEffect(() => {
    if (!inputText.trim()) {
      setParsedItems([]);
      return;
    }
    const items = parseScriptOrSubtitleText(inputText, defaultDuration, splitMode);
    setParsedItems(items);
  }, [inputText, defaultDuration, splitMode]);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      setInputText(text);
      onShowToast(`Loaded file: ${file.name}`);
      e.target.value = '';
    }
  };

  const handleApply = () => {
    if (!parsedItems.length) {
      onShowToast('Please enter or paste a valid script or SRT text.');
      return;
    }
    onApplyCaptions(parsedItems, appendMode);
    onShowToast(`Successfully created ${parsedItems.length} timed caption parts!`);
    onClose();
  };

  const totalDuration = parsedItems.length
    ? Math.max(...parsedItems.map((item) => item.end))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#12101e] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Import SRT / VTT & Timed Script</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Parts Generator
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Paste SRT/VTT file data or plain script text to auto-generate timed caption parts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-b border-white/10 bg-black/30 text-xs">
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,.txt,text/plain"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 font-semibold transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .SRT / .VTT File</span>
            </button>

            <button
              onClick={() => {
                setInputText(SAMPLE_SRT);
                onShowToast('Loaded sample SRT script');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 font-medium transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample SRT</span>
            </button>
          </div>

          {inputText && (
            <button
              onClick={() => setInputText('')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-300 hover:bg-rose-500/15 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Text</span>
            </button>
          )}
        </div>

        {/* Main Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          {/* Text Area */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-white/70">
              <span className="flex items-center gap-2">
                <span>Enter / Paste Script or Subtitle Content</span>
                {isSrtDetected && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    <span>Exact SRT Timestamps Mode</span>
                  </span>
                )}
              </span>
              <span className="text-[11px] text-white/40 font-mono">
                {inputText.length} chars | {inputText.split('\n').filter(Boolean).length} lines
              </span>
            </div>

            <textarea
              rows={6}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Paste your content here...
Examples supported:
1) Standard SRT with Timestamps:
1
00:00:00,270 --> 00:00:03,810
Jake buys a rental property. Marcus puts the same money into index...

2) Plain raw script text (will auto-split into parts)`}
              className="w-full bg-black/50 border border-white/15 rounded-2xl p-3.5 text-xs text-white placeholder:text-white/30 outline-none focus:border-sky-400 font-mono resize-none shadow-inner"
            />
          </div>

          {/* Timed Script Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white/[0.03] border border-white/10 rounded-2xl">
            {/* Part Duration (Hidden/Disabled when SRT is detected) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-white/70 flex items-center justify-between">
                <span>Duration per Part</span>
                {!isSrtDetected && <span className="text-sky-400 font-mono">{defaultDuration.toFixed(1)}s</span>}
              </label>
              {isSrtDetected ? (
                <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 font-mono">
                  Using exact SRT file timestamps
                </div>
              ) : (
                <input
                  type="range"
                  min={1.5}
                  max={8.0}
                  step={0.5}
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(Number(e.target.value))}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              )}
            </div>

            {/* Split Mode */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-white/70">Part Splitting Rule</label>
              {isSrtDetected ? (
                <div className="text-[11px] text-emerald-300/80 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-2.5 py-1.5 font-mono">
                  Preserving SRT subtitle lines
                </div>
              ) : (
                <select
                  value={splitMode}
                  onChange={(e) => setSplitMode(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer"
                >
                  <option value="sentence" className="bg-[#12101e]">By Line / Sentence</option>
                  <option value="words" className="bg-[#12101e]">By 6 Words Chunks</option>
                </select>
              )}
            </div>

            {/* Timeline Replace / Append */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-white/70">Timeline Action</label>
              <div className="flex items-center gap-2 mt-0.5">
                <button
                  type="button"
                  onClick={() => setAppendMode(false)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition ${
                    !appendMode
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Replace All
                </button>
                <button
                  type="button"
                  onClick={() => setAppendMode(true)}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold border transition ${
                    appendMode
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  Append
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Parsed Parts Preview */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Parsed Caption Parts Preview ({parsedItems.length} Parts)</span>
              </h3>
              {parsedItems.length > 0 && (
                <span className="text-[11px] text-sky-300 font-mono bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                  Total Timeline: {formatTime(totalDuration)} ({totalDuration.toFixed(2)}s)
                </span>
              )}
            </div>

            {parsedItems.length === 0 ? (
              <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center text-xs text-white/40">
                No parts generated yet. Type or paste your script text above to see the live parts preview.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {parsedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px]">
                        Part #{idx + 1}
                      </span>
                      <span className="text-white font-medium truncate">{item.text}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>
                        {formatTimeMs(item.start)} → {formatTimeMs(item.end)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-black/40">
          <div className="text-xs text-white/40">
            {parsedItems.length > 0 ? (
              <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Ready to generate {parsedItems.length} timed parts
              </span>
            ) : (
              'Enter text to unlock generate'
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleApply}
              disabled={!parsedItems.length}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply & Generate Captions</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
