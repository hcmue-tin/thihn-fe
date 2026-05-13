import type { ReactElement } from "react";

/**
 * Parse rich-text content that may contain `<b>`, `<i>`, `<u>` tags
 * (and their aliases `<strong>`, `<em>`) and return React elements.
 *
 * Also handles legacy `**bold**` markers for backward compatibility.
 *
 * Only the allowed formatting tags are rendered — everything else is
 * treated as plain text for safety.
 */
export const renderRichText = (text: string): string | ReactElement[] => {
  if (!text) return text;

  // Quick exit: no formatting at all
  const hasHtmlTags = /<\/?(?:b|strong|i|em|u)\b/i.test(text);
  const hasLegacyMarkers = text.includes("**");
  if (!hasHtmlTags && !hasLegacyMarkers) return text;

  // Convert legacy **markers** to <b> tags
  let html = text;
  if (hasLegacyMarkers) {
    html = html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }

  // Parse via DOM for safety
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  let key = 0;
  const walkNodes = (nodes: NodeListOf<ChildNode>): (string | ReactElement)[] => {
    const result: (string | ReactElement)[] = [];

    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent ?? "";
        if (t) result.push(t);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const children = walkNodes(el.childNodes);
      const k = key++;

      if (tag === "b" || tag === "strong") {
        result.push(<strong style={{ fontWeight: 800 }} key={`b-${k}`}>{children}</strong>);
      } else if (tag === "i" || tag === "em") {
        result.push(<em style={{ fontStyle: "italic" }} key={`i-${k}`}>{children}</em>);
      } else if (tag === "u") {
        result.push(<u style={{ textDecoration: "underline" }} key={`u-${k}`}>{children}</u>);
      } else {
        // Unknown tag → render inner content as plain text
        result.push(...children);
      }
    });

    return result;
  };

  const elements = walkNodes(tmp.childNodes);
  if (elements.length === 0) return text;

  // If everything resolved to a single string, return it directly
  if (elements.length === 1 && typeof elements[0] === "string") {
    return elements[0];
  }

  return elements as ReactElement[];
};

/**
 * Backward-compatible alias.
 * @deprecated Use `renderRichText` instead.
 */
export const renderBoldText = renderRichText;
