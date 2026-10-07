import { OutputData } from "@editorjs/editorjs";
import { JSONContent } from "@tiptap/core";

/**
 * Converts EditorJS OutputData format to TipTap JSONContent format
 * for backward compatibility with existing documents
 */
export function editorJSToTipTap(editorJSData: OutputData | null): JSONContent | null {
  if (!editorJSData || !editorJSData.blocks || editorJSData.blocks.length === 0) {
    return null;
  }

  const content: JSONContent[] = [];

  editorJSData.blocks.forEach((block) => {
    switch (block.type) {
      case "paragraph":
        content.push({
          type: "paragraph",
          content: parseInlineContent(block.data.text || ""),
        });
        break;

      case "header":
        content.push({
          type: "heading",
          attrs: { level: block.data.level || 2 },
          content: parseInlineContent(block.data.text || ""),
        });
        break;

      case "list":
        const listType = block.data.style === "ordered" ? "orderedList" : "bulletList";
        content.push({
          type: listType,
          content: (block.data.items || []).map((item: string | { content: string; items?: any[] }) => ({
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: parseInlineContent(typeof item === "string" ? item : item.content || ""),
              },
            ],
          })),
        });
        break;

      case "checklist":
        content.push({
          type: "taskList",
          content: (block.data.items || []).map((item: { text: string; checked: boolean }) => ({
            type: "taskItem",
            attrs: { checked: item.checked || false },
            content: [
              {
                type: "paragraph",
                content: parseInlineContent(item.text || ""),
              },
            ],
          })),
        });
        break;

      case "quote":
        content.push({
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: parseInlineContent(block.data.text || ""),
            },
            ...(block.data.caption
              ? [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: `— ${block.data.caption}`, marks: [{ type: "italic" }] }],
                  },
                ]
              : []),
          ],
        });
        break;

      case "code":
        content.push({
          type: "codeBlock",
          attrs: { language: block.data.language || null },
          content: [{ type: "text", text: block.data.code || "" }],
        });
        break;

      case "delimiter":
        content.push({
          type: "horizontalRule",
        });
        break;

      case "warning":
        content.push({
          type: "callout",
          attrs: { type: "warning" },
          content: [
            {
              type: "paragraph",
              content: [
                ...(block.data.title ? [{ type: "text", text: block.data.title, marks: [{ type: "bold" }] }] : []),
                ...(block.data.title && block.data.message ? [{ type: "text", text: ": " }] : []),
                ...(block.data.message ? [{ type: "text", text: block.data.message }] : []),
              ],
            },
          ],
        });
        break;

      case "table":
        if (block.data.content && Array.isArray(block.data.content)) {
          content.push({
            type: "table",
            content: block.data.content.map((row: string[], rowIndex: number) => ({
              type: "tableRow",
              content: row.map((cell: string) => ({
                type: rowIndex === 0 && block.data.withHeadings ? "tableHeader" : "tableCell",
                content: [
                  {
                    type: "paragraph",
                    content: parseInlineContent(cell || ""),
                  },
                ],
              })),
            })),
          });
        }
        break;

      case "image":
        if (block.data.file?.url) {
          content.push({
            type: "image",
            attrs: {
              src: block.data.file.url,
              alt: block.data.caption || "",
              title: block.data.caption || "",
            },
          });
        }
        break;

      default:
        // Fallback for unknown blocks - try to extract text
        if (block.data?.text) {
          content.push({
            type: "paragraph",
            content: parseInlineContent(block.data.text),
          });
        }
    }
  });

  return {
    type: "doc",
    content: content.length > 0 ? content : [{ type: "paragraph" }],
  };
}

/**
 * Parses HTML-like inline content from EditorJS to TipTap format
 */
function parseInlineContent(html: string): JSONContent[] {
  if (!html || html.trim() === "") {
    return [];
  }

  // Simple HTML tag parser for inline formatting
  const result: JSONContent[] = [];
  
  // Create a temporary element to parse HTML
  const temp = document.createElement("div");
  temp.innerHTML = html;

  const processNode = (node: Node): JSONContent[] => {
    const items: JSONContent[] = [];

    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || "";
        if (text) {
          items.push({ type: "text", text });
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();
        const marks: { type: string; attrs?: any }[] = [];

        // Collect marks based on tag
        if (tagName === "b" || tagName === "strong") {
          marks.push({ type: "bold" });
        }
        if (tagName === "i" || tagName === "em") {
          marks.push({ type: "italic" });
        }
        if (tagName === "u") {
          marks.push({ type: "underline" });
        }
        if (tagName === "s" || tagName === "strike" || tagName === "del") {
          marks.push({ type: "strike" });
        }
        if (tagName === "code") {
          marks.push({ type: "code" });
        }
        if (tagName === "mark") {
          marks.push({ type: "highlight" });
        }
        if (tagName === "a") {
          marks.push({ type: "link", attrs: { href: element.getAttribute("href") || "" } });
        }

        // Process children and apply marks
        const childContent = processNode(element);
        childContent.forEach((item) => {
          if (item.type === "text") {
            items.push({
              ...item,
              marks: [...(item.marks || []), ...marks],
            });
          } else {
            items.push(item);
          }
        });
      }
    });

    return items;
  };

  return processNode(temp);
}

/**
 * Converts TipTap JSONContent format to EditorJS OutputData format
 * for backward compatibility when saving
 */
export function tipTapToEditorJS(tipTapData: JSONContent | null): OutputData | null {
  if (!tipTapData || !tipTapData.content) {
    return null;
  }

  const blocks: any[] = [];

  tipTapData.content.forEach((node) => {
    switch (node.type) {
      case "paragraph":
        blocks.push({
          type: "paragraph",
          data: { text: contentToHtml(node.content) },
        });
        break;

      case "heading":
        blocks.push({
          type: "header",
          data: {
            text: contentToHtml(node.content),
            level: node.attrs?.level || 2,
          },
        });
        break;

      case "bulletList":
        blocks.push({
          type: "list",
          data: {
            style: "unordered",
            items: extractListItems(node.content),
          },
        });
        break;

      case "orderedList":
        blocks.push({
          type: "list",
          data: {
            style: "ordered",
            items: extractListItems(node.content),
          },
        });
        break;

      case "taskList":
        blocks.push({
          type: "checklist",
          data: {
            items: (node.content || []).map((item) => ({
              text: contentToHtml(item.content?.[0]?.content),
              checked: item.attrs?.checked || false,
            })),
          },
        });
        break;

      case "blockquote":
        const quoteTexts = (node.content || [])
          .map((p) => contentToHtml(p.content))
          .filter(Boolean);
        blocks.push({
          type: "quote",
          data: {
            text: quoteTexts[0] || "",
            caption: quoteTexts[1]?.replace(/^— /, "") || "",
          },
        });
        break;

      case "codeBlock":
        blocks.push({
          type: "code",
          data: {
            code: node.content?.[0]?.text || "",
            language: node.attrs?.language || "",
          },
        });
        break;

      case "horizontalRule":
        blocks.push({
          type: "delimiter",
          data: {},
        });
        break;

      case "callout":
        blocks.push({
          type: "warning",
          data: {
            title: "",
            message: contentToHtml(node.content?.[0]?.content),
          },
        });
        break;

      case "table":
        blocks.push({
          type: "table",
          data: {
            withHeadings: node.content?.[0]?.content?.[0]?.type === "tableHeader",
            content: (node.content || []).map((row) =>
              (row.content || []).map((cell) =>
                contentToHtml(cell.content?.[0]?.content)
              )
            ),
          },
        });
        break;

      case "image":
        blocks.push({
          type: "image",
          data: {
            file: { url: node.attrs?.src || "" },
            caption: node.attrs?.alt || "",
          },
        });
        break;
    }
  });

  return {
    time: Date.now(),
    blocks,
    version: "2.28.0",
  };
}

function extractListItems(content: JSONContent[] | undefined): string[] {
  if (!content) return [];
  return content.map((item) => {
    if (item.type === "listItem" && item.content) {
      return contentToHtml(item.content[0]?.content);
    }
    return "";
  });
}

function contentToHtml(content: JSONContent[] | undefined): string {
  if (!content) return "";

  return content
    .map((node) => {
      if (node.type === "text") {
        let text = node.text || "";
        const marks = node.marks || [];

        marks.forEach((mark) => {
          switch (mark.type) {
            case "bold":
              text = `<b>${text}</b>`;
              break;
            case "italic":
              text = `<i>${text}</i>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "highlight":
              text = `<mark>${text}</mark>`;
              break;
            case "link":
              text = `<a href="${mark.attrs?.href || ""}">${text}</a>`;
              break;
          }
        });

        return text;
      }
      return "";
    })
    .join("");
}

/**
 * Detects if content is in EditorJS format (has blocks array)
 */
export function isEditorJSFormat(content: any): content is OutputData {
  return content && typeof content === "object" && Array.isArray(content.blocks);
}

/**
 * Detects if content is in TipTap format (has type: "doc")
 */
export function isTipTapFormat(content: any): content is JSONContent {
  return content && typeof content === "object" && content.type === "doc" && Array.isArray(content.content);
}

/**
 * Ensures content is in TipTap format, converting if necessary
 */
export function ensureTipTapFormat(content: any): JSONContent | null {
  if (!content) return null;

  // 1. Si viene como string, intentar deserializarlo
  let parsed = content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (!trimmed) return null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Si no es JSON válido (ej. texto plano o markdown importado), convertir por líneas
      const lines = trimmed.split("\n").filter(Boolean);
      return {
        type: "doc",
        content: lines.map((line) => ({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        })),
      };
    }
  }

  // 2. Si ya es formato TipTap doc válido
  if (isTipTapFormat(parsed)) return parsed;

  // 3. Si viene como un objeto doc con content pero faltaba array
  if (parsed && typeof parsed === "object" && parsed.type === "doc") {
    return {
      type: "doc",
      content: Array.isArray(parsed.content) ? parsed.content : [{ type: "paragraph" }],
    };
  }

  // 4. Si es un array de nodos TipTap directos
  if (Array.isArray(parsed)) {
    return {
      type: "doc",
      content: parsed.length > 0 ? parsed : [{ type: "paragraph" }],
    };
  }

  // 5. Si es formato EditorJS
  if (isEditorJSFormat(parsed)) return editorJSToTipTap(parsed);

  return null;
}

