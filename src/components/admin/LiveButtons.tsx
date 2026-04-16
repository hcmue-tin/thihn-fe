import { Button, Divider, Stack } from "@mui/material";
import type { ContestScreen } from "../../types/realtime";

const canShowQuestion = (screen: ContestScreen): boolean => ["idle", "waiting", "rules", "team_list", "reveal", "team_score"].includes(screen);
const canStartCountdown = (screen: ContestScreen): boolean => screen === "question";
const canStopShowAnswer = (screen: ContestScreen): boolean => screen === "countdown";
const canGoWaiting = (screen: ContestScreen): boolean => ["idle", "rules", "team_list", "reveal", "team_score", "leaderboard"].includes(screen);

type LiveButtonsProps = {
  screen: ContestScreen;
  pendingAction: boolean;
  activeTeamId: number | null;
  selectedQuestionId: number | null;
  selectedExamSetId: number | null;
  onGoWaiting: () => void;
  onResetSession: () => void;
  onShowQuestion: () => void;
  onStartCountdown: () => void;
  onStopShowAnswer: () => void;
  onRetakeQuestion: () => void;
  onShowTeamScore: () => void;
  onShowLeaderboard: () => void;
  onRevealSolutionOnLed: () => void;
  isLedSolutionRevealed: boolean;
};

export const LiveButtons = ({
  screen,
  pendingAction,
  activeTeamId,
  selectedQuestionId,
  selectedExamSetId,
  onGoWaiting,
  onResetSession,
  onShowQuestion,
  onStartCountdown,
  onStopShowAnswer,
  onRetakeQuestion,
  onShowTeamScore,
  onShowLeaderboard,
  onRevealSolutionOnLed,
  isLedSolutionRevealed
}: LiveButtonsProps) => (
  <Stack spacing={1.5} sx={{ mt: 1 }}>
    <Button
      size="large"
      variant="contained"
      color="info"
      disabled={!canGoWaiting(screen) || pendingAction || activeTeamId == null}
      onClick={onGoWaiting}
    >
      Vào màn chờ
    </Button>
    <Button size="large" variant="outlined" color="error" disabled={pendingAction} onClick={onResetSession}>
      Reset phiên thi
    </Button>
    <Button
      size="large"
      variant="contained"
      disabled={!selectedQuestionId || !canShowQuestion(screen) || pendingAction || activeTeamId == null}
      onClick={onShowQuestion}
    >
      Hiển thị câu hỏi
    </Button>
    <Button
      size="large"
      variant="contained"
      color="secondary"
      disabled={!selectedQuestionId || !canStartCountdown(screen) || pendingAction || activeTeamId == null}
      onClick={onStartCountdown}
    >
      Bắt đầu đếm ngược
    </Button>
    <Button
      size="large"
      variant="contained"
      color="warning"
      disabled={!canStopShowAnswer(screen) || pendingAction || activeTeamId == null}
      onClick={onStopShowAnswer}
    >
      B1: Dừng & hiện đáp án thí sinh
    </Button>
    <Button
      size="large"
      variant="outlined"
      color="primary"
      disabled={screen !== "reveal" || pendingAction || isLedSolutionRevealed}
      onClick={onRevealSolutionOnLed}
    >
      {isLedSolutionRevealed ? "B2: Đã hiển thị đáp án đúng" : "B2: LED hiển thị đáp án đúng"}
    </Button>
    <Button
      size="large"
      variant="outlined"
      color="secondary"
      disabled={!selectedQuestionId || pendingAction || activeTeamId == null}
      onClick={onRetakeQuestion}
    >
      Cho thi lại câu này
    </Button>
    <Divider />
    <Button size="large" variant="outlined" disabled={!selectedExamSetId || pendingAction || activeTeamId == null} onClick={onShowTeamScore}>
      Hiện điểm theo đội
    </Button>
    <Button size="large" variant="outlined" disabled={pendingAction || activeTeamId == null} onClick={onShowLeaderboard}>
      Hiện bảng xếp hạng
    </Button>
  </Stack>
);
