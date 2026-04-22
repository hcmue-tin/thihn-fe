import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import type { QuestionOption } from "../../../types/realtime";
import { fluid, fluidFont } from "../../../utils/fluid";

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
    <Stack spacing={fluid(0.5, 0.9, 1.25)}>
      <Typography sx={{ color: "#475569", fontWeight: 500, fontSize: fluidFont.body }}>
        Chạm theo thứ tự đúng theo nhãn đáp án (ví dụ: B {"->"} D {"->"} C {"->"} A)
      </Typography>

      <Stack
        spacing={fluid(0.3, 0.5, 0.7)}
        sx={{
          p: fluid(0.5, 0.8, 1.1),
          borderRadius: 2,
          backgroundColor: "rgba(248, 250, 252, 0.75)"
        }}
      >
        {withDisplayLabels.map((opt) => (
          <Typography key={opt.id} sx={{ color: "#0F172A", fontWeight: 600, fontSize: fluidFont.body }}>
            {opt.displayLabel}. {opt.content}
          </Typography>
        ))}
      </Stack>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: fluid(0.3, 0.5, 0.75)
        }}
      >
        {withDisplayLabels.map((opt) => (
          <Button
            key={opt.id}
            variant="outlined"
            disabled={locked}
            onClick={() => onFillTextChange(`${orderingSequence}${opt.displayLabel}`)}
            sx={{
              borderRadius: 2,
              minWidth: fluid(2.5, 3.5, 4.5),
              minHeight: fluid(2.25, 2.75, 3.25),
              fontWeight: 700,
              fontSize: fluidFont.subtitle,
              borderColor: "#1A8C8E",
              color: "#1A8C8E",
              "&:hover": { backgroundColor: "rgba(26,140,142,0.08)", borderColor: "#1A8C8E" }
            }}
          >
            {opt.displayLabel}
          </Button>
        ))}
        <Button
          variant="text"
          color="warning"
          disabled={locked || orderingSequence.length === 0}
          onClick={() => onFillTextChange(orderingSequence.slice(0, -1))}
          sx={{ borderRadius: 2, fontWeight: 600, fontSize: fluidFont.body }}
        >
          Xóa 1 ký tự
        </Button>
        <Button
          variant="text"
          color="error"
          disabled={locked || orderingSequence.length === 0}
          onClick={() => onFillTextChange("")}
          sx={{ borderRadius: 2, fontWeight: 600, fontSize: fluidFont.body }}
        >
          Làm lại
        </Button>
      </Box>

      <TextField
        label="Thứ tự hiện tại"
        value={orderingSequence}
        disabled
        fullWidth
        sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3, backgroundColor: "#f8fafc", fontWeight: 600 } }}
      />
    </Stack>
  );
};
