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

  const missingAnswer =
    (SINGLE_SELECT_TYPES.includes(question.type) && !selectedOptionIds[0]) ||
    (question.type === "multiple_choice" && selectedOptionIds.length === 0) ||
    (question.type === "ordering" && orderingSequence.length === 0) ||
    (question.type === "matching" && !fillText.trim());
  const isChoiceLayout = SINGLE_SELECT_TYPES.includes(question.type) || question.type === "multiple_choice";

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
          gap: fluid(0.5, 0.9, 1.2)
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

        {countdownValue !== null && (
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
            display: "grid",
            gap: fluid(0.75, 1.2, 1.8),
            alignItems: "start",
            // Choice questions split into two columns when there's enough
            // room (via auto-fit minmax). Text-input questions stay single
            // column. This adapts fluidly without hardcoded breakpoints.
            gridTemplateColumns: isChoiceLayout ? "repeat(auto-fit, minmax(min(22rem, 100%), 1fr))" : "1fr"
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {question.type === "fill_blank" ? (
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
                {question.type === "matching" ? matchingStem || question.content : question.content}
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
                    // Fluid max-height: keeps image from dominating the
                    // viewport on small screens but lets it breathe on LED.
                    maxHeight: fluid(12, 30, 22, "vh"),
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

          {isChoiceLayout && (
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
