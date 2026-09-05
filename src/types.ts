export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export type ExportResolution = '720p' | '1080p' | '4k' | '480p';

export interface ResolutionOption {
  id: ExportResolution;
  name: string;
  tag: string;
  badge?: string;
  description: string;
}

export type MotionEffectId =
  | 'none'
  | 'kenburns-zoom-in'
  | 'kenburns-zoom-out'
  | 'pan-left-right'
  | 'pan-right-left'
  | 'pan-up'
  | 'pan-down'
  | 'pulse-breath'
  | 'tilt-orbit'
  | 'hyper-punch'
  | 'cinematic-drift'
  | 'diagonal-up-right'
  | 'diagonal-down-left'
  | 'vortex-spin'
  | 'whip-zoom-in'
  | 'slow-reveal-pan'
  | 'parallax-float'
  | 'soft-bounce'
  | 'dramatic-push'
  | 'cinematic-shutter'
  | 'cinematic-push'
  | 'cinematic-pull'
  | 'depth-breathe'
  | 'soft-focus-reveal'
  | 'focus-pull'
  | 'static-clean'
  // Experimental Test Motion Effects (8)
  | 'vertigo-dolly-zoom'
  | 'd-parallax-tilt'
  | 'anamorphic-sweep'
  | 'hyperlapse-speed-ramp'
  | 'dutch-angle-roll'
  | 'cross-zoom-impact'
  | 'orbit-arc-glide'
  | 'glitch-pulse-push';

export interface MotionEffectOption {
  id: MotionEffectId;
  name: string;
  description: string;
  tag: string;
}

export type TransitionEffectId =
  | 'none'
  | 'crossfade'
  | 'seamless-morph'
  | 'soft-ambient'
  | 'gentle-focus'
  | 'silky-film-melt';

export interface TransitionEffectOption {
  id: TransitionEffectId;
  name: string;
  description: string;
  tag: string;
}

export type ParticleEffectId =
  | 'none'
  | 'floating-dust'
  | 'soft-sparkles'
  | 'silver-snow'
  | 'vintage-film'
  | 'crt-scanlines'
  | 'ethereal-fireflies'
  | 'luxury-gold'
  | 'prism-light-leaks'
  | 'film-grain'
  | 'anamorphic-flares'
  | 'ambient-dust'
  | 'elegant-glow'
  | 'super-8-burns'
  | 'archival-sepia'
  | 'vhs-chroma'
  | 'cinematic-letterbox'
  | 'evolving-color-grade'
  | 'focus-isolation'
  | 'hypnotic-pulse'
  | 'subliminal-flash'
  | 'zeigarnik-progress'
  | 'film-halation'
  | 'retro-1950s-tv'
  | 'ancient-daguerreotype'
  | 'cold-war-microfilm'
  | 'eight-mm-kodachrome'
  | 'silent-cinema'
  | 'interstellar-black-hole'
  | 'quantum-ethereal-fluid'
  | 'hypnotic-sacred-geometry';

export interface ParticleEffectOption {
  id: ParticleEffectId;
  name: string;
  description: string;
  tag: string;
  color: string;
}

export interface PointerData {
  id: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  angle: number; // 0 to 360 degrees
  startTime: number; // 0 to 100 percentage of caption duration
  endTime: number; // 0 to 100 percentage of caption duration
}

export interface CaptionItem {
  id: string;
  start: number;
  end: number;
  text: string;
  mediaIndex: number; // -1 means auto (index % media.length), or specific index
  textOnlyBg?: boolean;
  visualPrompt?: string;
  motionEffect?: MotionEffectId;
  transitionEffect?: TransitionEffectId;
  pointers?: PointerData[];
}

export interface MediaAsset {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  element: HTMLImageElement | HTMLVideoElement;
  file?: File;
}

export interface PresetStyle {
  id: string;
  name: string;
  color: string;
  bgColor?: string;
  font: string;
  weight: string;
  textTransform?: 'none' | 'uppercase' | 'capitalize';
  hasShadow?: boolean;
  hasBox?: boolean;
  borderAccent?: string;
}

export interface ProjectData {
  projectName: string;
  ratio: AspectRatio;
  preset: string;
  motionEffect: MotionEffectId;
  particleEffect?: ParticleEffectId;
  transitionEffect?: TransitionEffectId;
  captionSize: number;
  captionPosition: number;
  captions: CaptionItem[];
  bgAudioVolume?: number;
  voiceVolume?: number;
}

