import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { fluid, fluidFont } from "../../../utils/fluid";
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
  const pairPalette = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

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
  const interactionLocked = locked;
  const usedLeftKeys = new Set(Object.keys(matchingPairs));
  const usedRightKeys = new Set(Object.values(matchingPairs));
  const leftPairColorMap = new Map<string, string>();
  const rightPairColorMap = new Map<string, string>();
  leftKeys.forEach((leftKey, index) => {
    const rightKey = matchingPairs[leftKey];
    if (!rightKey) return;
    const color = pairPalette[index % pairPalette.length];
    leftPairColorMap.set(leftKey, color);
    rightPairColorMap.set(rightKey, color);
  });

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

  const pillSx = {
    borderRadius: 2,
    justifyContent: "flex-start",
    textAlign: "left",
    px: fluid(0.75, 1.1, 1.5),
    py: fluid(0.6, 0.9, 1.1),
    minHeight: fluid(2.25, 2.75, 3.25),
    textTransform: "none",
    fontSize: fluidFont.body
  } as const;

  return (
    <Stack spacing={fluid(0.5, 0.9, 1.25)}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={fluid(0.5, 0.8, 1.1)}>
        <Typography sx={{ color: "#111827", fontWeight: 500, fontSize: fluidFont.body }}>
          {completedAllPairs ? "Đã ghép đủ cặp, bạn có thể nộp bài hoặc reset để làm lại." : "Chọn 1 mục ở cột trái và 1 mục ở cột phải để ghép cặp"}
        </Typography>
        <Button
          variant="outlined"
          color="inherit"
          disabled={locked || Object.keys(matchingPairs).length === 0}
          onClick={() => {
            onFillTextChange("");
            setSelectedLeftKey("");
            setSelectedRightKey("");
          }}
          sx={{
            flexShrink: 0,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            fontSize: fluidFont.body,
            borderColor: "rgba(17,24,39,0.25)",
            color: "#111827",
            "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" }
          }}
        >
          Reset lại
        </Button>
      </Stack>
      <Box
        sx={{
          display: "grid",
          gap: fluid(0.75, 1.2, 1.8),
          gridTemplateColumns: "repeat(auto-fit, minmax(min(14rem, 100%), 1fr))"
        }}
      >
        <Stack spacing={fluid(0.4, 0.6, 0.9)}>
          <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: fluidFont.body }}>
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
                ...pillSx,
                fontWeight: selectedLeftKey === left.key ? 600 : 500,
                borderColor: leftPairColorMap.get(left.key) ?? (usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)"),
                color: leftPairColorMap.get(left.key) ?? (usedLeftKeys.has(left.key) ? "#6B7280" : "#111827"),
                backgroundColor: leftPairColorMap.get(left.key) ? `${leftPairColorMap.get(left.key)}1F` : usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.08)" : "transparent",
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
              Mục {left.key}
              {left.text ? `: ${left.text}` : ""}
            </Button>
          ))}
        </Stack>
        <Stack spacing={fluid(0.4, 0.6, 0.9)}>
          <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: fluidFont.body }}>
            Cột phải
          </Typography>
          {rightItems.map((right) => (
            <Button
              key={right.key}
              variant={selectedRightKey === right.key ? "contained" : "outlined"}
              disabled={interactionLocked}
              onClick={() => handleRightSelect(right.key)}
              sx={{
                ...pillSx,
                fontWeight: selectedRightKey === right.key ? 600 : 500,
                borderColor: rightPairColorMap.get(right.key) ?? (usedRightKeys.has(right.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)"),
                color: rightPairColorMap.get(right.key) ?? (usedRightKeys.has(right.key) ? "#6B7280" : "#111827"),
                backgroundColor: rightPairColorMap.get(right.key) ? `${rightPairColorMap.get(right.key)}1F` : usedRightKeys.has(right.key) ? "rgba(107,114,128,0.08)" : "transparent",
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
              Đáp án {right.key}
              {right.text ? `: ${right.text}` : ""}
            </Button>
          ))}
        </Stack>
      </Box>
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
