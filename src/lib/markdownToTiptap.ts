/**
 * Utility to convert basic Markdown string to Tiptap JSON format.
 * This is a lightweight parser for common AI-generated summary patterns.
 */
export function markdownToTiptap(markdown: string) {
  const lines = markdown.split('\n');
  const content: any[] = [];
  let currentList: { type: 'bulletList' | 'orderedList'; items: any[] } | null = null;

  const flushList = () => {
    if (currentList) {
      content.push({
        type: currentList.type,
        content: currentList.items,
      });
      currentList = null;
    }
  };

  const parseInlineFormatting = (text: string) => {
    // Basic bold parser: **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return {
          type: 'text',
          marks: [{ type: 'bold' }],
          text: part.slice(2, -2)
        };
      }
      return { type: 'text', text: part };
    }).filter(p => p.text);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      content.push({
        type: 'heading',
        attrs: { level: headingMatch[1].length },
        content: parseInlineFormatting(headingMatch[2]),
      });
      continue;
    }

    // Bullet Lists
    const bulletMatch = line.match(/^[\*\-•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'bulletList') {
        flushList();
        currentList = { type: 'bulletList', items: [] };
      }
      currentList.items.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInlineFormatting(bulletMatch[1]) }],
      });
      continue;
    }

    // Ordered Lists
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'orderedList') {
        flushList();
        currentList = { type: 'orderedList', items: [] };
      }
      currentList.items.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: parseInlineFormatting(orderedMatch[2]) }],
      });
      continue;
    }

    // Regular paragraphs
    flushList();
    content.push({
      type: 'paragraph',
      content: parseInlineFormatting(line),
    });
  }

  flushList();

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}
