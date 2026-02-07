
import { decodeHtml } from "@/lib/utils";
import { splitHighlights } from "@/lib/highlight";

interface RichTextViewProps {
  text: string;
  className?: string;
}

export function RichTextView({ text, className }: RichTextViewProps) {
  if (!text) return null;

  const decoded = decodeHtml(text);
  
  // 1. Split by newlines to handle paragraphs if needed, but whitespace-pre-wrap usually handles it.
  // We'll stick to rendering the whole block but processing segments.
  // processing order:
  // 1. Highlight splitting (==...==)
  // 2. For each non-highlighted segment, look for Markdown links [text](url)
  // 3. For remaining text, look for raw URLs
  
  // To keep it simple and robust:
  // We can use a regex that matches ALL patterns of interest:
  // 1. ==highlight==
  // 2. [label](url)
  // 3. https://...
  
  // Regex Notes:
  // Highlight: /==([^=]+)==/
  // MD Link: /\[([^\]]+)\]\(([^)]+)\)/
  // URL: /(https?:\/\/[^\s]+)/  (simple version)

  const parts = parseRichText(decoded);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === 'highlight') {
          return (
            <span key={i} className="bg-yellow-200 px-1 rounded-sm font-medium text-gray-900 mx-0.5">
              {part.content}
            </span>
          );
        } else if (part.type === 'link') {
          return (
            <a 
              key={i} 
              href={part.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline break-all"
            >
              {part.content}
            </a>
          );
        } else {
          return <span key={i}>{part.content}</span>;
        }
      })}
    </span>
  );
}

type TextPart = 
  | { type: 'text'; content: string }
  | { type: 'highlight'; content: string }
  | { type: 'link'; content: string; url: string };

function parseRichText(text: string): TextPart[] {
  const parts: TextPart[] = [];
  
  // Combine regex: (Highlight)|(MDLink)|(URL)
  // Capture groups:
  // 1: Highlight content
  // 2: MD Link text
  // 3: MD Link url
  // 4: Raw URL
  const regex = /==([^=]+)==|\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s]+)/g;
  
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    
    // Push preceding text
    if (start > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, start) });
    }

    if (match[1]) { // Highlight
      parts.push({ type: 'highlight', content: match[1] });
    } else if (match[2] && match[3]) { // MD Link
      parts.push({ type: 'link', content: match[2], url: match[3] });
    } else if (match[4]) { // Raw URL
      parts.push({ type: 'link', content: match[4], url: match[4] });
    }

    lastIndex = regex.lastIndex;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}
