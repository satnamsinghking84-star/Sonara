import { CaptionItem } from '../types';

export function formatTime(value: number): string {
  const safe = Math.max(0, Number(value) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimeMs(value: number): string {
  const safe = Math.max(0, Number(value) || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function parseTimestamp(str: string): number | null {
  const clean = str.trim().replace(',', '.');
  const match = clean.match(/(?:(?:(\d+):)?(\d{1,2}):)?(\d{1,2})(?:\.(\d{1,3}))?/);
  if (!match) return null;

  const hours = Number(match[1] || 0);
  const mins = Number(match[2] || 0);
  const secs = Number(match[3] || 0);
  const msStr = (match[4] || '0').padEnd(3, '0').slice(0, 3);
  const ms = Number(msStr) / 1000;

  return hours * 3600 + mins * 60 + secs + ms;
}

export function parseSubtitleFile(content: string): CaptionItem[] {
  return parseScriptOrSubtitleText(content);
}

export function parseScriptOrSubtitleText(
  content: string,
  defaultSecsPerPart: number = 3.0,
  splitMode: 'auto' | 'sentence' | 'words' = 'auto'
): CaptionItem[] {
  if (!content.trim()) return [];

  const rawLines = content.replace(/\r/g, '').split('\n');

  // 1. Check if standard SRT/VTT format (has '-->')
  const isSrtOrVtt = rawLines.some((l) => l.includes('-->'));
  if (isSrtOrVtt) {
    const captions: CaptionItem[] = [];
    let i = 0;
    while (i < rawLines.length) {
      const line = rawLines[i].trim();
      if (!line || line.startsWith('WEBVTT') || line.startsWith('NOTE')) {
        i++;
        continue;
      }

      const timeMatch = line.match(
        /(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?)/
      );

      if (timeMatch) {
        const start = parseTimestamp(timeMatch[1]);
        const end = parseTimestamp(timeMatch[2]);

        if (start !== null && end !== null && end > start) {
          const textLines: string[] = [];
          i++;
          while (i < rawLines.length) {
            const rawText = rawLines[i].trim();
            if (!rawText) break;
            if (rawText.includes('-->')) break;

            // Check if this line is just an index number before the next timestamp
            if (
              /^\d+$/.test(rawText) &&
              i + 1 < rawLines.length &&
              rawLines[i + 1].includes('-->')
            ) {
              break;
            }

            textLines.push(rawText);
            i++;
          }

          captions.push({
            id: `cap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            start: Number(start.toFixed(3)),
            end: Number(end.toFixed(3)),
            text: textLines.join(' ') || 'Caption text',
            mediaIndex: captions.length,
          });
          continue;
        }
      }
      i++;
    }
    if (captions.length > 0) return captions;
  }

  // 2. Check for bracketed or prefixed timestamp lines: e.g. "[00:02.50] Hello" or "00:05 - Text"
  const timestampedItems: { start: number; text: string }[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const bracketMatch = trimmed.match(/^[\[\(]?(\d{1,2}:\d{2}(?:\.\d{1,3})?)[\]\)]?\s*[-:]?\s*(.+)$/);
    if (bracketMatch) {
      const startSecs = parseTimestamp(bracketMatch[1]);
      if (startSecs !== null) {
        timestampedItems.push({ start: startSecs, text: bracketMatch[2].trim() });
      }
    }
  }

  if (timestampedItems.length > 0) {
    const captions: CaptionItem[] = [];
    timestampedItems.sort((a, b) => a.start - b.start);

    for (let idx = 0; idx < timestampedItems.length; idx++) {
      const current = timestampedItems[idx];
      const next = timestampedItems[idx + 1];
      const start = current.start;
      const end = next ? next.start : start + defaultSecsPerPart;

      captions.push({
        id: `cap-ts-${Date.now()}-${idx}`,
        start: Number(start.toFixed(2)),
        end: Number(Math.max(start + 0.5, end).toFixed(2)),
        text: current.text,
        mediaIndex: idx,
      });
    }
    return captions;
  }

  // 3. Raw plain text script: Split into parts & auto-generate timestamps
  let textSegments: string[] = [];

  if (splitMode === 'words') {
    // Split into 6-word parts
    const words = content.trim().split(/\s+/);
    const chunkSize = 6;
    for (let i = 0; i < words.length; i += chunkSize) {
      textSegments.push(words.slice(i, i + chunkSize).join(' '));
    }
  } else {
    // Split by lines or sentence punctuation (. ! ?)
    const rawParagraphs = content
      .replace(/\r/g, '')
      .split(/\n+|\. |\! |\? /)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    textSegments = rawParagraphs;
  }

  if (!textSegments.length) return [];

  let currentTimePointer = 0;
  const captions: CaptionItem[] = [];

  textSegments.forEach((text, idx) => {
    // Auto calculate duration based on word count if defaultSecsPerPart is around 3.0s
    const wordCount = text.split(/\s+/).length;
    const dynamicSecs = Math.max(1.8, Math.min(8.0, wordCount * 0.45));
    const duration = defaultSecsPerPart > 0 ? defaultSecsPerPart : dynamicSecs;

    const start = Number(currentTimePointer.toFixed(2));
    const end = Number((currentTimePointer + duration).toFixed(2));

    captions.push({
      id: `cap-script-${Date.now()}-${idx}`,
      start,
      end,
      text,
      mediaIndex: idx,
    });

    currentTimePointer += duration;
  });

  return captions;
}

export function exportToSRT(captions: CaptionItem[]): string {
  function toSrtTime(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  return captions
    .sort((a, b) => a.start - b.start)
    .map((cap, index) => {
      return `${index + 1}\n${toSrtTime(cap.start)} --> ${toSrtTime(cap.end)}\n${cap.text}\n`;
    })
    .join('\n');
}
