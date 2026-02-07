export interface HighlightSegment {
  text: string;
  highlighted: boolean;
}

/**
 * Splits a text into segments by ==highlight== markers.
 * - "==...==" will be returned as { highlighted: true, text: "..." }
 * - Everything else is returned as { highlighted: false, text: "..." }
 */
export function splitHighlights(text: string): HighlightSegment[] {
  if (!text) return [];

  const segments: HighlightSegment[] = [];
  const re = /==([^=]+)==/g;
  let lastIndex = 0;

  for (;;) {
    const match = re.exec(text);
    if (!match) break;

    const start = match.index;
    const end = start + match[0].length;

    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), highlighted: false });
    }

    const inner = match[1] ?? "";
    segments.push({ text: inner, highlighted: true });

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments;
}

