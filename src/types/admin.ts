import type { QuestionPayload } from "./realtime";

export type Team = { id: number; name: string; description: string | null; contestantCount?: number };
export type Contestant = { id: number; teamId: number | null; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
export type ExamSet = { id: number; name: string; orderNum: number };
export type AdminQuestion = QuestionPayload & {
  options?: Array<{ id?: number; label: string; content: string; isCorrect: boolean; orderNum: number }>;
  fillBlankAnswers?: Array<{ id?: number; acceptedAnswer: string }>;
};
export type AdminView = "welcome" | "teams" | "contestants" | "exam_mgmt" | "rules" | "backgrounds" | "export_scores" | "control";
