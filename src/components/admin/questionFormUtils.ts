import { buildMatchingStem } from "./matchingEditorUtils";

export const parseAcceptedAnswers = (raw: string, type?: string): Array<{ acceptedAnswer: string }> => {
  if (type === "matching") {
    return raw
      .split(/\r?\n/g)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((acceptedAnswer) => ({ acceptedAnswer }));
  }

  return raw
    .replace(/\n/g, ";")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((acceptedAnswer) => ({ acceptedAnswer }));
};

export const buildQuestionContent = (
  type: string,
  content: string,
  matchingLeft: string[],
  matchingRight: string[]
): string => {
  if (type === "matching") {
    const matchingStem = buildMatchingStem(matchingLeft, matchingRight);
    return [content.trim(), matchingStem].filter(Boolean).join("\n\n");
  }
  return content.trim();
};
