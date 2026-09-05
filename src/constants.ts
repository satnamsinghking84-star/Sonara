import { AspectRatio, CaptionItem, ExportResolution, MotionEffectOption, ParticleEffectOption, PresetStyle, ResolutionOption, TransitionEffectOption } from './types';

export const TRANSITION_EFFECTS: TransitionEffectOption[] = [
  {
    id: 'soft-ambient',
    name: '1. Soft Ambient Dissolve (0.4s Flow)',
    description: 'Silky 0.4s transition with zero character ghosting & 0.2s steady pause',
    tag: 'Recommended',
  },
  {
    id: 'crossfade',
    name: '2. Cinematic Crossfade',
    description: 'Butter-smooth opacity dissolve with zero hard edges',
    tag: 'Seamless',
  },
  {
    id: 'seamless-morph',
    name: '3. Invisible Morph Flow',
    description: 'Scale-matched soft melt where images flow undetected',
    tag: 'Morph Flow',
  },
  {
    id: 'gentle-focus',
    name: '4. Gentle Focus Blur Shift',
    description: 'Natural depth-of-field focus shift between scenes',
    tag: 'Focus',
  },
  {
    id: 'silky-film-melt',
    name: '5. Silky Film Melt',
    description: 'Organic cinematic film luminance blending',
    tag: 'Filmic',
  },
  {
    id: 'none',
    name: 'Instant Cut (No FX)',
    description: 'Clean instant image change without transition',
    tag: 'Cut',
  },
];

export const MOTION_EFFECTS: MotionEffectOption[] = [
  {
    id: 'none',
    name: 'None (No Motion)',
    description: 'Fixed clean image transition without any motion',
    tag: 'Static',
  },
  {
    id: 'kenburns-zoom-in',
    name: 'Ken Burns Zoom In',
    description: 'Slow dramatic zoom into subject',
    tag: 'Classic',
  },
  {
    id: 'kenburns-zoom-out',
    name: 'Ken Burns Zoom Out',
    description: 'Slow reveal zoom out',
    tag: 'Cinematic',
  },
  {
    id: 'pan-left-right',
    name: 'Pan Left → Right',
    description: 'Horizontal smooth slide across frame',
    tag: 'Smooth',
  },
  {
    id: 'pan-right-left',
    name: 'Pan Right → Left',
    description: 'Horizontal reverse slide across frame',
    tag: 'Smooth',
  },
  {
    id: 'pan-up',
    name: 'Vertical Rise',
    description: 'Upward gentle camera tilt',
    tag: 'Elevate',
  },
  {
    id: 'pan-down',
    name: 'Downward Glide',
    description: 'Smooth gentle vertical descent',
    tag: 'Elevate',
  },
  {
    id: 'pulse-breath',
    name: 'Rhythmic Pulse',
    description: 'Subtle breathing pulse with audio beat',
    tag: 'Dynamic',
  },
  {
    id: 'tilt-orbit',
    name: 'Rotational Tilt',
    description: 'Subtle 3D angle tilt & gentle float',
    tag: 'Stylized',
  },
  {
    id: 'hyper-punch',
    name: 'Punch Zoom',
    description: 'Energetic subtle punch zoom effect',
    tag: 'Action',
  },
  {
    id: 'cinematic-drift',
    name: 'Diagonal Drift',
    description: 'Smooth diagonal float',
    tag: 'Ambient',
  },
  {
    id: 'diagonal-up-right',
    name: 'Ascending Float',
    description: 'Smooth top-right diagonal ascent',
    tag: 'Ambient',
  },
  {
    id: 'diagonal-down-left',
    name: 'Descending Drift',
    description: 'Subtle bottom-left diagonal drift',
    tag: 'Ambient',
  },
  {
    id: 'vortex-spin',
    name: 'Subtle Spiral',
    description: 'Micro rotational spin with gentle zoom',
    tag: 'Vortex',
  },
  {
    id: 'whip-zoom-in',
    name: 'Soft Whip Zoom',
    description: 'Quick subtle pop entering scene',
    tag: 'Pop',
  },
  {
    id: 'slow-reveal-pan',
    name: 'Panoramic Sweep',
    description: 'Deep wide horizontal panoramic pan',
    tag: 'Panoramic',
  },
  {
    id: 'parallax-float',
    name: 'Parallax Wave',
    description: 'Figure-8 dual wave float effect',
    tag: 'Parallax',
  },
  {
    id: 'soft-bounce',
    name: 'Gentle Landing',
    description: 'Soft elastic spring entry motion',
    tag: 'Bounce',
  },
  {
    id: 'dramatic-push',
    name: 'Macro Push In',
    description: 'Deep central focus push',
    tag: 'Focus',
  },
  {
    id: 'cinematic-push',
    name: 'Cinematic Push',
    description: 'Smooth cinematic push-in towards focal point',
    tag: 'Cinematic',
  },
  {
    id: 'cinematic-pull',
    name: 'Cinematic Pull',
    description: 'Cinematic pull-out revealing full frame context',
    tag: 'Cinematic',
  },
  {
    id: 'depth-breathe',
    name: 'Depth Breathe',
    description: 'Natural depth of field breathing camera movement',
    tag: 'Depth',
  },
  {
    id: 'soft-focus-reveal',
    name: 'Soft Focus Reveal',
    description: 'Gentle soft focus to crystal clear sharp reveal',
    tag: 'Focus',
  },
  {
    id: 'focus-pull',
    name: 'Focus Pull',
    description: 'Rack focus shift creating filmic depth transition',
    tag: 'Focus',
  },
  {
    id: 'cinematic-shutter',
    name: 'Handheld Jitter',
    description: 'Subtle handheld camera micro shake',
    tag: 'Organic',
  },
  {
    id: 'static-clean',
    name: 'Static Clean',
    description: 'Fixed clean centered frame',
    tag: 'Clean',
  },
];

export const TEST_MOTION_EFFECTS: MotionEffectOption[] = [
  {
    id: 'vertigo-dolly-zoom',
    name: 'Vertigo Dolly Zoom',
    description: 'Hitchcock Vertigo dolly zoom perspective distortion',
    tag: '✨ TEST',
  },
  {
    id: 'd-parallax-tilt',
    name: '3D Parallax Tilt',
    description: 'Multi-layer 3D optical perspective shift',
    tag: '✨ TEST',
  },
  {
    id: 'anamorphic-sweep',
    name: 'Anamorphic Sweep',
    description: 'Cinematic wide horizontal anamorphic camera flare glide',
    tag: '✨ TEST',
  },
  {
    id: 'hyperlapse-speed-ramp',
    name: 'Hyperlapse Speed Ramp',
    description: 'High-speed rapid entry ramp with smooth deceleration',
    tag: '✨ TEST',
  },
  {
    id: 'dutch-angle-roll',
    name: 'Dutch Angle Roll',
    description: 'Stylized tilted horizon angle rotation roll',
    tag: '✨ TEST',
  },
  {
    id: 'cross-zoom-impact',
    name: 'Cross Zoom Impact',
    description: 'High-energy elastic zoom punch with subtle recoil',
    tag: '✨ TEST',
  },
  {
    id: 'orbit-arc-glide',
    name: 'Orbit Arc Glide',
    description: 'Smooth orbital curved arc motion around subject',
    tag: '✨ TEST',
  },
  {
    id: 'glitch-pulse-push',
    name: 'Glitch Pulse Push',
    description: 'Modern cyberpunk micro glitch jitter push',
    tag: '✨ TEST',
  },
];

export const PARTICLE_EFFECTS: ParticleEffectOption[] = [
  {
    id: 'none',
    name: 'None',
    description: 'Clean visual without particle overlays',
    tag: 'Clean',
    color: '#94a3b8',
  },
  {
    id: 'floating-dust',
    name: 'Floating Dust',
    description: 'Subtle ambient micro dust motes drifting',
    tag: 'Ambient',
    color: '#cbd5e1',
  },
  {
    id: 'soft-sparkles',
    name: 'Soft Sparkles',
    description: 'Shimmering diamond star glints',
    tag: 'Glow',
    color: '#e2e8f0',
  },
  {
    id: 'silver-snow',
    name: 'Silver Snow',
    description: 'Gentle falling silver snow particles',
    tag: 'Cool',
    color: '#38bdf8',
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    description: 'Old film scratches, dust, and grain overlay',
    tag: 'Retro',
    color: '#a3a3a3',
  },
  {
    id: 'crt-scanlines',
    name: 'CRT Scanlines',
    description: 'Classic retro TV scanlines and static',
    tag: 'Retro',
    color: '#34d399',
  },
  {
    id: 'ethereal-fireflies',
    name: 'Ethereal Fireflies',
    description: 'Organic, glowing green and yellow fireflies wandering',
    tag: 'Premium',
    color: '#bef264',
  },
  {
    id: 'luxury-gold',
    name: 'Luxury Gold Dust',
    description: 'Rich, shimmering fine gold dust for high-end feel',
    tag: 'Premium',
    color: '#fbbf24',
  },
  {
    id: 'prism-light-leaks',
    name: 'Prism Light Leaks',
    description: 'Cinematic optical lens flares and color refractions',
    tag: 'Premium',
    color: '#a855f7',
  },
  {
    id: 'film-grain',
    name: 'Vintage Film Grain',
    description: 'Subtle 35mm film grain with dynamic vignette and scratches',
    tag: 'Premium',
    color: '#a3a3a3',
  },
  {
    id: 'anamorphic-flares',
    name: 'Anamorphic Flares',
    description: 'Cinematic wide horizontal light streaks responding to motion',
    tag: 'Premium',
    color: '#38bdf8',
  },
  {
    id: 'ambient-dust',
    name: 'Ambient Dust Motes',
    description: 'Ultra-realistic out-of-focus atmospheric floating particles',
    tag: 'Engaging',
    color: '#e5e5e5',
  },
  {
    id: 'elegant-glow',
    name: 'Elegant Breathing Glow',
    description: 'A soft, pulsing central highlight with rich dark borders',
    tag: 'Premium',
    color: '#cbd5e1',
  },
  {
    id: 'super-8-burns',
    name: 'Super 8mm Film Burns',
    description: 'Organic warm edge flashes, heavy jitter, and dust',
    tag: 'Vintage Premium',
    color: '#f97316',
  },
  {
    id: 'archival-sepia',
    name: '1920s Archival Sepia',
    description: 'Warm tint, heavy vignette, flickering exposure, and scratches',
    tag: 'Vintage Premium',
    color: '#a16207',
  },
  {
    id: 'vhs-chroma',
    name: 'Retro VHS Camcorder',
    description: 'Subtle RGB shifts, scanlines, and tracking distortion',
    tag: 'Vintage Premium',
    color: '#10b981',
  },
  {
    id: 'cinematic-letterbox',
    name: 'Cinematic Letterbox (2.35:1)',
    description: 'Ultra-widescreen black bars with high-contrast color grading',
    tag: 'Cinematic',
    color: '#000000',
  },
  {
    id: 'evolving-color-grade',
    name: 'Evolving Emotional Grade',
    description: 'Shifts from cold/mysterious (blue) to warm/inviting (orange) over time',
    tag: 'Cinematic',
    color: '#f59e0b',
  },
  {
    id: 'focus-isolation',
    name: 'Psychological Focus Isolation',
    description: 'Vignette edges darken & desaturate to force the eye to the bright center',
    tag: 'Psychology',
    color: '#1d4ed8',
  },
  {
    id: 'hypnotic-pulse',
    name: 'Heartbeat Hypnotic Pulse',
    description: 'Subtle 60-BPM pulsing vignette that triggers an unconscious trance state',
    tag: 'Psychology',
    color: '#be123c',
  },
  {
    id: 'subliminal-flash',
    name: 'Attention Reset Flashes',
    description: 'Micro-flashes every 3 seconds to interrupt patterns and retain attention',
    tag: 'Psychology',
    color: '#fbbf24',
  },
  {
    id: 'zeigarnik-progress',
    name: 'Zeigarnik Progress Bar',
    description: 'A neon progress bar at the bottom. The brain hates incomplete tasks!',
    tag: 'Psychology',
    color: '#22c55e',
  },
  {
    id: 'film-halation',
    name: 'True Film Halation',
    description: 'A subtle red/orange blooming glow around highlights for an authentic analog film look',
    tag: 'Cinematic',
    color: '#ef4444',
  },
  {
    id: 'retro-1950s-tv',
    name: '1950s Broadcast TV',
    description: 'Black & white contrast, heavy static noise, and rolling horizontal band distortion',
    tag: 'Vintage Premium',
    color: '#9ca3af',
  },
  {
    id: 'ancient-daguerreotype',
    name: '1800s Daguerreotype',
    description: 'Silver-gelatin high contrast, heavy blurred vignette, and chemical stains',
    tag: 'Vintage Premium',
    color: '#57534e',
  },
  {
    id: 'cold-war-microfilm',
    name: 'Classified Microfilm',
    description: 'Harsh inverted contrast, fast scanning artifact lines, and heavy dust',
    tag: 'Vintage Premium',
    color: '#a3e635',
  },
  {
    id: 'eight-mm-kodachrome',
    name: '70s Kodachrome 8mm',
    description: 'Saturated warm colors, magenta/orange light leaks on edges, and heavy film grain',
    tag: 'Vintage Premium',
    color: '#f97316',
  },
  {
    id: 'silent-cinema',
    name: '1910s Silent Cinema',
    description: 'Calm vintage frame rate feel, heavy contrast B&W, soft iris vignette, and subtle scratches',
    tag: 'Vintage Premium',
    color: '#171717',
  },
  {
    id: 'interstellar-black-hole',
    name: 'Interstellar Black Hole',
    description: 'A mesmerizing, 3D rotating event horizon that literally sucks glowing stardust into the center',
    tag: 'Mind Bending',
    color: '#a855f7',
  },
  {
    id: 'quantum-ethereal-fluid',
    name: 'Quantum Liquid Light',
    description: 'Smooth, undulating ribbons of luminescent light that drift organically like glowing ink in deep water',
    tag: 'Mind Bending',
    color: '#0ea5e9',
  },
  {
    id: 'hypnotic-sacred-geometry',
    name: 'Hypnotic Sacred Geometry',
    description: 'A deeply engaging, slowly rotating golden mandala wireframe that locks audience attention',
    tag: 'Mind Bending',
    color: '#fbbf24',
  },
];

export const PRESETS: Record<string, PresetStyle> = {
  sunset: {
    id: 'sunset',
    name: 'Sunset Serif',
    color: '#f4c95d',
    font: 'Georgia, serif',
    weight: '700',
    hasShadow: true,
  },
  clean: {
    id: 'clean',
    name: 'Clean White',
    color: '#ffffff',
    font: 'Inter, system-ui, sans-serif',
    weight: '700',
    hasShadow: true,
  },
  signal: {
    id: 'signal',
    name: 'Signal Bold',
    color: '#7dd3fc',
    font: 'Impact, Arial Black, sans-serif',
    weight: '900',
    textTransform: 'uppercase',
    hasShadow: true,
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyber Neon',
    color: '#f43f5e',
    bgColor: 'rgba(15, 23, 42, 0.85)',
    font: 'Courier New, monospace',
    weight: '800',
    textTransform: 'uppercase',
    hasBox: true,
    borderAccent: '#38bdf8',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Luxe',
    color: '#6ee7b7',
    font: 'Playfair Display, Georgia, serif',
    weight: '700',
    hasShadow: true,
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Box',
    color: '#ffffff',
    bgColor: 'rgba(0, 0, 0, 0.75)',
    font: 'Inter, system-ui, sans-serif',
    weight: '600',
    hasBox: true,
  },
};

export const INITIAL_CAPTIONS: CaptionItem[] = [
  {
    id: 'cap-1',
    start: 0,
    end: 3.8,
    text: 'Turn your voice into a story worth watching.',
    mediaIndex: 0,
    visualPrompt: 'A glowing starry night sky over peaceful mountain ridges',
  },
  {
    id: 'cap-2',
    start: 3.8,
    end: 8.4,
    text: 'Shape every beat with captions, visuals, and rhythm.',
    mediaIndex: 1,
    visualPrompt: 'Abstract vibrant neon violet and magenta wave motion',
  },
  {
    id: 'cap-3',
    start: 8.4,
    end: 13.2,
    text: 'Export a polished video directly from your browser.',
    mediaIndex: 2,
    visualPrompt: 'A sleek dark mode digital workstation interface with light sparkles',
  },
];

export const ASPECT_RATIO_CONFIGS: Record<
  AspectRatio,
  { width: number; height: number; label: string; tag: string }
> = {
  '16:9': { width: 960, height: 540, label: '16:9 Landscape', tag: 'YouTube / Web' },
  '9:16': { width: 540, height: 960, label: '9:16 Portrait', tag: 'Reels / TikTok / Shorts' },
  '1:1': { width: 720, height: 720, label: '1:1 Square', tag: 'Instagram Feed' },
  '4:5': { width: 576, height: 720, label: '4:5 Social', tag: 'Social Posts' },
};

export const EXPORT_RESOLUTIONS: ResolutionOption[] = [
  {
    id: '720p',
    name: '720p HD',
    tag: 'YouTube HD',
    badge: 'Fast & Smooth',
    description: '1280×720 HD • Ultra smooth export for YouTube',
  },
  {
    id: '1080p',
    name: '1080p Full HD',
    tag: 'YouTube FHD',
    badge: 'Recommended',
    description: '1920×1080 Full HD • Crisp YouTube upload quality',
  },
  {
    id: '4k',
    name: '4K Ultra HD',
    tag: 'YouTube 4K',
    badge: 'Maximum Clarity',
    description: '3840×2160 4K • Ultra crisp high resolution',
  },
  {
    id: '480p',
    name: '480p SD',
    tag: 'Draft SD',
    description: '854×480 SD • Quick small file size export',
  },
];

export function getExportDimensions(ratio: AspectRatio, resolution: ExportResolution): {
  width: number;
  height: number;
  bitrate: number;
  label: string;
} {
  switch (ratio) {
    case '9:16':
      switch (resolution) {
        case '480p':
          return { width: 480, height: 854, bitrate: 2500000, label: '480×854 (480p)' };
        case '720p':
          return { width: 720, height: 1280, bitrate: 6000000, label: '720×1280 (720p HD)' };
        case '4k':
          return { width: 2160, height: 3840, bitrate: 24000000, label: '2160×3840 (4K UHD)' };
        case '1080p':
        default:
          return { width: 1080, height: 1920, bitrate: 12000000, label: '1080×1920 (1080p FHD)' };
      }
    case '1:1':
      switch (resolution) {
        case '480p':
          return { width: 480, height: 480, bitrate: 2500000, label: '480×480 (480p)' };
        case '720p':
          return { width: 720, height: 720, bitrate: 6000000, label: '720×720 (720p HD)' };
        case '4k':
          return { width: 2160, height: 2160, bitrate: 24000000, label: '2160×2160 (4K UHD)' };
        case '1080p':
        default:
          return { width: 1080, height: 1080, bitrate: 12000000, label: '1080×1080 (1080p FHD)' };
      }
    case '4:5':
      switch (resolution) {
        case '480p':
          return { width: 480, height: 600, bitrate: 2500000, label: '480×600 (480p)' };
        case '720p':
          return { width: 720, height: 900, bitrate: 6000000, label: '720×900 (720p HD)' };
        case '4k':
          return { width: 2160, height: 2700, bitrate: 24000000, label: '2160×2700 (4K UHD)' };
        case '1080p':
        default:
          return { width: 1080, height: 1350, bitrate: 12000000, label: '1080×1350 (1080p FHD)' };
      }
    case '16:9':
    default:
      switch (resolution) {
        case '480p':
          return { width: 854, height: 480, bitrate: 2500000, label: '854×480 (480p)' };
        case '720p':
          return { width: 1280, height: 720, bitrate: 6000000, label: '1280×720 (720p HD)' };
        case '4k':
          return { width: 3840, height: 2160, bitrate: 24000000, label: '3840×2160 (4K UHD)' };
        case '1080p':
        default:
          return { width: 1920, height: 1080, bitrate: 12000000, label: '1920×1080 (1080p FHD)' };
      }
  }
}
