import { Box, Typography } from "@mui/material";
import { fluid, fluidFont } from "../../utils/fluid";

type ResultViewProps = {
  isCorrect: boolean;
};

export const ResultView = ({ isCorrect }: ResultViewProps) => (
  <Box
    sx={{
      px: fluid(1.5, 2.5, 3.5),
      py: fluid(1, 1.5, 2),
      borderRadius: 4,
      backgroundColor: isCorrect ? "#ffffff" : "#ffffff",
      border: `4px solid ${isCorrect ? "#22c55e" : "#ef4444"}`,
      boxShadow: isCorrect 
        ? "0 10px 25px -5px rgba(34, 197, 94, 0.4), 0 8px 10px -6px rgba(34, 197, 94, 0.4)"
        : "0 10px 25px -5px rgba(239, 68, 68, 0.4), 0 8px 10px -6px rgba(239, 68, 68, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: isCorrect
        ? "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)"
        : "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
      transform: "scale(1.1)",
    }}
  >
    <Typography
      sx={{
        fontWeight: 900,
        color: isCorrect ? "#15803d" : "#b91c1c",
        fontSize: fluidFont.h5,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5
      }}
    >
      <Box component="span" sx={{ fontSize: "1.2em" }}>
        {isCorrect ? "✅" : "❌"}
      </Box>
      {isCorrect ? "Bạn trả lời đúng!" : "Bạn trả lời sai!"}
    </Typography>
  </Box>
);
