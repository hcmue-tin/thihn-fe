import { Box, Button, TextField, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { fluid, fluidFont } from "../../../utils/fluid";
import { parseMatchingContent } from "../../admin/matchingEditorUtils";

type Props = {
  content: string;
  fillText: string;
  locked: boolean;
  correctAnswerText?: string;
  onFillTextChange: (value: string) => void;
};

export const MatchingQuestionView = ({ content, fillText, locked, correctAnswerText, onFillTextChange }: Props) => {
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
  const pairCount = Math.max(leftItems.length, rightItems.length);
  const compactLevel = pairCount >= 10 ? 3 : pairCount >= 8 ? 2 : pairCount >= 6 ? 1 : 0;
  const matchingPairs = useMemo(
    () =>
      fillText
        .split(";")
        .map((item) => item.trim().replace(/\./g, ":"))
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, item) => {
          const [left, right] = item.split(":").map((value) => value.trim());
          if (left && right) acc[left] = right.toUpperCase();
          return acc;
        }, {}),
    [fillText]
  );

  const buildMatchingText = (pairs: Record<string, string>): string =>
    leftKeys
      .filter((key) => pairs[key])
      .map((key) => `${key}:${pairs[key]}`)
      .join(";");
  const completedCount = leftKeys.filter((key) => !!matchingPairs[key]).length;
  const completedAllPairs = leftKeys.length > 0 && completedCount === leftKeys.length;
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
    if (locked) return;
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
    if (locked) return;
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
        label="Cau tra loi (vi du 1:C;2:D;3:A)"
        value={fillText}
        onChange={(event) => onFillTextChange(event.target.value)}
        disabled={locked}
        fullWidth
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f8fafc" } }}
      />
    );
  }

  const itemFont = compactLevel >= 2 ? fluidFont.caption : fluidFont.body;
  const columnGap = compactLevel >= 2 ? fluid(0.35, 0.5, 0.65) : fluid(0.5, 0.75, 1);
  const rowGap = compactLevel >= 2 ? 0.25 : compactLevel === 1 ? 0.35 : 0.45;
  const pillSx = {
    borderRadius: compactLevel >= 2 ? 1.25 : 1.5,
    justifyContent: "flex-start",
    textAlign: "left",
    px: compactLevel >= 2 ? fluid(0.35, 0.5, 0.65) : compactLevel === 1 ? fluid(0.45, 0.65, 0.85) : fluid(0.55, 0.8, 1),
    py: compactLevel >= 2 ? fluid(0.18, 0.28, 0.36) : compactLevel === 1 ? fluid(0.28, 0.38, 0.5) : fluid(0.38, 0.55, 0.7),
    minHeight: compactLevel >= 2 ? fluid(1.45, 1.75, 2) : compactLevel === 1 ? fluid(1.65, 2, 2.25) : fluid(1.9, 2.25, 2.55),
    textTransform: "none",
    fontSize: itemFont,
    lineHeight: 1.15,
    overflow: "hidden"
  } as const;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: compactLevel >= 2 ? 0.35 : 0.6, overflow: "hidden" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: fluid(0.4, 0.6, 0.8), flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: fluid(0.4, 0.6, 0.8) }}>
          <Typography sx={{ color: "#111827", fontWeight: 800, fontSize: itemFont, lineHeight: 1.15 }}>
            {`Đã ghép ${completedCount}/${leftKeys.length}`}
          </Typography>
          <Button
            variant="outlined"
            color="inherit"
            disabled={locked || completedCount === 0}
            onClick={() => {
              onFillTextChange("");
              setSelectedLeftKey("");
              setSelectedRightKey("");
            }}
            sx={{
              flexShrink: 0,
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 700,
              fontSize: itemFont,
              minHeight: compactLevel >= 2 ? "1.6rem" : "2rem",
              px: compactLevel >= 2 ? 0.75 : 1,
              py: 0.1,
              borderColor: "rgba(17,24,39,0.25)",
              color: "#111827",
              "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" }
            }}
          >
            Reset
          </Button>
        </Box>

        {correctAnswerText && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: fluid(0.4, 0.6, 0.8),
              px: fluid(0.4, 0.6, 0.8),
              py: fluid(0.15, 0.25, 0.35),
              borderRadius: 1.5,
              border: "2px solid #22c55e",
              backgroundColor: "rgba(34,197,94,0.08)",
              animation: "blink-correct-inline 1s ease-in-out infinite",
              "@keyframes blink-correct-inline": {
                "0%, 100%": { borderColor: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.25)" },
                "50%": { borderColor: "#86efac", boxShadow: "0 0 14px rgba(34,197,94,0.45)" }
              }
            }}
          >
            <Typography sx={{ fontWeight: 900, color: "#15803d", fontSize: itemFont, whiteSpace: "nowrap" }}>
              Đáp án đúng:
            </Typography>
            <Typography sx={{ fontWeight: 900, color: "#15803d", fontSize: itemFont, letterSpacing: 1 }}>
              {correctAnswerText}
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gap: columnGap,
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          alignItems: "stretch"
        }}
      >
        <Box sx={{ minHeight: 0, display: "grid", gap: rowGap, alignContent: "start" }}>
          <Typography sx={{ color: "#111827", fontWeight: 800, fontSize: itemFont, lineHeight: 1.1 }}>
            Cột trái
          </Typography>
          {leftItems.map((left) => {
            const isSelected = selectedLeftKey === left.key;
            const pairColor = leftPairColorMap.get(left.key);
            return (
              <Button
                key={left.key}
                variant={isSelected ? "contained" : "outlined"}
                disabled={locked}
                onClick={() => handleLeftSelect(left.key)}
                sx={{
                  ...pillSx,
                  fontWeight: isSelected ? 700 : 600,
                  borderColor: pairColor ?? (usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)"),
                  color: pairColor ?? (usedLeftKeys.has(left.key) ? "#6B7280" : "#111827"),
                  backgroundColor: pairColor ? `${pairColor}1F` : usedLeftKeys.has(left.key) ? "rgba(107,114,128,0.08)" : "transparent",
                  "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" },
                  ...(isSelected
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
                <Box component="span" sx={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: compactLevel >= 2 ? 2 : 3, WebkitBoxOrient: "vertical" }}>
                  {left.key}
                  {left.text ? `. ${left.text}` : ""}
                </Box>
              </Button>
            );
          })}
        </Box>

        <Box sx={{ minHeight: 0, display: "grid", gap: rowGap, alignContent: "start" }}>
          <Typography sx={{ color: "#111827", fontWeight: 800, fontSize: itemFont, lineHeight: 1.1 }}>
            Cột phải
          </Typography>
          {rightItems.map((right) => {
            const isSelected = selectedRightKey === right.key;
            const pairColor = rightPairColorMap.get(right.key);
            return (
              <Button
                key={right.key}
                variant={isSelected ? "contained" : "outlined"}
                disabled={locked}
                onClick={() => handleRightSelect(right.key)}
                sx={{
                  ...pillSx,
                  fontWeight: isSelected ? 700 : 600,
                  borderColor: pairColor ?? (usedRightKeys.has(right.key) ? "rgba(107,114,128,0.45)" : "rgba(17,24,39,0.35)"),
                  color: pairColor ?? (usedRightKeys.has(right.key) ? "#6B7280" : "#111827"),
                  backgroundColor: pairColor ? `${pairColor}1F` : usedRightKeys.has(right.key) ? "rgba(107,114,128,0.08)" : "transparent",
                  "&:hover": { borderColor: "rgba(17,24,39,0.45)", backgroundColor: "rgba(15,23,42,0.03)" },
                  "&.Mui-disabled": {
                    color: "#6B7280",
                    WebkitTextFillColor: "#6B7280",
                    borderColor: "rgba(107,114,128,0.45)",
                    fontWeight: 700,
                    opacity: 1
                  },
                  ...(isSelected
                    ? {
                        color: "#0F172A",
                        backgroundColor: "rgba(26,140,142,0.12)",
                        borderColor: "rgba(26,140,142,0.45)",
                        "&:hover": { backgroundColor: "rgba(26,140,142,0.16)" }
                      }
                    : {})
                }}
              >
                <Box component="span" sx={{ overflow: "hidden", display: "-webkit-box", WebkitLineClamp: compactLevel >= 2 ? 2 : 3, WebkitBoxOrient: "vertical" }}>
                  {right.key}
                  {right.text ? `. ${right.text}` : ""}
                </Box>
              </Button>
            );
          })}
        </Box>
      </Box>

      {completedAllPairs && (
        <Typography
          sx={{
            flexShrink: 0,
            color: "#17324d",
            fontWeight: 800,
            fontSize: itemFont,
            lineHeight: 1.15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}
          title={`Kết quả: ${fillText}`}
        >
          {`Kết quả: ${fillText}`}
        </Typography>
      )}
    </Box>
  );
};
