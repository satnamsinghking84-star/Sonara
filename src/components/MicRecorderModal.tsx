import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Check, Volume2 } from 'lucide-react';
import { AudioRecorder } from '../utils/audio';
import { formatTime } from '../utils/time';

interface MicRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecord: (file: File) => void;
  onShowToast: (msg: string) => void;
}

export const MicRecorderModal: React.FC<MicRecorderModalProps> = ({
  isOpen,
  onClose,
  onSaveRecord,
  onShowToast,
}) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const handleStart = async () => {
    try {
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
      setRecording(true);
      setElapsed(0);
      setRecordedBlob(null);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 0.1);
      }, 100);
    } catch (err) {
      onShowToast('Microphone access denied or unavailable.');
    }
  };

  const handleStop = async () => {
    if (!recorderRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const blob = await recorderRef.current.stop();
    setRecording(false);
    setRecordedBlob(blob);
  };

  const handleApply = () => {
    if (!recordedBlob) return;
    const file = new File([recordedBlob], `Mic Voiceover — ${formatTime(elapsed)}.webm`, {
      type: 'audio/webm',
    });
    onSaveRecord(file);
    onShowToast('Recorded voice track saved.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md p-6 border border-violet-500/30 rounded-2xl bg-[#12101e] shadow-2xl text-white relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-violet-500/20 text-violet-300 flex items-center justify-center border border-violet-500/30 mb-3">
          <Mic className={`w-6 h-6 ${recording ? 'text-rose-400 animate-pulse' : ''}`} />
        </div>

        <h2 className="text-base font-bold text-white mb-1">Record Live Voiceover</h2>
        <p className="text-xs text-white/50 mb-6 text-center">
          Speak into your microphone to record narrations directly.
        </p>

        {/* Timer display */}
        <div className="text-3xl font-mono font-black text-violet-300 tracking-wider mb-6">
          {formatTime(elapsed)}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {!recording ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-500/25 transition"
            >
              <Mic className="w-4 h-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop Recording</span>
            </button>
          )}

          {recordedBlob && !recording && (
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition"
            >
              <Check className="w-4 h-4" />
              <span>Use Recording</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
