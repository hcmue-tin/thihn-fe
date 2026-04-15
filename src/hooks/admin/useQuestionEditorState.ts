import { useState } from "react";
import { MATCHING_MAX, MATCHING_MIN, parseMatchingContent } from "../../components/admin/matchingEditorUtils";
import type { QuestionPayload } from "../../types/realtime";

export type EditableQuestionOption = {
  label: string;
  content: string;
  isCorrect: boolean;
  orderNum: number;
};

export type EditableQuestion = QuestionPayload & {
  options?: Array<{ id?: number; label: string; content: string; isCorrect: boolean; orderNum: number }>;
  fillBlankAnswers?: Array<{ id?: number; acceptedAnswer: string }>;
};

const defaultFourOptions = [
  { label: "A", content: "", isCorrect: false, orderNum: 1 },
  { label: "B", content: "", isCorrect: false, orderNum: 2 },
  { label: "C", content: "", isCorrect: false, orderNum: 3 },
  { label: "D", content: "", isCorrect: false, orderNum: 4 }
];

export const useQuestionEditorState = () => {
  const [openEditQuestionDialog, setOpenEditQuestionDialog] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionContent, setEditQuestionContent] = useState("");
  const [editQuestionType, setEditQuestionType] = useState<EditableQuestion["type"]>("single_choice");
  const [editQuestionCountdown, setEditQuestionCountdown] = useState(10);
  const [editQuestionScore, setEditQuestionScore] = useState(1);
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState("");
  const [editQuestionAudioUrl, setEditQuestionAudioUrl] = useState("");
  const [editQuestionOptions, setEditQuestionOptions] = useState<EditableQuestionOption[]>([]);
  const [editQuestionAcceptedAnswers, setEditQuestionAcceptedAnswers] = useState("");
  const [editMatchingN, setEditMatchingN] = useState(4);
  const [editMatchingLeft, setEditMatchingLeft] = useState<string[]>(() => Array(4).fill(""));
  const [editMatchingRight, setEditMatchingRight] = useState<string[]>(() => Array(4).fill(""));

  const resetMatchingState = (): void => {
    setEditMatchingN(4);
    setEditMatchingLeft(Array(4).fill(""));
    setEditMatchingRight(Array(4).fill(""));
  };

  const resizeEditMatching = (n: number): void => {
    const clamp = Math.min(MATCHING_MAX, Math.max(MATCHING_MIN, n));
    setEditMatchingN(clamp);
    setEditMatchingLeft((prev) => {
      const next = [...prev];
      while (next.length < clamp) next.push("");
      return next.slice(0, clamp);
    });
    setEditMatchingRight((prev) => {
      const next = [...prev];
      while (next.length < clamp) next.push("");
      return next.slice(0, clamp);
    });
  };

  const openEditorForQuestion = (q: EditableQuestion): void => {
    setEditingQuestionId(q.id);
    setEditQuestionType(q.type);
    setEditQuestionContent(q.content);
    setEditQuestionCountdown(q.countdownSeconds);
    setEditQuestionScore(q.score);
    setEditQuestionImageUrl(q.imageUrl ?? "");
    setEditQuestionAudioUrl(q.audioUrl ?? "");

    const optionSource = (q.options && q.options.length > 0
      ? q.options
      : defaultFourOptions) as Array<{ label: string; content: string; isCorrect: boolean; orderNum: number }>;
    setEditQuestionOptions(
      optionSource
        .slice()
        .sort((a, b) => a.orderNum - b.orderNum)
        .map((opt, index) => ({
          label: opt.label || String.fromCharCode(65 + index),
          content: opt.content ?? "",
          isCorrect: Boolean(opt.isCorrect),
          orderNum: opt.orderNum ?? index + 1
        }))
    );

    if (q.type === "matching") {
      const parsed = parseMatchingContent(q.content);
      const n = Math.min(MATCHING_MAX, Math.max(MATCHING_MIN, Math.max(parsed.left.length, parsed.right.length, 4)));
      setEditQuestionContent(parsed.stem || "Noi noi dung tuong ung.");
      setEditMatchingN(n);
      setEditMatchingLeft(Array.from({ length: n }, (_, i) => parsed.left[i] ?? ""));
      setEditMatchingRight(Array.from({ length: n }, (_, i) => parsed.right[i] ?? ""));
      const matchingAnswers = (q.fillBlankAnswers ?? []).map((item) => item.acceptedAnswer.trim()).filter(Boolean);
      const isPairToken = (value: string) => /^\d+\s*[:.]\s*[A-Za-z]$/.test(value.trim());
      setEditQuestionAcceptedAnswers(
        matchingAnswers.length > 0 && matchingAnswers.every(isPairToken)
          ? matchingAnswers.join(";")
          : matchingAnswers.join("\n")
      );
    } else {
      setEditQuestionAcceptedAnswers(
        q.type === "fill_blank"
          ? ""
          : (q.fillBlankAnswers ?? []).map((item) => item.acceptedAnswer).join("; ")
      );
      resetMatchingState();
    }

    setOpenEditQuestionDialog(true);
  };

  return {
    openEditQuestionDialog,
    setOpenEditQuestionDialog,
    editingQuestionId,
    setEditingQuestionId,
    editQuestionContent,
    setEditQuestionContent,
    editQuestionType,
    setEditQuestionType,
    editQuestionCountdown,
    setEditQuestionCountdown,
    editQuestionScore,
    setEditQuestionScore,
    editQuestionImageUrl,
    setEditQuestionImageUrl,
    editQuestionAudioUrl,
    setEditQuestionAudioUrl,
    editQuestionOptions,
    setEditQuestionOptions,
    editQuestionAcceptedAnswers,
    setEditQuestionAcceptedAnswers,
    editMatchingN,
    editMatchingLeft,
    editMatchingRight,
    setEditMatchingLeft,
    setEditMatchingRight,
    resizeEditMatching,
    openEditorForQuestion
  };
};
