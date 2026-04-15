import { useMemo, useState } from "react";
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { parsePairRecord, recordPairsToString } from "./matchingEditorUtils";

type Props = {
  count: number;
  minCount: number;
  maxCount: number;
  leftItems: string[];
  rightItems: string[];
  accepted: string;
  acceptedLabel: string;
  onResize: (nextCount: number) => void;
  onLeftChange: (index: number, value: string) => void;
  onRightChange: (index: number, value: string) => void;
  onAcceptedChange: (value: string) => void;
};

export const MatchingEditor = ({
  count,
  minCount,
  maxCount,
  leftItems,
  rightItems,
  accepted,
  acceptedLabel,
  onResize,
  onLeftChange,
  onRightChange,
  onAcceptedChange
}: Props) => {
  const [pickLeft, setPickLeft] = useState<number | null>(null);
  const letters = useMemo(() => Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i)), [count]);
  const pairRecord = useMemo(() => parsePairRecord(accepted), [accepted]);
  const rightOwnerMap = useMemo(() => {
    const owner = new Map<string, number>();
    Object.entries(pairRecord).forEach(([left, right]) => {
      const leftNum = Number(left);
      if (Number.isFinite(leftNum) && right) owner.set(String(right).toUpperCase(), leftNum);
    });
    return owner;
  }, [pairRecord]);

  const applyPairClick = (leftNum1Based: number, letter: string): void => {
    const picked = letter.toUpperCase();
    const next: Record<number, string> = {};
    Object.entries(pairRecord).forEach(([left, right]) => {
      const leftNum = Number(left);
      if (!Number.isFinite(leftNum)) return;
      if (leftNum === leftNum1Based) return;
      if (String(right).toUpperCase() === picked) return;
      next[leftNum] = String(right).toUpperCase();
    });
    next[leftNum1Based] = picked;
    onAcceptedChange(recordPairsToString(next, count));
    setPickLeft(null);
  };

  return (
    <Stack spacing={1.25}>
      <Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Số cặp:
        </Typography>
        <Button size="small" variant="outlined" disabled={count <= minCount} onClick={() => onResize(count - 1)}>
          -
        </Button>
        <Chip label={count} size="small" />
        <Button size="small" variant="outlined" disabled={count >= maxCount} onClick={() => onResize(count + 1)}>
          +
        </Button>
      </Box>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F6B6D" }}>
            Cột trái (1 ... {count})
          </Typography>
          {leftItems.map((val, i) => (
            <TextField key={`L-${i}`} size="small" label={`${i + 1}.`} value={val} onChange={(e) => onLeftChange(i, e.target.value)} fullWidth />
          ))}
        </Stack>
        <Stack spacing={1} sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0F6B6D" }}>
            Cột phải ({letters.join(", ")})
          </Typography>
          {rightItems.map((val, i) => (
            <TextField key={`R-${i}`} size="small" label={`${letters[i]}.`} value={val} onChange={(e) => onRightChange(i, e.target.value)} fullWidth />
          ))}
        </Stack>
      </Stack>

      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(26,140,142,0.06)", border: "1px solid rgba(26,140,142,0.2)" }}>
        <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
          Ghép nhanh (chọn số trái {"->"} chọn chữ phải)
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
          <Box sx={{ border: "1px dashed rgba(15,107,109,0.28)", borderRadius: 1.5, p: 1 }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "#0F6B6D", mb: 0.75 }}>
              Cột trái (1...{count})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {Array.from({ length: count }, (_, i) => i + 1).map((num) => (
                <Chip
                  key={`pickL-${num}`}
                  label={String(num)}
                  size="small"
                  color={pickLeft === num ? "primary" : "default"}
                  onClick={() => setPickLeft(pickLeft === num ? null : num)}
                  sx={{ fontWeight: 800, justifyContent: "flex-start" }}
                />
              ))}
            </Box>
          </Box>
          <Box sx={{ border: "1px dashed rgba(15,107,109,0.28)", borderRadius: 1.5, p: 1 }}>
            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "#0F6B6D", mb: 0.75 }}>
              Cột phải (A...{letters[letters.length - 1]})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {letters.map((letter) => (
                <Chip
                  key={`pickR-${letter}`}
                  label={letter}
                  size="small"
                  disabled={pickLeft === null || (rightOwnerMap.has(letter) && rightOwnerMap.get(letter) !== pickLeft)}
                  onClick={() => {
                    if (pickLeft !== null) applyPairClick(pickLeft, letter);
                  }}
                  sx={{ fontWeight: 800, justifyContent: "flex-start" }}
                />
              ))}
            </Box>
          </Box>
        </Box>
        {pickLeft !== null && (
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "#64748B" }}>
            Đang ghép mục trái <strong>{pickLeft}</strong> - chọn A...{letters[letters.length - 1]}
          </Typography>
        )}
      </Box>

      <TextField
        size="small"
        label={acceptedLabel}
        value={accepted}
        onChange={(e) => onAcceptedChange(e.target.value)}
        helperText="Có thể chỉnh tay hoặc dùng ghép nhanh ở trên."
        fullWidth
      />
    </Stack>
  );
};
