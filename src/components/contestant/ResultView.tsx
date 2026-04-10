import { Alert } from "@mui/material";

type ResultViewProps = {
  isCorrect: boolean;
  scoreEarned: number;
  totalScore: number;
};

export const ResultView = ({ isCorrect, scoreEarned, totalScore }: ResultViewProps) => (
  <Alert severity={isCorrect ? "success" : "warning"} sx={{ mt: 2 }}>
    {isCorrect ? "Bạn trả lời đúng!" : "Bạn trả lời sai."} +{scoreEarned} điểm. Tổng điểm: {totalScore}
  </Alert>
);
