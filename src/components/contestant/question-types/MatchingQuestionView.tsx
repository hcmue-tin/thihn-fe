import { Button, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { parseMatchingContent } from "../../admin/matchingEditorUtils";

type Props = {
  content: string;
  fillText: string;
  locked: boolean;
  onFillTextChange: (value: string) => void;
};

export const MatchingQuestionView = ({ content, fillText, locked, onFillTextChange }: Props) => {
  const [selectedLeftKey, setSelectedLeftKey] = useState<string>("");
  const [selectedRightKey, setSelectedRightKey] = useState<string>("");

  const parsed = useMemo(() => parseMatchingContent(content), [content]);
  const leftItems = useMemo(
    () =>
      parsed.left.length > 0
        ? parsed.left.map((text, idx) => ({ key: String(idx + 1), text }))
        : Array.from(new Set((content.match(/\((\d+)\)/g) || []).map((v) => v.replace(/[()]/g, "")))).map((key) => ({
            key,
            text: ""
          })),
    [content, parsed.left]
  );
  const rightItems = useMemo(
    () =>
      parsed.right.length > 0
        ? parsed.right.map((text, idx) => ({ key: String.fromCharCode(65 + idx), text }))
        : Array.from(new Set((content.match(/\b([A-Z])\./g) || []).map((v) => v.replace(".", "")))).map((key) => ({
            key,
            text: ""
          })),
    [content, parsed.right]
  );
  const leftKeys = leftItems.map((item) => item.key);
  const rightKeys = rightItems.map((item) => item.key);
  const matchingPairs = useMemo(
    () =>
      fillText
        .split(";")
        .map((item) => item.trim().replace(/\./g, ":"))
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, item) => {
          const [l, r] = item.split(":").map((s) => s.trim());
          if (l && r) acc[l] = r.toUpperCase();
          return acc;
        }, {}),
    [fillText]
  );

  const buildMatchingText = (pairs: Record<string, string>): string =>
    leftKeys
      .filter((k) => pairs[k])
      .map((k) => `${k}:${pairs[k]}`)
      .join(";");
  const completedAllPairs = leftKeys.length > 0 && leftKeys.every((k) => !!matchingPairs[k]);
  const interactionLocked = locked || completedAllPairs;
  const usedLeftKeys = new Set(Object.keys(matchingPairs));
  const usedRightKeys = new Set(Object.values(matchingPairs));

  const handleLeftSelect = (leftKey: string): void => {
    if (interactionLocked) return;
    if (matchingPairs[leftKey]) {
      const next = { ...matchingPairs };
      delete next[leftKey];
      onFillTextChange(buildMatchingText(next));
      setSelectedLeftKey("");
      setSelectedRightKey("");
      return;
    }
    setSelectedLeftKey(leftKey);
    if (!selectedRightKey) return;
    const next = { ...matchingPairs, [leftKey]: selectedRightKey };
    onFillTextChange(buildMatchingText(next));
    setSelectedLeftKey("");
    setSelectedRightKey("");
  };

  const handleRightSelect = (rightKey: string): void => {
    if (interactionLocked) return;
    const leftKeyUsingRight = Object.keys(matchingPairs).find((leftKey) => matchingPairs[leftKey] === rightKey);
    if (leftKeyUsingRight) {
      const next = { ...matchingPairs };
      delete next[leftKeyUsingRight];
      onFillTextChange(buildMatchingText(next));
      setSelectedLeftKey(leftKeyUsingRight);
      setSelectedRightKey("");
      return;
    }
    if (selectedRightKey === rightKey) {
      if (selectedLeftKey && matchingPairs[selectedLeftKey] === rightKey) {
        const next = { ...matchingPairs };
        delete next[selectedLeftKey];
        onFillTextChange(buildMatchingText(next));
        setSelectedLeftKey("");
        setSelectedRightKey("");
        return;
      }
      setSelectedRightKey("");
      return;
    }
    setSelectedRightKey(rightKey);
    if (!selectedLeftKey) return;
    const next = { ...matchingPairs, [selectedLeftKey]: rightKey };
    onFillTextChange(buildMatchingText(next));
    setSelectedLeftKey("");
    setSelectedRightKey("");
  };

  if (leftKeys.length === 0 || rightKeys.length === 0) {
    return (
      <TextField
        label="Câu trả lời (ví dụ 1:C;2:D;3:A)"
        value={fillText}
        onChange={(e) => onFillTextChange(e.target.value)}
        disabled={locked}
        fullWidth
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f8fafc" } }}
      />
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: "#111827", fontWeight: 500 }}>
        {completedAllPairs ? "Đã ghép đủ cặp, vui lòng nộp bài." : "Chọn 1 mục ở cột trái và 1 mục ở cột phải để ghép cặp"}
      </Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>
            Cột trái
          </Typography>
          {leftItems.map((left) => (
            <Button
              key={left.key}
              variant={selectedLeftKey === left.key ? "contained" : "outlined"}
              color={matchingPairs[left.key] ? "success" : "primary"}
              disabled={interactionLocked}
              onClick={() => handleLeftSelect(left.key)}
              sx={{
                borderRadius: 2,
                justifyContent: "flex-start",
                textAlign: "left",
                px: 2,
                py: 1.5,
                textTransform: "none",
                fontWeight: selectedLeftKey === left.key ? 600 : 500,
                borderColor: usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)",
                color: usedLeftKeys.has(left.key) ? "#6B7280" : "#111827",
                backgroundColor: usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.08)" : "transparent",
                "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" },
                ...(selectedLeftKey === left.key
                  ? {
                      color: "#0F172A",
                      backgroundColor: "rgba(26,140,142,0.12)",
                      borderColor: "rgba(26,140,142,0.45)"
                    }
                  : {}),
                "&.Mui-disabled": {
                  color: "#6B7280",
                  WebkitTextFillColor: "#6B7280",
                  borderColor: "rgba(107,114,128,0.45)",
                  fontWeight: 700,
                  opacity: 1
                }
              }}
            >
              Mục {left.key}{left.text ? `: ${left.text}` : ""}{" "}
              {matchingPairs[left.key] && <span style={{ marginLeft: 8, fontWeight: 700 }}>→ {matchingPairs[left.key]}</span>}
            </Button>
          ))}
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ color: "#111827", fontWeight: 600, mb: 0.5 }}>
            Cột phải
          </Typography>
          {rightItems.map((right) => (
            <Button
              key={right.key}
              variant={selectedRightKey === right.key ? "contained" : "outlined"}
              disabled={interactionLocked}
              onClick={() => handleRightSelect(right.key)}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 1.5,
                textTransform: "none",
                fontWeight: selectedRightKey === right.key ? 600 : 500,
                borderColor: usedRightKeys.has(right.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)",
                color: usedRightKeys.has(right.key) ? "#6B7280" : "#111827",
                backgroundColor: usedRightKeys.has(right.key) ? "rgba(107,114,128,0.08)" : "transparent",
                "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" },
                "&.Mui-disabled": {
                  color: "#6B7280",
                  WebkitTextFillColor: "#6B7280",
                  borderColor: "rgba(107,114,128,0.45)",
                  fontWeight: 700,
                  opacity: 1
                },
                ...(selectedRightKey === right.key
                  ? {
                      color: "#0F172A",
                      backgroundColor: "rgba(26,140,142,0.12)",
                      borderColor: "rgba(26,140,142,0.45)",
                      "&:hover": { backgroundColor: "rgba(26,140,142,0.16)" }
                    }
                  : {})
              }}
            >
              Đáp án {right.key}{right.text ? `: ${right.text}` : ""}
            </Button>
          ))}
        </Stack>
      </Stack>
      <TextField
        label="Kết quả ghép"
        value={fillText}
        onChange={(e) => onFillTextChange(e.target.value)}
        disabled={locked}
        fullWidth
        sx={{
          "& .MuiInputLabel-root": { color: "#111827", fontWeight: 500 },
          "& .MuiInputLabel-root.Mui-disabled": { color: "#6B7280", fontWeight: 700 },
          "& .MuiInputBase-input.Mui-disabled": {
            WebkitTextFillColor: "#6B7280",
            color: "#6B7280",
            opacity: 1,
            fontWeight: 700
          },
          "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f8fafc", color: "#111827", fontWeight: 500 }
        }}
      />
    </Stack>
  );
};
