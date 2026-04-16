import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../api";
import type { QuestionOption, QuestionPayload } from "../../types/realtime";
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
    <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 10, mb: 2, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #D4A741, #F5D98A)' }, bgcolor: 'rgba(184,217,236,0.3)' }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: { xs: 1.5, md: 2 }, mb: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 0 }} />
          {countdownValue !== null && (
            <Box
              sx={{
                minWidth: { xs: 96, sm: 120, md: 148 },
                px: { xs: 1.25, sm: 1.5, md: 1.75 },
                py: { xs: 0.75, sm: 1, md: 1.25 },
                borderRadius: 3,
                textAlign: "center",
                background: "rgba(255,255,255,0.84)",
                border: "1px solid rgba(26,140,142,0.22)",
                boxShadow: "0 10px 24px rgba(23,50,77,0.14)"
              }}
            >
              <Typography sx={{ fontWeight: 900, color: "#17324d", fontSize: { xs: "2.5rem", sm: "3.2rem", md: "4rem" }, lineHeight: 1 }}>
                {countdownValue}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: isChoiceLayout ? "row" : "column" }, gap: { xs: 2, md: 3 }, alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
            {question.type === "fill_blank" ? (
              <QuestionContentWithBlank content={question.content} variant="h6" />
            ) : (
              <Typography variant="h6" sx={{ mb: 2, color: '#0F172A', fontWeight: 800, lineHeight: 1.5 }}>
                {question.type === "matching" ? matchingStem || question.content : question.content}
              </Typography>
            )}
            {question.imageUrl && (
              <Stack sx={{ mb: 2, alignItems: "center" }}>
                <Box
                  component="img"
                  key={`${question.id}-${question.imageUrl}`}
                  src={resolveMediaUrl(question.imageUrl)}
                  alt="Hình minh họa câu hỏi"
                  sx={{
                    display: "block",
                    maxWidth: "100%",
                    maxHeight: 360,
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
            <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
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

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!canSubmit || locked || isLoading || missingAnswer}
            fullWidth
            sx={{
              minHeight: { xs: 44, sm: 48 },
              borderRadius: 3,
              fontWeight: 800,
              fontSize: { xs: "0.95rem", sm: "1rem" },
              background: isSubmitted ? 'linear-gradient(135deg, #15803D, #22c55e)' : 'linear-gradient(135deg, #1A8C8E, #0F6B6D)',
              '&:hover': { background: isSubmitted ? 'linear-gradient(135deg, #15803D, #22c55e)' : 'linear-gradient(135deg, #0F6B6D, #0A5557)' }
            }}
          >
            {isSubmitted ? "✅ Đã nộp bài" : "Nộp bài"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
