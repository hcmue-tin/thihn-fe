import { Box, Button, Card, CardContent, Chip, Grid, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import NavigateBeforeRoundedIcon from "@mui/icons-material/NavigateBeforeRounded";
import NavigateNextRoundedIcon from "@mui/icons-material/NavigateNextRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import type { ContestScreen, QuestionPayload } from "../../types/realtime";
import { LiveButtons } from "./LiveButtons";

type ExamSet = { id: number; name: string; orderNum: number };

type Team = { id: number; name: string };

type ExamControlRoomProps = {
  currentScreen: ContestScreen;
  examSets: ExamSet[];
  questions: QuestionPayload[];
  teams: Team[];
  activeTeamId: number | null;
  selectedExamSetId: number | null;
  selectedQuestionId: number | null;
  selectedQuestionIds: number[];
  pendingAction: boolean;
  onSelectExamSet: (examSetId: number) => void;
  onSelectQuestion: (questionId: number) => void;
  onSelectTeam: (teamId: number | null) => void;
  onGoWaiting: () => void;
  onResetSession: () => void;
  onShowQuestion: () => void;
  onStartCountdown: () => void;
  onStopShowAnswer: () => void;
  onRetakeQuestion: () => void;
  onShowTeamScore: () => void;
  onShowLeaderboard: () => void;
  onShowRules: () => void;
  onShowTeamList: () => void;
  onRevealSolutionOnLed: () => void;
  isLedSolutionRevealed: boolean;
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
  teams,
  activeTeamId,
  selectedExamSetId,
  selectedQuestionId,
  selectedQuestionIds,
  pendingAction,
  onSelectExamSet,
  onSelectQuestion,
  onSelectTeam,
  onGoWaiting,
  onResetSession,
  onShowQuestion,
  onStartCountdown,
  onStopShowAnswer,
  onRetakeQuestion,
  onShowTeamScore,
  onShowLeaderboard,
  onShowRules,
  onShowTeamList,
  onRevealSolutionOnLed,
  isLedSolutionRevealed,
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

      {/* Team selection */}
      <Box sx={{ mb: 2, p: 2, borderRadius: 3, border: "1px solid rgba(212,167,65,0.2)", bgcolor: "rgba(212,167,65,0.03)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#D4A741", display: "flex", alignItems: "center", gap: 0.75 }}>
            <GroupsRoundedIcon fontSize="small" />
            Đội tham gia vòng thi
          </Typography>
          <Typography variant="caption" sx={{ color: "#4A7A8A" }}>
            (Mỗi phiên thi một đội{activeTeamId ? "" : " — chưa chọn"})
          </Typography>
          <Box sx={{ flex: 1 }} />
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {teams.map((t) => {
            const isActive = activeTeamId === t.id;
            return (
              <Chip
                key={t.id}
                label={t.name}
                onClick={() => onSelectTeam(isActive ? null : t.id)}
                sx={{
                  fontWeight: 700,
                  cursor: "pointer",
                  bgcolor: isActive ? "#D4A741" : "rgba(184,217,236,0.15)",
                  color: isActive ? "#FFFFFF" : "#4A7A8A",
                  border: isActive ? "1px solid #D4A741" : "1px solid rgba(184,217,236,0.3)",
                  "&:hover": { bgcolor: isActive ? "#B8922E" : "rgba(184,217,236,0.3)" }
                }}
              />
            );
          })}
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
                  {s.name}
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
              <NavigateBeforeRoundedIcon fontSize="small" sx={{ verticalAlign: "middle" }} /> Câu trước
            </Typography>
            <Typography
              component="span"
              onClick={onSelectNextQuestion}
              sx={{ cursor: "pointer", fontSize: "0.75rem", color: "#1A8C8E", fontWeight: 600, "&:hover": { textDecoration: "underline" } }}
            >
              Câu kế <NavigateNextRoundedIcon fontSize="small" sx={{ verticalAlign: "middle" }} />
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
                <ListItemText primary={q.content} />
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
              <DescriptionRoundedIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
              Hiển thị Thể lệ
            </Typography>
            <Typography
              component="span"
              onClick={onShowTeamList}
              sx={{ cursor: pendingAction ? "default" : "pointer", fontSize: "0.8rem", color: pendingAction ? "#B8D9EC" : "#1A8C8E", fontWeight: 700, px: 1.5, py: 0.5, borderRadius: 2, border: "1px solid rgba(26,140,142,0.2)", "&:hover": pendingAction ? {} : { bgcolor: "rgba(26,140,142,0.06)" } }}
            >
              <GroupsRoundedIcon fontSize="small" sx={{ verticalAlign: "middle", mr: 0.5 }} />
              Hiển thị Đội thi
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={onReplayQuestionAudio}
              disabled={!questionAudioUrl}
              startIcon={<VolumeUpRoundedIcon fontSize="small" />}
              sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
            >
              Phát âm thanh LED
            </Button>
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
            onRetakeQuestion={onRetakeQuestion}
            onShowTeamScore={onShowTeamScore}
            onShowLeaderboard={onShowLeaderboard}
            onRevealSolutionOnLed={onRevealSolutionOnLed}
            isLedSolutionRevealed={isLedSolutionRevealed}
          />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);
