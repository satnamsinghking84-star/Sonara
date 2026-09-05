import React, { useState } from 'react';
import { Image as ImageIcon, Film, Trash2, Plus, FolderPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { MediaAsset } from '../types';

interface MediaBinProps {
  media: MediaAsset[];
  onRemoveMedia: (id: string) => void;
  onAddMediaClick: () => void;
  onAddFolderClick: () => void;
}

export const MediaBin: React.FC<MediaBinProps> = ({
  media,
  onRemoveMedia,
  onAddMediaClick,
  onAddFolderClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col border border-white/10 rounded-2xl bg-[#12101e]/90 shadow-xl overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col text-left flex-1"
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            Media Bin
          </div>
          <h2 className="text-sm font-bold text-white mt-0.5">
            Your Visual Assets ({media.length})
          </h2>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddFolderClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-xs font-semibold transition"
            title="Upload whole folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Folder</span>
          </button>
          <button
            onClick={onAddMediaClick}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white transition"
            title="Add media files"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => setIsOpen(!isOpen)} className="p-1 text-white/50 hover:text-white">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 pt-3 flex flex-col gap-3">
          {!media.length ? (
            <div className="p-6 border border-dashed border-white/10 rounded-xl text-center text-xs text-white/40 leading-relaxed">
              No visual assets yet. Click Add Visuals in the toolbar or drag images & videos here.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
              {media.map((asset, index) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition group"
                >
                  {/* Thumbnail preview */}
                  <div className="w-10 h-8 rounded-lg bg-black/50 overflow-hidden shrink-0 border border-white/10">
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
    
                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-white truncate">
                      Visual #{index + 1}: {asset.name}
                    </span>
                    <span className="block text-[10px] text-white/40 capitalize">
                      {asset.type} asset
                    </span>
                  </div>
    
                  {/* Delete */}
                  <button
                    onClick={() => onRemoveMedia(asset.id)}
                    className="p-1 rounded-lg text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 transition opacity-80 group-hover:opacity-100"
                    title="Remove asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
