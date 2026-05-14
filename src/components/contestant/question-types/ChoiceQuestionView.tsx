import { Box, Checkbox, Radio, Typography } from "@mui/material";
import type { QuestionOption } from "../../../types/realtime";
import { fluid, fluidFont } from "../../../utils/fluid";
import { SINGLE_SELECT_TYPES } from "../../admin/questionTypeGroups";

type Props = {
  type: string;
  options: QuestionOption[];
  selectedOptionIds: number[];
  locked: boolean;
  correctOptionIds?: number[];
  onSelectSingle: (optionId: number) => void;
  onToggleMultiple: (optionId: number, checked: boolean) => void;
};

const cardSx = (isSelected: boolean, locked: boolean, isCorrect: boolean) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: fluid(0.5, 0.8, 1),
  p: fluid(0.6, 0.9, 1.2),
  borderRadius: 3,
  border: "2px solid",
  borderColor: isCorrect ? "#22c55e" : isSelected ? "#1A8C8E" : "rgba(26,140,142,0.15)",
  backgroundColor: isCorrect
    ? "rgba(34,197,94,0.1)"
    : isSelected
      ? "rgba(26,140,142,0.05)"
      : "#ffffff",
  cursor: locked ? "default" : "pointer",
  transition: "all 0.2s ease",
  boxShadow: isCorrect
    ? "0 0 12px rgba(34,197,94,0.35)"
    : isSelected
      ? "0 4px 12px rgba(26,140,142,0.1)"
      : "none",
  ...(isCorrect
    ? {
        animation: "blink-correct 1s ease-in-out infinite",
        "@keyframes blink-correct": {
          "0%, 100%": { borderColor: "#22c55e", boxShadow: "0 0 12px rgba(34,197,94,0.35)" },
          "50%": { borderColor: "#86efac", boxShadow: "0 0 20px rgba(34,197,94,0.55)" }
        }
      }
    : {}),
  "&:hover": {
    backgroundColor: locked
      ? isCorrect
        ? "rgba(34,197,94,0.1)"
        : isSelected
          ? "rgba(26,140,142,0.05)"
          : "#ffffff"
      : "rgba(26,140,142,0.08)",
    borderColor: locked
      ? isCorrect
        ? "#22c55e"
        : isSelected
          ? "#1A8C8E"
          : "rgba(26,140,142,0.15)"
      : "#1A8C8E"
  }
});

export const ChoiceQuestionView = ({
  type,
  options,
  selectedOptionIds,
  locked,
  correctOptionIds,
  onSelectSingle,
  onToggleMultiple
}: Props) => {
  const correctSet = correctOptionIds ?? [];

  if (type === "multiple_choice") {
    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: fluid(0.4, 0.7, 1),
          "@media (max-width: 640px)": { gridTemplateColumns: "1fr" }
        }}
      >
        {options.map((opt) => {
          const isSelected = selectedOptionIds.includes(opt.id);
          const isCorrect = correctSet.includes(opt.id);
          return (
            <Box key={opt.id} onClick={() => !locked && onToggleMultiple(opt.id, !isSelected)} sx={cardSx(isSelected, locked, isCorrect)}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => onToggleMultiple(opt.id, e.target.checked)}
                disabled={locked}
                sx={{ p: 0, mt: "0.15em", color: isCorrect ? "#22c55e" : "#1A8C8E", "&.Mui-checked": { color: isCorrect ? "#22c55e" : "#1A8C8E" } }}
              />
              <Typography
                sx={{
                  fontWeight: isCorrect ? 800 : isSelected ? 600 : 400,
                  color: isCorrect ? "#15803d" : "#1E293B",
                  wordBreak: "break-word",
                  fontSize: fluidFont.body
                }}
              >
                {opt.label}. {opt.content}
              </Typography>
            </Box>
          );
        })}
      </Box>
    );
  }

  if (!SINGLE_SELECT_TYPES.includes(type)) {
    return null;
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: fluid(0.4, 0.7, 1),
        "@media (max-width: 640px)": { gridTemplateColumns: "1fr" }
      }}
    >
      {options.map((opt) => {
        const isSelected = selectedOptionIds[0] === opt.id;
        const isCorrect = correctSet.includes(opt.id);
        return (
          <Box key={opt.id} onClick={() => !locked && onSelectSingle(opt.id)} sx={cardSx(isSelected, locked, isCorrect)}>
            <Radio
              checked={isSelected}
              onChange={() => onSelectSingle(opt.id)}
              disabled={locked}
              sx={{ p: 0, mt: "0.15em", color: isCorrect ? "#22c55e" : "#1A8C8E", "&.Mui-checked": { color: isCorrect ? "#22c55e" : "#1A8C8E" } }}
            />
            <Typography
              sx={{
                fontWeight: isCorrect ? 800 : isSelected ? 600 : 400,
                color: isCorrect ? "#15803d" : "#1E293B",
                wordBreak: "break-word",
                fontSize: fluidFont.body
              }}
            >
              {opt.label}. {opt.content}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};
