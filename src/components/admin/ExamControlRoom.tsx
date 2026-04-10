import { Box, Button, Card, CardContent, Grid, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import type { ContestScreen, QuestionPayload } from "../../types/realtime";
import { LiveButtons } from "./LiveButtons";

type ExamSet = { id: number; name: string; orderNum: number };

type ExamControlRoomProps = {
  currentScreen: ContestScreen;
  examSets: ExamSet[];
  questions: QuestionPayload[];
  selectedExamSetId: number | null;
  selectedQuestionId: number | null;
  selectedQuestionIds: number[];
  pendingAction: boolean;
  onSelectExamSet: (examSetId: number) => void;
  onSelectQuestion: (questionId: number) => void;
  onGoWaiting: () => void;
  onResetSession: () => void;
  onShowQuestion: () => void;
  onStartCountdown: () => void;
  onStopShowAnswer: () => void;
  onShowTeamScore: () => void;
  onShowLeaderboard: () => void;
  onOpenCreateQuestion: () => void;
  onOpenCreateExamSet: () => void;
  onDeleteSelectedQuestion: () => void;
  onDeleteSelectedExamSet: () => void;
  onSelectAllQuestions: () => void;
  onClearSelectedQuestions: () => void;
  onSelectPreviousQuestion: () => void;
  onSelectNextQuestion: () => void;
};

export const ExamControlRoom = ({
  currentScreen,
  examSets,
  questions,
  selectedExamSetId,
  selectedQuestionId,
  selectedQuestionIds,
  pendingAction,
  onSelectExamSet,
  onSelectQuestion,
  onGoWaiting,
  onResetSession,
  onShowQuestion,
  onStartCountdown,
  onStopShowAnswer,
  onShowTeamScore,
  onShowLeaderboard,
  onOpenCreateQuestion,
  onOpenCreateExamSet,
  onDeleteSelectedQuestion,
  onDeleteSelectedExamSet,
  onSelectAllQuestions,
  onClearSelectedQuestions,
  onSelectPreviousQuestion,
  onSelectNextQuestion
}: ExamControlRoomProps) => (
  <Card>
    <CardContent>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
        Phòng điều khiển thi
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Màn hình hiện tại: <strong>{currentScreen}</strong>
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6">Quản lý đề thi</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="contained" onClick={onOpenCreateExamSet}>
              Tạo bộ đề
            </Button>
            <Button size="small" variant="contained" color="secondary" onClick={onOpenCreateQuestion} disabled={!selectedExamSetId}>
              Tạo câu hỏi mới
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={onDeleteSelectedQuestion} disabled={!selectedQuestionId}>
              Xóa câu đã chọn
            </Button>
            <Button size="small" variant="outlined" color="error" onClick={onDeleteSelectedExamSet} disabled={!selectedExamSetId}>
              Xóa bộ đề
            </Button>
          </Stack>
          <Box sx={{ my: 1 }}>
            <select
              value={selectedExamSetId ?? ""}
              onChange={(e) => onSelectExamSet(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                background: "#1f1f2b",
                color: "white",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              {examSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.orderNum}. {s.name}
                </option>
              ))}
            </select>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={onSelectAllQuestions} disabled={questions.length === 0}>
              Chọn tất cả ({questions.length})
            </Button>
            <Button size="small" variant="outlined" onClick={onClearSelectedQuestions} disabled={selectedQuestionIds.length === 0}>
              Bỏ chọn
            </Button>
            <Button size="small" variant="text" onClick={onSelectPreviousQuestion} disabled={selectedQuestionIds.length === 0}>
              Câu trước
            </Button>
            <Button size="small" variant="text" onClick={onSelectNextQuestion} disabled={selectedQuestionIds.length === 0}>
              Câu kế
            </Button>
          </Stack>
          <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
            Đã chọn sẵn: {selectedQuestionIds.length} câu
          </Typography>
          <List sx={{ maxHeight: 380, overflow: "auto", bgcolor: "background.paper", borderRadius: 2 }}>
            {questions.map((q) => (
              <ListItemButton key={q.id} selected={selectedQuestionId === q.id} onClick={() => onSelectQuestion(q.id)}>
                <ListItemText primary={`Q${q.orderNum}: ${q.content}`} />
              </ListItemButton>
            ))}
          </List>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6">Điều khiển trạng thái</Typography>
          <LiveButtons
            screen={currentScreen}
            pendingAction={pendingAction}
            selectedQuestionId={selectedQuestionId}
            selectedExamSetId={selectedExamSetId}
            onGoWaiting={onGoWaiting}
            onResetSession={onResetSession}
            onShowQuestion={onShowQuestion}
            onStartCountdown={onStartCountdown}
            onStopShowAnswer={onStopShowAnswer}
            onShowTeamScore={onShowTeamScore}
            onShowLeaderboard={onShowLeaderboard}
          />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);
