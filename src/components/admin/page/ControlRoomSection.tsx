import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../../api";
import { ExamControlRoom } from "../ExamControlRoom";
import type { AdminQuestion, ExamSet, Team } from "../../../types/admin";
import type { ContestScreen } from "../../../types/realtime";

type Props = {
  screen: ContestScreen;
  questionAudioUrl: string | null;
  questionImageUrl: string | null;
  questionImageId: number | null;
  questionAudioId: number | null;
  examSets: ExamSet[];
  questions: AdminQuestion[];
  teams: Team[];
  activeTeamId: number | null;
  selectedExamSetId: number | null;
  selectedQuestionId: number | null;
  selectedQuestionIds: number[];
  pendingAction: boolean;
  onSelectExamSet: (examSetId: number) => Promise<void>;
  onSelectQuestion: (questionId: number) => void;
  onSelectTeam: (teamId: number | null) => void;
  onGoWaiting: () => Promise<void> | void;
  onResetSession: () => Promise<void> | void;
  onShowQuestion: () => Promise<void> | void;
  onStartCountdown: () => Promise<void> | void;
  onStopShowAnswer: () => Promise<void> | void;
  onRetakeQuestion: () => Promise<void> | void;
  onShowTeamScore: () => Promise<void> | void;
  onShowLeaderboard: () => Promise<void> | void;
  onLeaderboardPrevPage: () => Promise<void> | void;
  onLeaderboardNextPage: () => Promise<void> | void;
  onShowRules: () => Promise<void> | void;
  onShowTeamList: () => Promise<void> | void;
  onRevealSolutionOnLed: () => Promise<void> | void;
  isLedSolutionRevealed: boolean;
  onSelectAllQuestions: () => void;
  onClearSelectedQuestions: () => void;
  onSelectPreviousQuestion: () => void;
  onSelectNextQuestion: () => void;
  onReplayQuestionAudio: () => Promise<void> | void;
};

export const ControlRoomSection = ({
  screen,
  questionAudioUrl,
  questionImageUrl,
  questionImageId,
  questionAudioId,
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
  onLeaderboardPrevPage,
  onLeaderboardNextPage,
  onShowRules,
  onShowTeamList,
  onRevealSolutionOnLed,
  isLedSolutionRevealed,
  onSelectAllQuestions,
  onClearSelectedQuestions,
  onSelectPreviousQuestion,
  onSelectNextQuestion,
  onReplayQuestionAudio
}: Props) => (
  <Stack spacing={2}>
    {questionImageUrl && (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 1 }}>
            Hình ảnh câu hỏi hiện tại
          </Typography>
          <Box
            component="img"
            key={`${questionImageId}-${questionImageUrl}`}
            src={resolveMediaUrl(questionImageUrl)}
            alt="Hình minh họa câu hỏi"
            sx={{
              display: "block",
              width: "100%",
              maxHeight: 280,
              objectFit: "contain",
              borderRadius: 3,
              background: "rgba(255,255,255,0.04)"
            }}
          />
        </CardContent>
      </Card>
    )}
    {questionAudioUrl && (
      <Card>
        <CardContent>
          <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 1 }}>
            Âm thanh câu hỏi hiện tại
          </Typography>
          <audio controls src={resolveMediaUrl(questionAudioUrl)} style={{ width: "100%" }} />
        </CardContent>
      </Card>
    )}
    <ExamControlRoom
      currentScreen={screen}
      examSets={examSets}
      questions={questions}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      activeTeamId={activeTeamId}
      selectedExamSetId={selectedExamSetId}
      selectedQuestionId={selectedQuestionId}
      selectedQuestionIds={selectedQuestionIds}
      pendingAction={pendingAction}
      onSelectExamSet={onSelectExamSet}
      onSelectQuestion={onSelectQuestion}
      onSelectTeam={onSelectTeam}
      onGoWaiting={onGoWaiting}
      onResetSession={onResetSession}
      onShowQuestion={onShowQuestion}
      onStartCountdown={onStartCountdown}
      onStopShowAnswer={onStopShowAnswer}
      onRetakeQuestion={onRetakeQuestion}
      onShowTeamScore={onShowTeamScore}
      onShowLeaderboard={onShowLeaderboard}
      onLeaderboardPrevPage={onLeaderboardPrevPage}
      onLeaderboardNextPage={onLeaderboardNextPage}
      onShowRules={onShowRules}
      onShowTeamList={onShowTeamList}
      onRevealSolutionOnLed={onRevealSolutionOnLed}
      isLedSolutionRevealed={isLedSolutionRevealed}
      onSelectAllQuestions={onSelectAllQuestions}
      onClearSelectedQuestions={onClearSelectedQuestions}
      onSelectPreviousQuestion={onSelectPreviousQuestion}
      onSelectNextQuestion={onSelectNextQuestion}
      questionAudioUrl={questionAudioUrl}
      onReplayQuestionAudio={onReplayQuestionAudio}
    />
  </Stack>
);
