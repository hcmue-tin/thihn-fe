import type { QuestionType } from "./question";

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
  currentSessionId: number;
  isCountdownActive: boolean;
  countdownEndAt: string | null;
  rulesContent?: string | null;
  backgroundUrl?: string | null;
  ledBackgroundUrl?: string | null;
  ledWaitingBackgroundUrl?: string | null;
  contestantBackgroundUrl?: string | null;
  activeTeamId?: number | null;
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
  type: QuestionType;
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

export type TeamListPayload = {
  teams: Array<{
    id: number;
    name: string;
    contestants: Array<{
      id: number;
      name: string;
      code: string;
      unit: string | null;
    }>;
  }>;
};

export type AnswerResultsPayload = {
  questionId: number;
  results: Array<{
    contestantId: number;
    contestantName: string;
    teamName: string;
    hasSubmitted: boolean;
    isCorrect: boolean | null;
    scoreEarned: number;
    answerSummary?: string | null;
  }>;
};

export type LeaderboardPayload = {
  showAll?: boolean;
  rankings: Array<{
    rank: number;
    contestantId?: number;
    name: string;
    team?: string;
    totalScore: number;
  }>;
};
