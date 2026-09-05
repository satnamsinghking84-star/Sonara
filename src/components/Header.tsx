import React from 'react';
import { Sparkles, Trash2, Download, Upload, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onClearProject: () => void;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onProjectNameChange,
  onClearProject,
  onExportJson,
  onImportJson,
}) => {
  const jsonInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="h-16 sticky top-0 z-20 flex items-center justify-between gap-4 px-6 border-b border-white/10 bg-[#0d0c17]/90 backdrop-blur-md">
      {/* Brand */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-400 to-fuchsia-500 shadow-lg shadow-violet-500/20 text-white font-black text-lg">
          S
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-base">
            sonora<span className="text-violet-400">.studio</span>
          </div>
          <span className="text-[10px] text-white/40 tracking-widest uppercase font-medium">
            voice to video studio
          </span>
        </div>
      </div>

      {/* Editable Project Name */}
      <div className="hidden sm:flex items-center max-w-xs w-full">
        <input
          type="text"
          value={projectName}
          onChange={(e) => onProjectNameChange(e.target.value)}
          placeholder="Untitled voice story"
          className="w-full bg-transparent border-b border-white/15 focus:border-violet-400 text-white font-semibold text-base px-1 py-1 outline-none transition-colors text-center"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 text-xs text-white/60">
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local-First Workspace</span>
        </div>

        {/* Import JSON */}
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          onChange={onImportJson}
          className="hidden"
        />
        <button
          onClick={() => jsonInputRef.current?.click()}
          title="Import project JSON"
          className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 transition"
        >
          <Upload className="w-4 h-4" />
        </button>

        {/* Export JSON */}
        <button
          onClick={onExportJson}
          title="Save project JSON"
          className="p-2 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white/80 transition"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Clear Project */}
        <button
          onClick={onClearProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 transition font-medium"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>
    </header>
  );
};
