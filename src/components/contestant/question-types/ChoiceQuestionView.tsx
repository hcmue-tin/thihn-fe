import { Box, Checkbox, Radio, Stack, Typography } from "@mui/material";
import type { QuestionOption } from "../../../types/realtime";
import { fluid, fluidFont } from "../../../utils/fluid";
import { SINGLE_SELECT_TYPES } from "../../admin/questionTypeGroups";

type Props = {
  type: string;
  options: QuestionOption[];
  selectedOptionIds: number[];
  locked: boolean;
  onSelectSingle: (optionId: number) => void;
  onToggleMultiple: (optionId: number, checked: boolean) => void;
};

const cardSx = (isSelected: boolean, locked: boolean) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: fluid(0.5, 0.8, 1),
  p: fluid(0.6, 0.9, 1.2),
  borderRadius: 3,
  border: "1px solid",
  borderColor: isSelected ? "#1A8C8E" : "rgba(26,140,142,0.15)",
  backgroundColor: isSelected ? "rgba(26,140,142,0.05)" : "#ffffff",
  cursor: locked ? "default" : "pointer",
  transition: "all 0.2s ease",
  boxShadow: isSelected ? "0 4px 12px rgba(26,140,142,0.1)" : "none",
  "&:hover": {
    backgroundColor: locked ? (isSelected ? "rgba(26,140,142,0.05)" : "#ffffff") : "rgba(26,140,142,0.08)",
    borderColor: locked ? (isSelected ? "#1A8C8E" : "rgba(26,140,142,0.15)") : "#1A8C8E"
  }
});

export const ChoiceQuestionView = ({ type, options, selectedOptionIds, locked, onSelectSingle, onToggleMultiple }: Props) => {
  if (type === "multiple_choice") {
    return (
      <Stack spacing={fluid(0.4, 0.7, 1)}>
        {options.map((opt) => {
          const isSelected = selectedOptionIds.includes(opt.id);
          return (
            <Box key={opt.id} onClick={() => !locked && onToggleMultiple(opt.id, !isSelected)} sx={cardSx(isSelected, locked)}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => onToggleMultiple(opt.id, e.target.checked)}
                disabled={locked}
                sx={{ p: 0, mt: "0.15em", color: "#1A8C8E", "&.Mui-checked": { color: "#1A8C8E" } }}
              />
              <Typography
                sx={{
                  fontWeight: isSelected ? 600 : 400,
                  color: "#1E293B",
                  wordBreak: "break-word",
                  fontSize: fluidFont.body
                }}
              >
                {opt.label}. {opt.content}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    );
  }

  if (!SINGLE_SELECT_TYPES.includes(type)) {
    return null;
  }

  return (
    <Stack spacing={fluid(0.4, 0.7, 1)}>
      {options.map((opt) => {
        const isSelected = selectedOptionIds[0] === opt.id;
        return (
          <Box key={opt.id} onClick={() => !locked && onSelectSingle(opt.id)} sx={cardSx(isSelected, locked)}>
            <Radio
              checked={isSelected}
              onChange={() => onSelectSingle(opt.id)}
              disabled={locked}
              sx={{ p: 0, mt: "0.15em", color: "#1A8C8E", "&.Mui-checked": { color: "#1A8C8E" } }}
            />
            <Typography
              sx={{
                fontWeight: isSelected ? 600 : 400,
                color: "#1E293B",
                wordBreak: "break-word",
                fontSize: fluidFont.body
              }}
            >
              {opt.label}. {opt.content}
            </Typography>
          </Box>
        );
      })}
    </Stack>
  );
};
