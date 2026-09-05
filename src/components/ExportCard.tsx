import React, { useState } from 'react';
import { Download, Film, Sparkles, CheckCircle, Video, Tv, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { AspectRatio, ExportResolution } from '../types';
import { EXPORT_RESOLUTIONS, getExportDimensions } from '../constants';

interface ExportCardProps {
  ratio: AspectRatio;
  exportResolution: ExportResolution;
  onResolutionChange: (res: ExportResolution) => void;
  exporting: boolean;
  exportProgress: number;
  exportStatus: string;
  exportUrl: string;
  projectName: string;
  onExportClick: () => void;
  onDownloadClick: () => void;
}

export const ExportCard: React.FC<ExportCardProps> = ({
  ratio,
  exportResolution,
  onResolutionChange,
  exporting,
  exportProgress,
  exportStatus,
  exportUrl,
  projectName,
  onExportClick,
  onDownloadClick,
}) => {
  const currentDimensions = getExportDimensions(ratio, exportResolution);
  const [isOpen, setIsOpen] = useState(false);

  // If we are exporting, force it open
  const isExpanded = isOpen || exporting || exportUrl;

  return (
    <div className="flex flex-col border border-violet-500/30 rounded-2xl bg-gradient-to-br from-violet-500/10 via-[#12101e] to-[#0d0c17] shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col text-left flex-1"
        >
          <div className="text-[10px] uppercase tracking-wider text-violet-300 font-semibold flex items-center gap-1">
            <Tv className="w-3 h-3 text-red-400" />
            <span>YouTube Optimized Renderer</span>
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5">Export Story Video</h2>
        </button>
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-fuchsia-400" />
          <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-white/50 hover:text-white">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 pt-3 flex flex-col gap-3.5">
          {/* Resolution Selector for YouTube */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/90 flex items-center gap-1.5">
                <span>YouTube Resolution</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono">
                {currentDimensions.width}×{currentDimensions.height} px
              </span>
            </div>
    
            <div className="grid grid-cols-2 gap-2">
              {EXPORT_RESOLUTIONS.map((res) => {
                const isSelected = exportResolution === res.id;
                return (
                  <button
                    key={res.id}
                    type="button"
                    disabled={exporting}
                    onClick={() => onResolutionChange(res.id)}
                    className={`flex flex-col gap-1 p-2.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-violet-400 bg-violet-500/20 text-white shadow-md shadow-violet-500/10 ring-1 ring-violet-400/50'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] text-white/70'
                    } ${exporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1">
                        {res.name}
                      </span>
                      {res.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            res.id === '1080p'
                              ? 'bg-red-500/20 text-red-300 font-bold border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          }`}
                        >
                          {res.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/50 leading-tight">
                      {res.tag}
                    </p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
    
          {/* Progress & Status */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-black/40 border border-white/10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white/80 font-medium truncate">{exportStatus || 'Ready when you are.'}</span>
              <span className="text-violet-300 font-mono font-bold">{Math.round(exportProgress)}%</span>
            </div>
    
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-200"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
    
            {exporting && (
              <p className="text-[10px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-lg mt-1 leading-tight">
                ⚡ <strong>Unstoppable Background Render:</strong> Video continues rendering at full speed in the background (even if you get a call or minimize the app) and automatically downloads to your phone when finished!
              </p>
            )}
          </div>
    
          {/* Primary Export / Download Action */}
          {!exportUrl ? (
            <button
              onClick={onExportClick}
              disabled={exporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
            >
              <Film className="w-4 h-4" />
              <span>{exporting ? `Rendering ${exportResolution.toUpperCase()} Video...` : `Export ${exportResolution.toUpperCase()} Video`}</span>
            </button>
          ) : (
            <button
              onClick={onDownloadClick}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition animate-bounce"
            >
              <Download className="w-4 h-4" />
              <span>Download {exportResolution.toUpperCase()} WebM Video</span>
            </button>
          )}
    
          <div className="text-[11px] text-white/40 leading-normal">
            Optimized 60 FPS rendering with exact WebM duration headers for YouTube.
          </div>
        </div>
      )}
    </div>
  );
};
