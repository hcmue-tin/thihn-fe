import { TextField } from "@mui/material";

type Props = {
  label: string;
  value: string;
  helperText?: string;
  onChange: (value: string) => void;
};

export const AcceptedAnswerEditor = ({ label, value, helperText, onChange }: Props) => (
  <TextField
    size="small"
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    helperText={helperText}
  />
);
