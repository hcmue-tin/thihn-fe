import { Box, Typography } from "@mui/material";

type ResultViewProps = {
  isCorrect: boolean;
};

export const ResultView = ({ isCorrect }: ResultViewProps) => (
  <Box
    sx={{
      mt: 2,
      p: 2.5,
      borderRadius: 3,
      borderLeft: `5px solid ${isCorrect ? "#15803D" : "#DC2626"}`,
      background: isCorrect
        ? "linear-gradient(135deg, rgba(21,128,61,0.06), rgba(34,197,94,0.04))"
        : "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(248,113,113,0.04))",
      border: `1px solid ${isCorrect ? "rgba(21,128,61,0.15)" : "rgba(220,38,38,0.15)"}`
    }}
  >
    <Typography variant="h6" sx={{ fontWeight: 800, color: isCorrect ? "#15803D" : "#DC2626", mb: 0.5 }}>
      {isCorrect ? "✅ Bạn trả lời đúng!" : "❌ Bạn trả lời sai."}
    </Typography>
  </Box>
);
