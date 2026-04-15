import type { QuestionType } from "../../types/question";

export const CHOICE_TYPES: QuestionType[] = ["true_false", "single_choice", "multiple_choice", "listening_choice", "ordering", "fill_blank"];
export const SINGLE_CORRECT_TYPES: QuestionType[] = ["true_false", "single_choice", "listening_choice", "fill_blank"];
export const ACCEPTED_ANSWER_TYPES: QuestionType[] = ["ordering", "matching"];
export const CHOICE_SUBMIT_TYPES: QuestionType[] = ["single_choice", "multiple_choice", "true_false", "listening_choice", "fill_blank"];
export const SINGLE_SELECT_TYPES: QuestionType[] = ["single_choice", "true_false", "listening_choice", "fill_blank"];
