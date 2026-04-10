export type ContestScreen =
  | "idle"
  | "waiting"
  | "rules"
  | "team_list"
  | "question"
  | "countdown"
  | "reveal"
  | "team_score"
  | "leaderboard";

export type ContestState = {
  id: number;
  screen: ContestScreen;
  currentExamSetId: number | null;
  currentQuestionId: number | null;
  isCountdownActive: boolean;
  countdownEndAt: string | null;
  version: number;
  updatedAt: string;
};

export type QuestionOption = {
  id: number;
  label: string;
  content: string;
  isCorrect?: boolean;
  orderNum?: number;
};

export type QuestionPayload = {
  id: number;
  type: "true_false" | "single_choice" | "multiple_choice" | "fill_blank" | "ordering" | "matching" | "listening_choice";
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  countdownSeconds: number;
  score: number;
  orderNum: number;
};

export type AnswerRevealPayload = {
  questionId: number;
  correctOptionIds: number[];
  fillBlankAnswers: string[];
  stats: Record<string, number>;
};

export type TeamScorePayload = {
  examSetId: number;
  teams: Array<{
    teamId?: number;
    name: string;
    totalScore: number;
    contestants?: Array<{ contestantId?: number; name: string; score: number }>;
  }>;
};

export type LeaderboardPayload = {
  rankings: Array<{
    rank: number;
    contestantId?: number;
    name: string;
    team?: string;
    totalScore: number;
  }>;
};
