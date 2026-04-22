import { Box, Typography } from "@mui/material";
import { fluid, fluidFont } from "../../utils/fluid";

type ResultViewProps = {
  isCorrect: boolean;
};

export const ResultView = ({ isCorrect }: ResultViewProps) => (
  <Box
    sx={{
      p: fluid(1, 1.5, 2),
      borderRadius: 3,
      borderLeft: `0.3rem solid ${isCorrect ? "#15803D" : "#DC2626"}`,
      background: isCorrect
        ? "linear-gradient(135deg, rgba(21,128,61,0.06), rgba(34,197,94,0.04))"
        : "linear-gradient(135deg, rgba(220,38,38,0.06), rgba(248,113,113,0.04))",
      border: `1px solid ${isCorrect ? "rgba(21,128,61,0.15)" : "rgba(220,38,38,0.15)"}`
    }}
  >
    <Typography
      sx={{
        fontWeight: 800,
        color: isCorrect ? "#15803D" : "#DC2626",
        fontSize: fluidFont.h6
      }}
    >
      {isCorrect ? "✅ Bạn trả lời đúng!" : "❌ Bạn trả lời sai."}
    </Typography>
  </Box>
);
