import React, { useState } from 'react';
import { Check, Sparkles, Video, Flame, FlaskConical, Layers, ChevronDown, ChevronRight, Type } from 'lucide-react';
import { MOTION_EFFECTS, TEST_MOTION_EFFECTS, PARTICLE_EFFECTS, TRANSITION_EFFECTS, PRESETS } from '../constants';
import { MotionEffectId, ParticleEffectId, TransitionEffectId } from '../types';

interface StyleSidebarProps {
  presetId: string;
  motionEffect: MotionEffectId;
  particleEffect: ParticleEffectId;
  transitionEffect: TransitionEffectId;
  captionSize: number;
  captionPosition: number;
  onPresetChange: (presetId: string) => void;
  onMotionEffectChange: (motionId: MotionEffectId) => void;
  onParticleEffectChange: (particleId: ParticleEffectId) => void;
  onTransitionEffectChange: (transitionId: TransitionEffectId) => void;
  onCaptionSizeChange: (size: number) => void;
  onCaptionPositionChange: (pos: number) => void;
}

export const StyleSidebar: React.FC<StyleSidebarProps> = ({
  presetId,
  motionEffect,
  particleEffect,
  transitionEffect,
  captionSize,
  captionPosition,
  onPresetChange,
  onMotionEffectChange,
  onParticleEffectChange,
  onTransitionEffectChange,
  onCaptionSizeChange,
  onCaptionPositionChange,
}) => {
  const [motionCategory, setMotionCategory] = useState<'standard' | 'test'>('standard');
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="flex flex-col border border-white/10 rounded-2xl bg-[#12101e]/90 shadow-xl overflow-hidden">
      {/* Section 1: Caption Style Presets */}
      <div className="flex flex-col border-b border-white/10 p-4">
        <button
          onClick={() => toggleSection('presets')}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              Visual Direction
            </div>
            <h2 className="text-sm font-bold text-white mt-0.5">Caption Styling</h2>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            {openSection === 'presets' ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {openSection === 'presets' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        {Object.entries(PRESETS).map(([id, preset]) => {
          const isActive = presetId === id;

          return (
            <button
              key={id}
              onClick={() => onPresetChange(id)}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'border-violet-400 bg-violet-500/15 text-white shadow-md'
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/70'
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-inner"
                style={{
                  backgroundColor: preset.bgColor || 'rgba(0, 0, 0, 0.6)',
                  color: preset.color,
                  border: preset.borderAccent ? `1px solid ${preset.borderAccent}` : undefined,
                }}
              >
                Aa
              </div>
              <span className="text-xs font-semibold truncate flex-1">{preset.name}</span>
              {isActive && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
            </button>
          );
        })}
          </div>
        )}
      </div>

      {/* Section 2: Motion Effects Options */}
      <div className="flex flex-col border-b border-white/10 p-4">
        <button
          onClick={() => toggleSection('motion')}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-amber-400/80 font-semibold">
              Visual Animation
            </div>
            <h3 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-amber-400" />
              <span>Motion Effects Pro</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              {MOTION_EFFECTS.length + TEST_MOTION_EFFECTS.length} FX
            </span>
            {openSection === 'motion' ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {openSection === 'motion' && (
          <div className="flex flex-col gap-2 mt-4">
            {/* Motion Category Selector Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 mt-1">
          <button
            onClick={() => setMotionCategory('standard')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              motionCategory === 'standard'
                ? 'bg-amber-500 text-black font-bold shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-3 h-3" />
            <span>Standard ({MOTION_EFFECTS.length} FX)</span>
          </button>
          <button
            onClick={() => setMotionCategory('test')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              motionCategory === 'test'
                ? 'bg-fuchsia-500 text-white font-bold shadow-sm shadow-fuchsia-500/20'
                : 'text-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10'
            }`}
          >
            <FlaskConical className="w-3 h-3" />
            <span>🧪 New Test FX (8)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
          {(motionCategory === 'standard' ? MOTION_EFFECTS : TEST_MOTION_EFFECTS).map((fx) => {
            const isActive = motionEffect === fx.id;
            const isTest = motionCategory === 'test';
            return (
              <button
                key={fx.id}
                onClick={() => onMotionEffectChange(fx.id)}
                className={`flex flex-col gap-1 p-2.5 rounded-xl border text-left transition-all relative group ${
                  isActive
                    ? isTest
                      ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white shadow-md shadow-fuchsia-500/10'
                      : 'border-amber-400 bg-amber-500/15 text-white shadow-md shadow-amber-500/5'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white truncate">{fx.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                      isActive
                        ? isTest
                          ? 'bg-fuchsia-400/30 text-fuchsia-200 font-bold'
                          : 'bg-amber-400/20 text-amber-300 font-bold'
                        : isTest
                        ? 'bg-fuchsia-500/15 text-fuchsia-300'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {fx.tag}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 leading-tight line-clamp-1">
                  {fx.description}
                </p>
                {isActive && (
                  <div
                    className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-ping ${
                      isTest ? 'bg-fuchsia-400' : 'bg-amber-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
            </div>
          </div>
        )}
      </div>

      {/* Section 3: Premium Image Transition Effects (10 Options) */}
      <div className="flex flex-col border-b border-white/10 p-4">
        <button
          onClick={() => toggleSection('transitions')}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold">
              Scene Transition FX
            </div>
            <h3 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Seamless Flow Transitions</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              {TRANSITION_EFFECTS.length - 1} Premium FX
            </span>
            {openSection === 'transitions' ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {openSection === 'transitions' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
          {TRANSITION_EFFECTS.map((fx) => {
            const isActive = transitionEffect === fx.id;
            return (
              <button
                key={fx.id}
                onClick={() => onTransitionEffectChange(fx.id)}
                className={`flex flex-col gap-1 p-2.5 rounded-xl border text-left transition-all relative group ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-500/15 text-white shadow-md shadow-emerald-500/10'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-white truncate">{fx.name}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                      isActive
                        ? 'bg-emerald-400/20 text-emerald-300 font-bold'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {fx.tag}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 leading-tight line-clamp-1">
                  {fx.description}
                </p>
                {isActive && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            );
          })}
          </div>
        )}
      </div>

      {/* Section 4: Floating Particles Options */}
      <div className="flex flex-col border-b border-white/10 p-4">
        <button
          onClick={() => toggleSection('particles')}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-sky-400/80 font-semibold">
              Atmospheric Overlay
            </div>
            <h3 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Floating Particles</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono">
              {PARTICLE_EFFECTS.length} FX
            </span>
            {openSection === 'particles' ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {openSection === 'particles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
          {PARTICLE_EFFECTS.map((fx) => {
            const isActive = particleEffect === fx.id;
            return (
              <button
                key={fx.id}
                onClick={() => onParticleEffectChange(fx.id)}
                className={`flex flex-col gap-1 p-2.5 rounded-xl border text-left transition-all relative group ${
                  isActive
                    ? 'border-sky-400 bg-sky-500/15 text-white shadow-md shadow-sky-500/5'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-white/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: fx.color }}
                    />
                    <span className="text-xs font-bold text-white truncate">{fx.name}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                      isActive
                        ? 'bg-sky-400/20 text-sky-300 font-bold'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {fx.tag}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 leading-tight line-clamp-1">
                  {fx.description}
                </p>
                {isActive && (
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                )}
              </button>
            );
          })}
          </div>
        )}
      </div>

      {/* Section 5: Sliders */}
      <div className="flex flex-col p-4">
        <button
          onClick={() => toggleSection('sliders')}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wider text-violet-400/80 font-semibold">
              Fine Tuning
            </div>
            <h3 className="text-xs font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-violet-400" />
              <span>Size & Position</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {openSection === 'sliders' ? <ChevronDown className="w-4 h-4 text-white/50" /> : <ChevronRight className="w-4 h-4 text-white/50" />}
          </div>
        </button>

        {openSection === 'sliders' && (
          <div className="flex flex-col gap-3.5 mt-4">
        {/* Text Size */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium text-white/70">
            <span>Text Size</span>
            <span className="text-violet-300 font-mono">{captionSize}px</span>
          </div>
          <input
            type="range"
            min={20}
            max={60}
            value={captionSize}
            onChange={(e) => onCaptionSizeChange(Number(e.target.value))}
            className="w-full accent-violet-400 cursor-pointer h-1.5 rounded-lg bg-white/10"
          />
        </div>

        {/* Vertical Position */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-medium text-white/70">
            <span>Vertical Offset</span>
            <span className="text-violet-300 font-mono">{captionPosition}%</span>
          </div>
          <input
            type="range"
            min={30}
            max={90}
            value={captionPosition}
            onChange={(e) => onCaptionPositionChange(Number(e.target.value))}
            className="w-full accent-violet-400 cursor-pointer h-1.5 rounded-lg bg-white/10"
          />
        </div>
        </div>
        )}
      </div>
    </div>
  );
};

