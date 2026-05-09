import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../api";
import type { QuestionOption, QuestionPayload } from "../../types/realtime";
import { fluid, fluidFont } from "../../utils/fluid";
import { CHOICE_SUBMIT_TYPES, SINGLE_SELECT_TYPES } from "../admin/questionTypeGroups";
import { QuestionContentWithBlank } from "./QuestionContentWithBlank";
import { parseMatchingContent } from "../admin/matchingEditorUtils";
import { ChoiceQuestionView } from "./question-types/ChoiceQuestionView";
import { MatchingQuestionView } from "./question-types/MatchingQuestionView";
import { OrderingQuestionView } from "./question-types/OrderingQuestionView";

type QuestionFormProps = {
  question: QuestionPayload;
  options: QuestionOption[];
  selectedOptionIds: number[];
  fillText: string;
  progress: number;
  countdownValue: number | null;
  locked: boolean;
  isLoading: boolean;
  isSubmitted: boolean;
  canSubmit: boolean;
  waitingForCountdown: boolean;
  onSelectSingle: (optionId: number) => void;
  onToggleMultiple: (optionId: number, checked: boolean) => void;
  onFillTextChange: (value: string) => void;
  onSubmit: () => void;
};

export const QuestionForm = ({
  question,
  options,
  selectedOptionIds,
  fillText,
  progress,
  countdownValue,
  locked,
  isLoading,
  isSubmitted,
  canSubmit,
  waitingForCountdown,
  onSelectSingle,
  onToggleMultiple,
  onFillTextChange,
  onSubmit
}: QuestionFormProps) => {
  const orderingSequence = fillText.toUpperCase().replace(/[^A-Z]/g, "");
  const matchingStem = question.type === "matching" ? parseMatchingContent(question.content).stem : "";
  const choiceInteractionLocked = locked || (waitingForCountdown && CHOICE_SUBMIT_TYPES.includes(question.type));
  const textInteractionLocked = locked || waitingForCountdown;
  const isMatching = question.type === "matching";

  const missingAnswer =
    (SINGLE_SELECT_TYPES.includes(question.type) && !selectedOptionIds[0]) ||
    (question.type === "multiple_choice" && selectedOptionIds.length === 0) ||
    (question.type === "ordering" && orderingSequence.length === 0) ||
    (question.type === "matching" && !fillText.trim());

  return (
    <Card elevation={0} sx={{ backgroundColor: "transparent", height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent
        sx={{
          p: 0,
          "&:last-child": { pb: 0 },
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: isMatching ? fluid(0.3, 0.45, 0.65) : fluid(0.5, 0.9, 1.2)
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: fluid(0.3, 0.5, 0.6),
            borderRadius: 999,
            "& .MuiLinearProgress-bar": { background: "linear-gradient(90deg, #D4A741, #F5D98A)" },
            bgcolor: "rgba(184,217,236,0.3)"
          }}
        />

        {/* Scrollable content zone: long questions/options stay inside this area,
            while submit button remains visible below. */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: isMatching ? "hidden" : "auto",
            pr: 0.25,
            display: "flex",
            flexDirection: "column",
            gap: isMatching ? fluid(0.25, 0.4, 0.6) : fluid(0.5, 0.9, 1.2),
            // Compact mode on shorter heights to reduce overflow pressure.
            "@media (max-height: 820px)": {
              gap: fluid(0.35, 0.6, 0.9),
              "& .MuiTypography-root": { lineHeight: 1.35 }
            }
          }}
        >
          {countdownValue !== null && !isMatching && (
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <Box
                sx={{
                  minWidth: fluid(6, 9, 10),
                  px: fluid(0.75, 1.1, 1.5),
                  py: fluid(0.4, 0.65, 0.9),
                  borderRadius: 3,
                  textAlign: "center",
                  background: "rgba(255,255,255,0.84)",
                  border: "1px solid rgba(26,140,142,0.22)",
                  boxShadow: "0 10px 24px rgba(23,50,77,0.14)"
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#17324d", fontSize: fluidFont.displaySm, lineHeight: 1 }}>
                  {countdownValue}
                </Typography>
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: isMatching ? fluid(0.35, 0.55, 0.8) : fluid(0.75, 1.2, 1.8),
              alignItems: "stretch"
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              {isMatching ? (
                <Box sx={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "start", gap: fluid(0.5, 0.8, 1) }}>
                  <Typography
                    variant="h6"
                    sx={{
                      color: "#0F172A",
                      fontWeight: 800,
                      lineHeight: 1.25,
                      fontSize: fluidFont.body,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minWidth: 0
                    }}
                    title={matchingStem || question.content}
                  >
                    {matchingStem || question.content}
                  </Typography>
                  {countdownValue !== null && (
                    <Box
                      sx={{
                        width: fluid(2.6, 4.2, 4.5, "vmin"),
                        height: fluid(2.6, 4.2, 4.5, "vmin"),
                        minWidth: "2.4rem",
                        minHeight: "2.4rem",
                        borderRadius: "50%",
                        border: "2px solid rgba(15,107,109,0.28)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 18px rgba(15,107,109,0.12)",
                        flexShrink: 0
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, color: "#17324d", lineHeight: 1, fontSize: fluidFont.subtitle }}>
                        {countdownValue}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : question.type === "fill_blank" ? (
                <QuestionContentWithBlank content={question.content} variant="h6" />
              ) : (
                <Typography
                  variant="h6"
                  sx={{
                    mb: fluid(0.5, 0.9, 1.2),
                    color: "#0F172A",
                    fontWeight: 800,
                    lineHeight: 1.45,
                    fontSize: fluidFont.h6
                  }}
                >
                  {question.content}
                </Typography>
              )}
              {question.imageUrl && (
                <Stack sx={{ mb: fluid(0.5, 1, 1.4), alignItems: "center" }}>
                  <Box
                    component="img"
                    key={`${question.id}-${question.imageUrl}`}
                    src={resolveMediaUrl(question.imageUrl)}
                    alt="Hình minh họa câu hỏi"
                    sx={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: fluid(10, 24, 18, "vh"),
                      borderRadius: 3,
                      objectFit: "contain",
                      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)"
                    }}
                    onError={(event) => {
                      const target = event.currentTarget;
                      target.style.display = "none";
                    }}
                  />
                </Stack>
              )}
            </Box>

            {(SINGLE_SELECT_TYPES.includes(question.type) || question.type === "multiple_choice") && (
              <Box sx={{ minWidth: 0 }}>
                <ChoiceQuestionView
                  type={question.type}
                  options={options}
                  selectedOptionIds={selectedOptionIds}
                  locked={choiceInteractionLocked}
                  onSelectSingle={onSelectSingle}
                  onToggleMultiple={onToggleMultiple}
                />
              </Box>
            )}
          </Box>

          {question.type === "ordering" && (
            <OrderingQuestionView
              options={options}
              orderingSequence={orderingSequence}
              locked={textInteractionLocked}
              onFillTextChange={onFillTextChange}
            />
          )}

          {question.type === "matching" && (
            <MatchingQuestionView
              content={question.content}
              fillText={fillText}
              locked={textInteractionLocked}
              onFillTextChange={onFillTextChange}
            />
          )}
        </Box>

        <Box sx={{ mt: "auto" }}>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!canSubmit || locked || isLoading || missingAnswer}
            fullWidth
            sx={{
              minHeight: fluid(2.5, 3.25, 3.75),
              borderRadius: 3,
              fontWeight: 800,
              fontSize: fluidFont.subtitle,
              background: isSubmitted
                ? "linear-gradient(135deg, #15803D, #22c55e)"
                : "linear-gradient(135deg, #1A8C8E, #0F6B6D)",
              "&:hover": {
                background: isSubmitted
                  ? "linear-gradient(135deg, #15803D, #22c55e)"
                  : "linear-gradient(135deg, #0F6B6D, #0A5557)"
              }
            }}
          >
            {isSubmitted ? "✅ Đã nộp bài" : "Nộp bài"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};
