import React, { useState } from 'react';
import { Sparkles, X, Loader2, Volume2, Wand2 } from 'lucide-react';
import { CaptionItem } from '../types';

interface AIScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScript: (data: {
    title: string;
    captions: CaptionItem[];
    audioBlob?: Blob;
    audioName?: string;
  }) => void;
  onShowToast: (msg: string) => void;
}

export const AIScriptModal: React.FC<AIScriptModalProps> = ({
  isOpen,
  onClose,
  onApplyScript,
  onShowToast,
}) => {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('engaging and inspiring');
  const [durationSeconds, setDurationSeconds] = useState(15);
  const [generateTts, setGenerateTts] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      onShowToast('Please enter a story topic.');
      return;
    }

    setLoading(true);
    try {
      // 1. Call Gemini AI Script Endpoint
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, tone, durationSeconds }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate AI story script');
      }

      let generatedCaptions: CaptionItem[] = (data.captions || []).map((item: any, idx: number) => ({
        id: `cap-ai-${Date.now()}-${idx}`,
        start: Number(item.start) || 0,
        end: Number(item.end) || 3,
        text: item.text || 'Caption',
        mediaIndex: idx,
        visualPrompt: item.visualPrompt,
      }));

      let audioBlob: Blob | undefined;
      let audioName: string | undefined;

      // 2. Optionally Generate Voiceover with Gemini TTS & Automatically Align Timestamps
      if (generateTts && generatedCaptions.length) {
        onShowToast('Generating AI Voiceover narration & aligning beats...');
        const fullText = generatedCaptions.map((c) => c.text).join('. ');

        let ttsData: any = null;
        try {
          const ttsRes = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: fullText, voice: 'Kore' }),
          });
          ttsData = await ttsRes.json();
        } catch (ttsNetErr) {
          console.warn('TTS network error:', ttsNetErr);
        }

        if (ttsData && ttsData.success && ttsData.audioBase64) {
          const binary = atob(ttsData.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          audioBlob = new Blob([bytes], { type: 'audio/wav' });
          audioName = `AI Voiceover — ${data.title || topic.slice(0, 20)}`;

          // Call AI audio alignment to sync timestamps precisely with the generated audio speech
          try {
            const alignRes = await fetch('/api/ai/align-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: ttsData.audioBase64,
                mimeType: 'audio/wav',
                existingCaptions: generatedCaptions,
                audioDuration: ttsData.duration,
              }),
            });
            const alignData = await alignRes.json();
            if (alignData.success && Array.isArray(alignData.captions) && alignData.captions.length) {
              generatedCaptions = alignData.captions.map((item: any, idx: number) => ({
                id: `cap-ai-${Date.now()}-${idx}`,
                start: Number(Number(item.start).toFixed(2)) || 0,
                end: Number(Number(item.end).toFixed(2)) || (Number(item.start) + 3),
                text: item.text || generatedCaptions[idx]?.text || 'Caption',
                mediaIndex: idx,
                visualPrompt: item.visualPrompt || generatedCaptions[idx]?.visualPrompt,
              }));
            } else if (ttsData.duration && generatedCaptions.length) {
              const oldMax = Math.max(...generatedCaptions.map((c) => c.end)) || 1;
              const scale = ttsData.duration / oldMax;
              generatedCaptions = generatedCaptions.map((c) => ({
                ...c,
                start: Number((c.start * scale).toFixed(2)),
                end: Number((c.end * scale).toFixed(2)),
              }));
            }
          } catch (alignErr) {
            console.warn('Auto-alignment fallback used:', alignErr);
            if (ttsData.duration && generatedCaptions.length) {
              const oldMax = Math.max(...generatedCaptions.map((c) => c.end)) || 1;
              const scale = ttsData.duration / oldMax;
              generatedCaptions = generatedCaptions.map((c) => ({
                ...c,
                start: Number((c.start * scale).toFixed(2)),
                end: Number((c.end * scale).toFixed(2)),
              }));
            }
          }
        } else if (generateTts) {
          onShowToast('Script created! (Voiceover skipped due to temporary model demand)');
        }
      }

      onApplyScript({
        title: data.title || topic,
        captions: generatedCaptions,
        audioBlob,
        audioName,
      });

      onShowToast('AI Story script generated successfully!');
      onClose();
    } catch (err: any) {
      console.error(err);
      onShowToast(err.message || 'AI generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg p-6 border border-amber-500/30 rounded-2xl bg-[#12101e] shadow-2xl text-white relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Story & Script Generator</h2>
            <p className="text-xs text-white/50">Powered by Gemini 3.8 Flash & Gemini TTS with Smart Failover</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          {/* Topic */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-white/80">Story Topic or Concept</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 3 habit hacks for deep focus, or Cyberpunk city story..."
              className="w-full bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
            />
          </div>

          {/* Preset Topics */}
          <div className="flex flex-wrap gap-1.5">
            {[
              '5 mind-blowing space facts',
              'Daily morning motivation',
              'Tech story: AI revolutions',
              'Zen mindfulness tips',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTopic(preset)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Tone & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="bg-black/50 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
              >
                <option value="engaging and inspiring">Inspiring & Upbeat</option>
                <option value="dramatic cinematic">Dramatic & Cinematic</option>
                <option value="educational fascinating">Educational & Clear</option>
                <option value="energetic viral shorts">Energetic Viral Shorts</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">
                Duration ({durationSeconds}s)
              </label>
              <input
                type="range"
                min={10}
                max={45}
                step={5}
                value={durationSeconds}
                onChange={(e) => setDurationSeconds(Number(e.target.value))}
                className="accent-amber-400 cursor-pointer h-1.5 my-auto"
              />
            </div>
          </div>

          {/* TTS Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={generateTts}
              onChange={(e) => setGenerateTts(e.target.checked)}
              className="w-4 h-4 rounded accent-amber-400"
            />
            <span className="text-xs text-white/80 font-medium flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
              Auto-generate AI voiceover narration track
            </span>
          </label>

          {/* Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Crafting AI Story & Captions...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Story & Captions</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
