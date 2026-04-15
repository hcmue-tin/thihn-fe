import { FormControlLabel, Stack, Switch, TextField } from "@mui/material";
import { SINGLE_CORRECT_TYPES } from "../questionTypeGroups";

export type ChoiceOptionItem = {
  label: string;
  content: string;
  isCorrect: boolean;
  orderNum: number;
};

type Props = {
  type: string;
  options: ChoiceOptionItem[];
  onChange: (next: ChoiceOptionItem[]) => void;
};

export const ChoiceOptionsEditor = ({ type, options, onChange }: Props) => (
  <Stack spacing={1}>
    {options.map((opt, index) => (
      <Stack key={`${opt.label}-${index}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
        <TextField
          size="small"
          label={`Đáp án ${opt.label}`}
          value={opt.content}
          onChange={(e) => onChange(options.map((item, i) => (i === index ? { ...item, content: e.target.value } : item)))}
          fullWidth
        />
        {type !== "ordering" && (
          <FormControlLabel
            control={
              <Switch
                checked={opt.isCorrect}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const next = [...options];
                  next[index] = { ...next[index], isCorrect: checked };
                  if (checked && SINGLE_CORRECT_TYPES.includes(type)) {
                    next.forEach((item, i) => {
                      if (i !== index) next[i] = { ...item, isCorrect: false };
                    });
                  }
                  onChange(next);
                }}
              />
            }
            label="Đúng"
          />
        )}
      </Stack>
    ))}
  </Stack>
);
