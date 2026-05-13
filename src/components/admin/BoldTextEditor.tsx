import { useCallback, useEffect, useRef, useState } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  minRows?: number;
};

/* ── helpers ── */

/**
 * Convert legacy `**bold**` markers into `<b>` tags so old content
 * displays correctly in the editor.
 */
const legacyMarkersToHtml = (text: string): string =>
  text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/**
 * Convert stored value to editor HTML.
 */
const valueToHtml = (text: string): string => {
  if (!text) return "";
  // If value already has HTML formatting tags, keep them
  if (/<\/?(?:b|strong|i|em|u)\b/i.test(text)) {
    return text.replace(/\n/g, "<br>");
  }
  // Otherwise escape and convert legacy markers
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return legacyMarkersToHtml(escaped).replace(/\n/g, "<br>");
};

/**
 * Sanitize HTML from contentEditable — keep only b/i/u tags.
 */
const sanitizeHtml = (html: string): string => {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const inner = Array.from(el.childNodes).map(walk).join("");

    if (tag === "strong" || tag === "b") return `<b>${inner}</b>`;
    if (tag === "em" || tag === "i") return `<i>${inner}</i>`;
    if (tag === "u") return `<u>${inner}</u>`;
    if (tag === "br") return "\n";
    if (tag === "div" || tag === "p") {
      const prev = el.previousSibling;
      return prev ? `\n${inner}` : inner;
    }
    return inner;
  };

  return Array.from(tmp.childNodes)
    .map(walk)
    .join("")
    .replace(/\n$/, "");
};

/**
 * Wrap the current selection in a formatting tag.
 * Only works when text is actually selected — does nothing otherwise.
 * After wrapping, the cursor is placed right after the formatted text,
 * outside the formatting element, so subsequent typing is unformatted.
 */
const wrapSelection = (tag: string): boolean => {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return false;

  const range = sel.getRangeAt(0);
  const selectedText = range.toString();
  if (!selectedText) return false;

  // Check if the selection is already wrapped in this tag
  const parent = range.commonAncestorContainer.parentElement;
  if (parent && parent.tagName.toLowerCase() === tag) {
    // Unwrap: replace the parent element with its text content
    const textNode = document.createTextNode(parent.textContent ?? "");
    parent.replaceWith(textNode);
    // Place cursor after the text
    const newRange = document.createRange();
    newRange.setStartAfter(textNode);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    return true;
  }

  // Wrap selection in the tag
  const wrapper = document.createElement(tag);
  range.surroundContents(wrapper);

  // Move cursor AFTER the wrapper element so next typing is normal
  const afterRange = document.createRange();
  afterRange.setStartAfter(wrapper);
  afterRange.collapse(true);

  // Insert a zero-width space to ensure the cursor is truly outside
  // the formatting element (prevents IME from inheriting the style)
  const zws = document.createTextNode("\u200B");
  afterRange.insertNode(zws);
  afterRange.setStartAfter(zws);
  afterRange.collapse(true);

  sel.removeAllRanges();
  sel.addRange(afterRange);

  return true;
};

/**
 * WYSIWYG text editor with **B**, *I*, _U_ toolbar buttons.
 *
 * Formatting only applies to selected text — the user must:
 * 1. Type text
 * 2. Select words to format
 * 3. Click B / I / U
 *
 * This avoids contentEditable + IME bugs with Vietnamese input.
 */
export const BoldTextEditor = ({
  label = "Nội dung câu hỏi",
  value,
  onChange,
  minRows = 3
}: Props) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastValueRef = useRef(value);
  const [hint, setHint] = useState("");
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  /**
   * Check which formatting tags the cursor is currently inside
   * and update the activeFormats state.
   */
  const detectActiveFormats = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) {
      setActiveFormats(new Set());
      return;
    }
    const formats = new Set<string>();
    let node: Node | null = sel.anchorNode;
    while (node && node !== el) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName.toLowerCase();
        if (tag === "b" || tag === "strong") formats.add("b");
        if (tag === "i" || tag === "em") formats.add("i");
        if (tag === "u") formats.add("u");
      }
      node = node.parentNode;
    }
    setActiveFormats(formats);
  }, []);

  // Listen for selection changes to update active format indicators
  useEffect(() => {
    const onSelChange = () => {
      const el = editorRef.current;
      if (!el) return;
      // Only detect if the editor is focused
      if (el.contains(document.activeElement) || document.activeElement === el) {
        detectActiveFormats();
      }
    };
    document.addEventListener("selectionchange", onSelChange);
    return () => document.removeEventListener("selectionchange", onSelChange);
  }, [detectActiveFormats]);

  // Sync external value → editor (only when changed from outside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;

    const sel = window.getSelection();
    const hadFocus = document.activeElement === el;
    el.innerHTML = valueToHtml(value);
    if (hadFocus && sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [value]);

  // Populate on mount
  useEffect(() => {
    const el = editorRef.current;
    if (el && !el.innerHTML) {
      el.innerHTML = valueToHtml(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncToParent = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    // Clean up any remaining zero-width spaces from the stored value
    const raw = sanitizeHtml(el.innerHTML);
    const cleaned = raw.replace(/\u200B/g, "");
    lastValueRef.current = cleaned;
    onChange(cleaned);
  }, [onChange]);

  const handleInput = useCallback(() => {
    syncToParent();
  }, [syncToParent]);

  const applyFormat = useCallback(
    (tag: string, label: string) => {
      const el = editorRef.current;
      if (!el) return;

      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      // Make sure we're inside our editor
      if (!el.contains(sel.anchorNode)) return;

      const isCollapsed = sel.isCollapsed;
      
      // If no text is selected and they aren't inside any formatting,
      // and they try to turn ON formatting, we show a hint to select text first.
      // This enforces the "select first" rule for turning ON formatting,
      // but allows turning OFF formatting without selection.
      if (isCollapsed) {
        let insideFormat = false;
        let node: Node | null = sel.anchorNode;
        while (node && node !== el) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const t = (node as HTMLElement).tagName.toLowerCase();
            if (t === tag || (tag === "b" && t === "strong") || (tag === "i" && t === "em")) {
              insideFormat = true;
              break;
            }
          }
          node = node.parentNode;
        }

        if (!insideFormat) {
          setHint(`Chọn chữ cần ${label} trước`);
          setTimeout(() => setHint(""), 2000);
          return;
        }
      }

      el.focus();
      
      let command = tag;
      if (tag === "b") command = "bold";
      if (tag === "i") command = "italic";
      if (tag === "u") command = "underline";

      // Native execCommand natively handles splitting tags when turning off formatting
      document.execCommand(command, false);

      if (isCollapsed) {
        // ZWS hack for IME: after turning OFF formatting on an empty selection,
        // inserting a zero-width space forces the browser's IME composition to stay
        // in the newly created text context rather than jumping back into the tag.
        document.execCommand("insertText", false, "\u200B");
      }

      syncToParent();
      detectActiveFormats();
    },
    [detectActiveFormats, syncToParent]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Intercept Ctrl+B/I/U to use our own logic instead of browser default
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        applyFormat("b", "in đậm");
      } else if (key === "i") {
        e.preventDefault();
        applyFormat("i", "in nghiêng");
      } else if (key === "u") {
        e.preventDefault();
        applyFormat("u", "gạch chân");
      }
    },
    [applyFormat]
  );

  const toolbarButtons = [
    { tag: "b", label: "in đậm", icon: <FormatBoldRoundedIcon fontSize="small" />, tip: "In đậm" },
    { tag: "i", label: "in nghiêng", icon: <FormatItalicRoundedIcon fontSize="small" />, tip: "In nghiêng" },
    { tag: "u", label: "gạch chân", icon: <FormatUnderlinedRoundedIcon fontSize="small" />, tip: "Gạch chân" }
  ];

  return (
    <Box>
      {/* Label */}
      <Box sx={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600, mb: 0.5 }}>
        {label}
      </Box>

      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          px: 0.75,
          py: 0.35,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          border: "1px solid rgba(26,140,142,0.25)",
          borderBottom: "none",
          bgcolor: "rgba(26,140,142,0.04)"
        }}
      >
        {toolbarButtons.map((btn) => {
          const isActive = activeFormats.has(btn.tag);
          return (
            <Tooltip key={btn.tag} title={isActive ? `Đang ${btn.label}` : btn.tip} arrow>
              <IconButton
                size="small"
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyFormat(btn.tag, btn.label);
                }}
                sx={{
                  borderRadius: 1,
                  px: 0.6,
                  py: 0.3,
                  color: isActive ? "#fff" : "#0F6B6D",
                  bgcolor: isActive ? "#1A8C8E" : "transparent",
                  "&:hover": {
                    bgcolor: isActive ? "#0F6B6D" : "rgba(26,140,142,0.12)"
                  }
                }}
              >
                {btn.icon}
              </IconButton>
            </Tooltip>
          );
        })}
        {hint && (
          <Typography
            variant="caption"
            sx={{
              ml: 1,
              color: "#D97706",
              fontWeight: 600,
              animation: "fadeIn 0.2s ease",
              "@keyframes fadeIn": { from: { opacity: 0 }, to: { opacity: 1 } }
            }}
          >
            {hint}
          </Typography>
        )}
      </Box>

      {/* Editable area */}
      <Box
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        sx={{
          minHeight: `${(minRows ?? 3) * 1.5}em`,
          px: 1.5,
          py: 1,
          border: "1px solid rgba(26,140,142,0.25)",
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          outline: "none",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          color: "#1A3A4A",
          bgcolor: "#fff",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowY: "auto",
          maxHeight: "16rem",
          cursor: "text",
          "&:focus": {
            borderColor: "#1A8C8E",
            boxShadow: "0 0 0 2px rgba(26,140,142,0.15)"
          },
          "&:empty::before": {
            content: '"Nhập nội dung câu hỏi..."',
            color: "#94A3B8",
            pointerEvents: "none"
          },
          "& strong, & b": { fontWeight: 800, color: "#0F172A" },
          "& em, & i": { fontStyle: "italic" },
          "& u": { textDecoration: "underline" }
        }}
      />
    </Box>
  );
};
