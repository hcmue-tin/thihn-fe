import { Box, Card, CardContent, Grid, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
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
  onShowRules: () => void;
  onShowTeamList: () => void;
  questionAudioUrl?: string | null;
  onReplayQuestionAudio: () => void;
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
  onShowRules,
  onShowTeamList,
  questionAudioUrl,
  onReplayQuestionAudio,
  onSelectAllQuestions,
  onClearSelectedQuestions,
  onSelectPreviousQuestion,
  onSelectNextQuestion
}: ExamControlRoomProps) => (
  <Card>
    <CardContent>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: "#0F6B6D" }}>
        Phòng điều khiển thi
      </Typography>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
          Màn hình hiện tại:
        </Typography>
        <Box sx={{ px: 1.5, py: 0.25, borderRadius: 2, bgcolor: "rgba(26,140,142,0.08)", border: "1px solid rgba(26,140,142,0.15)" }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#1A8C8E" }}>{currentScreen}</Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ color: "#0F6B6D" }}>Chọn câu hỏi</Typography>
          <Box sx={{ my: 1 }}>
            <select
              value={selectedExamSetId ?? ""}
              onChange={(e) => onSelectExamSet(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "12px",
                background: "#FFFFFF",
                color: "#1A3A4A",
                border: "2px solid rgba(184,217,236,0.4)",
                fontWeight: 600,
                fontSize: "0.95rem",
                outline: "none"
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
            <Typography variant="caption" sx={{ color: "#4A7A8A", alignSelf: "center" }}>
              Đã chọn: {selectedQuestionIds.length} câu
            </Typography>
            <Box sx={{ flex: 1 }} />
            <Typography
              component="span"
              onClick={onSelectAllQuestions}
              sx={{ cursor: "pointer", fontSize: "0.75rem", color: "#1A8C8E", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Chọn tất cả ({questions.length})
            </Typography>
            <Typography
              component="span"
              onClick={onClearSelectedQuestions}
              sx={{ cursor: "pointer", fontSize: "0.75rem", color: "#4A7A8A", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Bỏ chọn
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <Typography
              component="span"
              onClick={onSelectPreviousQuestion}
              sx={{ cursor: "pointer", fontSize: "0.75rem", color: "#1A8C8E", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              ◀ Câu trước
            </Typography>
            <Typography
              component="span"
              onClick={onSelectNextQuestion}
              sx={{ cursor: "pointer", fontSize: "0.75rem", color: "#1A8C8E", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Câu kế ▶
            </Typography>
          </Stack>
          <List sx={{ maxHeight: 380, overflow: "auto", bgcolor: "background.paper", borderRadius: 2, border: "1px solid rgba(184,217,236,0.3)" }}>
            {questions.map((q) => (
              <ListItemButton
                key={q.id}
                selected={selectedQuestionId === q.id}
                onClick={() => onSelectQuestion(q.id)}
                sx={{
                  borderLeft: selectedQuestionId === q.id ? "4px solid #1A8C8E" : "4px solid transparent",
                  "&.Mui-selected": { bgcolor: "rgba(26,140,142,0.06)" }
                }}
              >
                <ListItemText primary={`Q${q.orderNum}: ${q.content}`} />
              </ListItemButton>
            ))}
          </List>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Typography variant="h6" sx={{ color: "#0F6B6D" }}>Điều khiển trạng thái</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5, mb: 1.5, flexWrap: "wrap" }}>
            <Typography
              component="span"
              onClick={onShowRules}
              sx={{ cursor: pendingAction ? "default" : "pointer", fontSize: "0.8rem", color: pendingAction ? "#B8D9EC" : "#1A8C8E", fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 2, border: "1px solid rgba(26,140,142,0.2)", "&:hover": pendingAction ? {} : { bgcolor: "rgba(26,140,142,0.06)" } }}
            >
              📜 Hiển thị Thể lệ
            </Typography>
            <Typography
              component="span"
              onClick={onShowTeamList}
              sx={{ cursor: pendingAction ? "default" : "pointer", fontSize: "0.8rem", color: pendingAction ? "#B8D9EC" : "#1A8C8E", fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 2, border: "1px solid rgba(26,140,142,0.2)", "&:hover": pendingAction ? {} : { bgcolor: "rgba(26,140,142,0.06)" } }}
            >
              👥 Hiển thị Đội thi
            </Typography>
            <Typography
              component="span"
              onClick={questionAudioUrl ? onReplayQuestionAudio : undefined}
              sx={{ cursor: questionAudioUrl ? "pointer" : "default", fontSize: "0.8rem", color: questionAudioUrl ? "#1A8C8E" : "#B8D9EC", fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 2, border: "1px solid rgba(26,140,142,0.2)", "&:hover": questionAudioUrl ? { bgcolor: "rgba(26,140,142,0.06)" } : {} }}
            >
              🔊 Phát lại âm thanh
            </Typography>
          </Stack>
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
