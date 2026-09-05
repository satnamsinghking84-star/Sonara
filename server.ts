import { GoogleGenAI, Modality, Type } from "@google/genai";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Initialize Gemini AI client
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Helper to detect transient 503 (high demand) / 429 errors
  const isTransientError = (err: any): boolean => {
    if (!err) return false;
    const msg = String(err.message || "") + " " + JSON.stringify(err);
    return (
      err.status === 503 ||
      err.status === 429 ||
      err.code === 503 ||
      err.code === 429 ||
      msg.includes("503") ||
      msg.includes("429") ||
      msg.includes("high demand") ||
      msg.includes("UNAVAILABLE") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("temporarily") ||
      msg.includes("overloaded")
    );
  };

  // Resilient Gemini invoker with retries and model cascade fallback
  async function callGeminiWithFallback<T>(
    models: string[],
    fn: (model: string) => Promise<T>,
    retriesPerModel = 1
  ): Promise<T> {
    let lastError: any = null;
    for (const model of models) {
      for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
        try {
          return await fn(model);
        } catch (err: any) {
          lastError = err;
          const errMsg = String(err?.message || err);
          console.warn(
            `[Gemini API] Model ${model} (attempt ${attempt + 1}/${retriesPerModel + 1}) failed:`,
            errMsg
          );

          // If model is not found (404) or deprecated, skip immediately to next model in list
          if (
            err?.status === 404 ||
            err?.code === 404 ||
            errMsg.includes("404") ||
            errMsg.includes("NOT_FOUND") ||
            errMsg.includes("no longer available")
          ) {
            break;
          }

          if (isTransientError(err) && attempt < retriesPerModel) {
            const delayMs = 600 * Math.pow(1.5, attempt) + Math.random() * 200;
            await new Promise((r) => setTimeout(r, delayMs));
            continue;
          }
          break; // proceed to next model in fallback list
        }
      }
    }
    throw lastError;
  }

  // Endpoint: Generate AI Script with timed captions
  app.post("/api/ai/script", async (req, res) => {
    try {
      const { topic, tone, durationSeconds = 15 } = req.body;
      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const ai = getGenAI();
      const prompt = `You are a professional video content creator and storyteller.
Create a short, engaging video story script about: "${topic}".
Tone/Style: ${tone || "engaging and inspiring"}.
Total target duration: ${durationSeconds} seconds.

Generate between 3 to 6 logical story beats/captions.
Each caption must have a start time (in seconds), end time (in seconds), concise caption text, and a detailed description for a matching visual image/backdrop.
The sequence of start and end times must cover from 0 up to ${durationSeconds} seconds continuously without overlaps.`;

      // Cascade across fast, resilient Gemini models (gemini-3.6-flash recommended for high availability)
      const scriptModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

      const response = await callGeminiWithFallback(
        scriptModels,
        async (model) => {
          return await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Short catchy title for the video story" },
                  captions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        start: { type: Type.NUMBER, description: "Start time in seconds" },
                        end: { type: Type.NUMBER, description: "End time in seconds" },
                        text: { type: Type.STRING, description: "The caption text spoken or shown" },
                        visualPrompt: { type: Type.STRING, description: "Description of background visual" },
                      },
                      required: ["start", "end", "text"],
                    },
                  },
                },
                required: ["title", "captions"],
              },
            },
          });
        },
        1
      );

      const text = response.text || "{}";
      const data = JSON.parse(text);
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error("AI Script generation error:", err);
      const isTransient = isTransientError(err);
      const message = isTransient
        ? "AI model is temporarily experiencing high demand. Please try again in a moment."
        : err.message || "Failed to generate AI script";
      res.status(isTransient ? 503 : 500).json({ error: message, isTransient });
    }
  });

  // Endpoint: Generate TTS voiceover audio wrapped in standard WAV header
  app.post("/api/ai/tts", async (req, res) => {
    try {
      const { text, voice = "Kore" } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required for TTS" });
      }

      const ai = getGenAI();
      const response = await callGeminiWithFallback(
        ["gemini-3.1-flash-tts-preview"],
        async (model) => {
          return await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: `Say clearly with natural phrasing and feeling: ${text}` }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voice },
                },
              },
            },
          });
        },
        2
      );

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio returned from Gemini TTS");
      }

      // Wrap raw 24kHz 16-bit mono PCM into standard 44-byte WAV header so browsers handle it natively
      const pcmBuffer = Buffer.from(base64Audio, "base64");
      const sampleRate = 24000;
      const numChannels = 1;
      const bitsPerSample = 16;
      const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
      const blockAlign = (numChannels * bitsPerSample) / 8;
      const dataLength = pcmBuffer.length;

      const wavHeader = Buffer.alloc(44);
      wavHeader.write("RIFF", 0);
      wavHeader.writeUInt32LE(36 + dataLength, 4);
      wavHeader.write("WAVE", 8);
      wavHeader.write("fmt ", 12);
      wavHeader.writeUInt32LE(16, 16);
      wavHeader.writeUInt16LE(1, 20); // PCM format
      wavHeader.writeUInt16LE(numChannels, 22);
      wavHeader.writeUInt32LE(sampleRate, 24);
      wavHeader.writeUInt32LE(byteRate, 28);
      wavHeader.writeUInt16LE(blockAlign, 32);
      wavHeader.writeUInt16LE(bitsPerSample, 34);
      wavHeader.write("data", 36);
      wavHeader.writeUInt32LE(dataLength, 40);

      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      const base64Wav = wavBuffer.toString("base64");
      const duration = Number((dataLength / byteRate).toFixed(2));

      res.json({
        success: true,
        audioBase64: base64Wav,
        mimeType: "audio/wav",
        duration,
      });
    } catch (err: any) {
      console.error("TTS generation error:", err);
      const isTransient = isTransientError(err);
      const message = isTransient
        ? "AI TTS model is experiencing high demand. Please try again shortly."
        : err.message || "Failed to generate TTS audio";
      res.status(isTransient ? 503 : 500).json({ error: message, isTransient });
    }
  });

  // Endpoint: AI Audio Alignment & Time Scrap Sync
  // Uses Gemini to listen to the audio track and precisely generate or align story beats/timestamps
  app.post("/api/ai/align-audio", async (req, res) => {
    try {
      const {
        audioBase64,
        mimeType = "audio/webm",
        existingCaptions = [],
        pacing = "balanced",
        audioDuration = 0,
      } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ error: "audioBase64 is required for audio alignment" });
      }

      const ai = getGenAI();

      const existingTexts = Array.isArray(existingCaptions) && existingCaptions.length > 0
        ? existingCaptions.map((c: any) => (typeof c === "string" ? c : c.text)).filter(Boolean)
        : [];

      let prompt = `You are a professional audio-visual synchronization AI for video editing.
Your task is to analyze this voice track and align story beats ("time scraps") and visual image transitions with absolute precision.

CORE SYNCHRONIZATION RULES:
1. Every time scrap (caption) and its corresponding visual image must stay active for the EXACT duration that the voice is speaking that beat/thought.
2. The next image and next time scrap must begin at the EXACT millisecond the speaker transitions to the next sentence or thought.
3. Prevent desynchronization: Audio must NEVER run ahead of the image, and the image must NEVER switch prematurely while the voice is still speaking the previous sentence.
4. Total expected audio length: ${audioDuration ? `${audioDuration} seconds` : "derived from audio"}.
5. Pacing style: "${pacing}".
${
  pacing === "sentence"
    ? "- Break speech into distinct single sentences so imagery shifts dynamically with each statement."
    : pacing === "phrase"
    ? "- Group speech into natural conversational thoughts (approx 3 to 6 seconds per beat)."
    : "- Balanced pacing matching the speaker's natural breath breaks and vocal pauses."
}`;

      if (existingTexts.length > 0) {
        prompt += `\n\nThe user provided this script to align with the spoken voice track:
${JSON.stringify(existingTexts, null, 2)}
Map each of these lines to their exact start and end timestamps in the audio based on when the speaker actually says them.
If the audio has more speech, include it. If a line is missing, adjust timestamps cleanly so the sequence covers the speech accurately.`;
      } else {
        prompt += `\n\nNo pre-existing script was provided. Transcribe the spoken audio track accurately into coherent, engaging story beats with precise start and end timestamps.`;
      }

      prompt += `\n\nTimestamp requirements:
- "start": exact second (float, e.g. 0.0) when the speaker begins speaking this beat.
- "end": exact second (float, e.g. 3.45) when the speaker finishes speaking this beat or pauses before the next beat.
- The timestamps must cover from 0 up to the end of the voice track continuously without overlapping gaps.
- For each beat, generate a "visualPrompt" describing a cinematic, matching background visual.`;

      // Clean mimeType
      const cleanMime = (mimeType || "audio/webm").split(";")[0].trim();

      const audioPart = {
        inlineData: {
          mimeType: cleanMime,
          data: audioBase64,
        },
      };

      const alignModels = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

      let data: any = null;
      try {
        const response = await callGeminiWithFallback(
          alignModels,
          async (model) => {
            return await ai.models.generateContent({
              model,
              contents: {
                parts: [
                  audioPart,
                  { text: prompt },
                ],
              },
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    detectedDuration: { type: Type.NUMBER, description: "Total audio duration in seconds" },
                    captions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          start: { type: Type.NUMBER, description: "Start time in seconds" },
                          end: { type: Type.NUMBER, description: "End time in seconds" },
                          text: { type: Type.STRING, description: "Spoken caption text" },
                          visualPrompt: { type: Type.STRING, description: "Description of matching scene image" },
                        },
                        required: ["start", "end", "text"],
                      },
                    },
                  },
                  required: ["captions"],
                },
              },
            });
          },
          1
        );

        const text = response.text || "{}";
        data = JSON.parse(text);
      } catch (aiErr: any) {
        console.warn("All AI alignment models busy or failed, checking smart fallback...", aiErr?.message);
        // Smart fallback: if existing captions exist and duration is known, evenly apportion timestamps
        if (existingTexts.length > 0 && typeof audioDuration === "number" && audioDuration > 0) {
          const slice = audioDuration / existingTexts.length;
          const fallbackCaptions = existingTexts.map((txt: string, i: number) => ({
            start: Number((i * slice).toFixed(2)),
            end: Number(((i + 1) * slice).toFixed(2)),
            text: txt,
            visualPrompt: `Scene depicting ${txt.slice(0, 40)}`,
          }));
          return res.json({
            success: true,
            captions: fallbackCaptions,
            detectedDuration: audioDuration,
            fallbackNotice: "Timed automatically across audio duration while AI models were at peak demand.",
          });
        }
        throw aiErr;
      }
      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error("AI Audio alignment error:", err);
      const isTransient = isTransientError(err);
      const message = isTransient
        ? "AI audio analysis model is experiencing temporary high demand. Please try again shortly."
        : err.message || "Failed to align audio with Gemini AI";
      res.status(isTransient ? 503 : 500).json({ error: message, isTransient });
    }
  });

  // Vite middleware in dev mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sonora Studio server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
