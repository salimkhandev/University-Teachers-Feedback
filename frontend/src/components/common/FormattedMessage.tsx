import React from 'react';

interface Props {
  content: string;
}

const renderInline = (text: string): React.ReactNode[] => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    const isBold = part.startsWith('**') && part.endsWith('**') && part.length > 4;
    if (!isBold) return <React.Fragment key={idx}>{part}</React.Fragment>;
    return <strong key={idx}>{part.slice(2, -2)}</strong>;
  });
};

export default function FormattedMessage({ content }: Props) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }

      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-5 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap">
        {renderInline(lines[i])}
      </p>
    );
    i += 1;
  }

  return <div className="space-y-2">{elements}</div>;
}
