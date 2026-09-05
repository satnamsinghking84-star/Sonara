import React, { useRef } from 'react';
import {
  Music,
  Disc3,
  Image as ImageIcon,
  FolderPlus,
  FileText,
  Sparkles,
  Mic,
  Video,
  Download,
  Film,
} from 'lucide-react';
import { AspectRatio } from '../types';
import { ASPECT_RATIO_CONFIGS } from '../constants';

interface ToolbarProps {
  ratio: AspectRatio;
  onRatioChange: (ratio: AspectRatio) => void;
  onAudioSelect: (file: File) => void;
  onBgAudioSelect?: (file: File) => void;
  onMediaSelect: (files: FileList) => void;
  onFolderSelect: (files: FileList) => void;
  onScriptImport: (content: string) => void;
  onOpenImportModal: () => void;
  onOpenAiModal: () => void;
  onOpenAiAudioSync?: () => void;
  onOpenMicModal: () => void;
  onExportWebM: () => void;
  exporting: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  ratio,
  onRatioChange,
  onAudioSelect,
  onBgAudioSelect,
  onMediaSelect,
  onFolderSelect,
  onScriptImport,
  onOpenImportModal,
  onOpenAiModal,
  onOpenAiAudioSync,
  onOpenMicModal,
  onExportWebM,
  exporting,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bgAudioInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLInputElement>(null);

  const handleScriptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const text = await file.text();
      onScriptImport(text);
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.03] border border-white/10 rounded-2xl backdrop-blur-sm">
      {/* Inputs hidden */}
      <input
        ref={audioInputRef}
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
          ref={bgAudioInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.[0]) onBgAudioSelect(e.target.files[0]);
            e.target.value = '';
          }}
        />
      )}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onMediaSelect(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '', multiple: true } as any)}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) onFolderSelect(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={scriptInputRef}
        type="file"
        accept=".srt,.vtt,.txt,text/plain"
        className="hidden"
        onChange={handleScriptFileChange}
      />

      {/* Left Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Add Voice Audio */}
        <button
          onClick={() => audioInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition"
        >
          <Music className="w-4 h-4 text-violet-400" />
          <span>Add Voice Track</span>
        </button>

        {/* Add Background Sound */}
        {onBgAudioSelect && (
          <button
            onClick={() => bgAudioInputRef.current?.click()}
            title="Upload background music/sound (auto-loops across video)"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/30 hover:border-indigo-400/50 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 font-semibold text-xs transition shadow-md shadow-indigo-500/10"
          >
            <Disc3 className="w-4 h-4 text-indigo-400 animate-spin-slow" />
            <span>Background Music</span>
          </button>
        )}

        {/* Mic Record */}
        <button
          onClick={onOpenMicModal}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-violet-500/30 bg-violet-500/10 hover:bg-violet-500/20 text-violet-200 font-medium text-xs transition"
        >
          <Mic className="w-4 h-4 text-violet-300" />
          <span>Record Mic</span>
        </button>

        {/* Add Folder */}
        <button
          onClick={() => folderInputRef.current?.click()}
          title="Upload an entire folder of images/videos"
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 font-semibold text-xs transition shadow-md shadow-emerald-500/10"
        >
          <FolderPlus className="w-4 h-4 text-emerald-400" />
          <span>Add Folder</span>
        </button>

        {/* Add Visuals */}
        <button
          onClick={() => mediaInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition"
        >
          <ImageIcon className="w-4 h-4 text-fuchsia-400" />
          <span>Add Visuals</span>
        </button>

        {/* Import Captions */}
        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-500/30 hover:border-sky-500/50 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 font-semibold text-xs transition shadow-md shadow-sky-500/10"
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>Import SRT / VTT</span>
        </button>

        {/* AI Magic Script Generator */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 to-violet-500/15 hover:from-amber-500/25 hover:to-violet-500/25 text-amber-200 font-semibold text-xs shadow-lg shadow-amber-500/10 transition"
        >
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>AI Story Generator</span>
        </button>

        {/* AI Audio & Time Scrap Sync */}
        {onOpenAiAudioSync && (
          <button
            onClick={onOpenAiAudioSync}
            title="Use AI to align timestamps, captions & image transitions precisely with voice track"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-violet-500/40 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-emerald-600/20 hover:from-violet-600/35 hover:to-emerald-600/35 text-violet-200 font-bold text-xs shadow-lg shadow-violet-500/15 transition"
          >
            <Sparkles className="w-4 h-4 text-violet-300 animate-pulse" />
            <span>AI Audio Sync</span>
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Aspect Ratio Selector */}
        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5">
          <Film className="w-3.5 h-3.5 text-white/50" />
          <select
            value={ratio}
            onChange={(e) => onRatioChange(e.target.value as AspectRatio)}
            className="bg-transparent text-white font-medium text-xs outline-none cursor-pointer"
          >
            {Object.entries(ASPECT_RATIO_CONFIGS).map(([key, config]) => (
              <option key={key} value={key} className="bg-[#12101e] text-white">
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Export WebM */}
        <button
          onClick={onExportWebM}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>{exporting ? 'Rendering...' : 'Export WebM'}</span>
        </button>
      </div>
    </div>
  );
};
