import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { QuestionOption } from "../../../types/realtime";

type Props = {
  options: QuestionOption[];
  orderingSequence: string;
  locked: boolean;
  onFillTextChange: (value: string) => void;
};

export const OrderingQuestionView = ({ options, orderingSequence, locked, onFillTextChange }: Props) => {
  const withDisplayLabels = options.map((opt, index) => ({
    ...opt,
    displayLabel: (opt.label?.trim() || String.fromCharCode(65 + index)).toUpperCase()
  }));

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: "#475569", fontWeight: 500 }}>
        Chạm theo thứ tự đúng theo nhãn đáp án (ví dụ: B {"->"} D {"->"} C {"->"} A)
      </Typography>

      <Stack spacing={1} sx={{ p: 1.25, borderRadius: 2, backgroundColor: "rgba(248, 250, 252, 0.75)" }}>
        {withDisplayLabels.map((opt) => (
          <Typography key={opt.id} variant="body2" sx={{ color: "#0F172A", fontWeight: 600 }}>
            {opt.displayLabel}. {opt.content}
          </Typography>
        ))}
      </Stack>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {withDisplayLabels.map((opt) => (
          <Button
            key={opt.id}
            variant="outlined"
            disabled={locked}
            onClick={() => onFillTextChange(`${orderingSequence}${opt.displayLabel}`)}
            sx={{ borderRadius: 2, minWidth: { xs: 44, sm: 48 }, fontWeight: 700, borderColor: "#1A8C8E", color: "#1A8C8E", "&:hover": { backgroundColor: "rgba(26,140,142,0.08)", borderColor: "#1A8C8E" } }}
          >
            {opt.displayLabel}
          </Button>
        ))}
        <Button variant="text" color="warning" disabled={locked || orderingSequence.length === 0} onClick={() => onFillTextChange(orderingSequence.slice(0, -1))} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Xóa 1 ký tự
        </Button>
        <Button variant="text" color="error" disabled={locked || orderingSequence.length === 0} onClick={() => onFillTextChange("")} sx={{ borderRadius: 2, fontWeight: 600 }}>
          Làm lại
        </Button>
      </Box>

      <TextField label="Thứ tự hiện tại" value={orderingSequence} disabled fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f8fafc", fontWeight: 600 } }} />
    </Stack>
  );
};
