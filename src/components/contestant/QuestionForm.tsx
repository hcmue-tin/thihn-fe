import { Box, Button, Card, CardContent, LinearProgress, Stack, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../api";
import type { QuestionOption, QuestionPayload } from "../../types/realtime";
import { fluid, fluidFont } from "../../utils/fluid";
import { renderBoldText } from "../../utils/renderBoldText";
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
  correctOptionIds?: number[];
  correctAnswerText?: string;
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
  correctOptionIds,
  correctAnswerText,
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
  const isOrdering = question.type === "ordering";

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

        {/* Content zone: question + options. When there's an image, 
            use a 2-column layout (left=question+options, right=image) 
            so the image never steals vertical space. */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            pr: 0.25,
            display: "flex",
            flexDirection: question.imageUrl ? "row" : "column",
            gap: question.imageUrl
              ? fluid(0.5, 1, 1.5)
              : isMatching
                ? fluid(0.25, 0.4, 0.6)
                : fluid(0.5, 0.9, 1.2),
            "@media (max-height: 820px)": {
              gap: question.imageUrl ? fluid(0.5, 0.75, 1) : fluid(0.35, 0.6, 0.9),
              "& .MuiTypography-root": { lineHeight: 1.35 }
            }
          }}
        >
          {/* Left column (or full width when no image): question text + options */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: isMatching ? fluid(0.25, 0.4, 0.6) : fluid(0.5, 0.9, 1.2),
              overflow: "hidden"
            }}
          >
            {/* Large countdown – shown by default, shrinks/hides on short viewports */}
            {countdownValue !== null && !isMatching && !question.imageUrl && (
              <Box
                className="countdown-large"
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  flexShrink: 0,
                  "@media (max-height: 600px)": { display: "none" }
                }}
              >
                <Box
                  sx={{
                    minWidth: fluid(6, 9, 10),
                    px: fluid(0.75, 1.1, 1.5),
                    py: fluid(0.4, 0.65, 0.9),
                    borderRadius: 3,
                    textAlign: "center",
                    background: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(26,140,142,0.22)",
                    boxShadow: "0 10px 24px rgba(23,50,77,0.14)",
                    "@media (max-height: 750px)": {
                      minWidth: "auto",
                      px: fluid(0.5, 0.75, 1),
                      py: fluid(0.2, 0.35, 0.5)
                    }
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 900,
                      color: "#17324d",
                      fontSize: fluidFont.displaySm,
                      lineHeight: 1,
                      "@media (max-height: 750px)": { fontSize: fluidFont.h5 }
                    }}
                  >
                    {countdownValue}
                  </Typography>
                </Box>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: isMatching || isOrdering ? fluid(0.35, 0.55, 0.8) : fluid(0.75, 1.2, 1.8),
                alignItems: "stretch",
                flex: 1,
                minHeight: 0,
                overflow: "hidden"
              }}
            >
              <Box sx={{ minWidth: 0, flexShrink: 0 }}>
                {/* Question text + compact inline countdown (inline circle only visible on short screens or when no large countdown) */}
                <Box sx={{ display: "grid", gridTemplateColumns: countdownValue !== null && !question.imageUrl ? "minmax(0, 1fr) auto" : "1fr", alignItems: "start", gap: fluid(0.5, 0.8, 1) }}>
                  {isMatching ? (
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#0F172A",
                        fontWeight: 600,
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
                      {renderBoldText(matchingStem || question.content)}
                    </Typography>
                  ) : question.type === "fill_blank" ? (
                    <QuestionContentWithBlank content={question.content} variant="h6" />
                  ) : (
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#0F172A",
                        fontWeight: 600,
                        lineHeight: 1.35,
                        fontSize: isOrdering ? fluidFont.subtitle : fluidFont.h6,
                        display: "-webkit-box",
                        WebkitLineClamp: question.imageUrl ? 3 : 5,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minWidth: 0
                      }}
                    >
                      {renderBoldText(question.content)}
                    </Typography>
                  )}
                  {/* Compact circle – hidden by default on tall screens (large block is shown), visible on short screens */}
                  {countdownValue !== null && !question.imageUrl && (
                    <Box
                      className="countdown-compact"
                      sx={{
                        width: fluid(2.6, 4.2, 4.5, "vmin"),
                        height: fluid(2.6, 4.2, 4.5, "vmin"),
                        minWidth: "2.4rem",
                        minHeight: "2.4rem",
                        borderRadius: "50%",
                        border: "2px solid rgba(15,107,109,0.28)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                        display: isMatching ? "flex" : "none",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 18px rgba(15,107,109,0.12)",
                        flexShrink: 0,
                        "@media (max-height: 600px)": { display: "flex" }
                      }}
                    >
                      <Typography sx={{ fontWeight: 900, color: "#17324d", lineHeight: 1, fontSize: fluidFont.subtitle }}>
                        {countdownValue}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>

              {(SINGLE_SELECT_TYPES.includes(question.type) || question.type === "multiple_choice") && (
                <Box sx={{ minWidth: 0, flex: 1, minHeight: 0, overflow: "hidden" }}>
                  <ChoiceQuestionView
                    type={question.type}
                    options={options}
                    selectedOptionIds={selectedOptionIds}
                    locked={choiceInteractionLocked}
                    correctOptionIds={correctOptionIds}
                    onSelectSingle={onSelectSingle}
                    onToggleMultiple={onToggleMultiple}
                  />
                </Box>
              )}

              {question.type === "ordering" && (
                <OrderingQuestionView
                  options={options}
                  orderingSequence={orderingSequence}
                  locked={textInteractionLocked}
                  correctAnswerText={correctAnswerText}
                  onFillTextChange={onFillTextChange}
                />
              )}

              {question.type === "matching" && (
                <MatchingQuestionView
                  content={question.content}
                  fillText={fillText}
                  locked={textInteractionLocked}
                  correctAnswerText={correctAnswerText}
                  onFillTextChange={onFillTextChange}
                />
              )}
            </Box>
          </Box>

          {/* Right column: image + countdown (only when image exists) */}
          {question.imageUrl && (
            <Box
              sx={{
                flexShrink: 0,
                width: "min(30vw, 16rem)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 1
              }}
            >
              <Box
                component="img"
                key={`${question.id}-${question.imageUrl}`}
                src={resolveMediaUrl(question.imageUrl)}
                alt="Hình minh họa"
                sx={{
                  display: "block",
                  width: "100%",
                  maxHeight: "60%",
                  borderRadius: 2,
                  objectFit: "contain",
                  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.12)"
                }}
                onError={(event) => {
                  const target = event.currentTarget;
                  target.style.display = "none";
                }}
              />
              {countdownValue !== null && (
                <Box
                  sx={{
                    px: fluid(0.75, 1.1, 1.5),
                    py: fluid(0.3, 0.5, 0.7),
                    borderRadius: 3,
                    textAlign: "center",
                    background: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(26,140,142,0.22)",
                    boxShadow: "0 6px 16px rgba(23,50,77,0.1)"
                  }}
                >
                  <Typography sx={{ fontWeight: 900, color: "#17324d", fontSize: fluidFont.h5, lineHeight: 1 }}>
                    {countdownValue}
                  </Typography>
                </Box>
              )}
            </Box>
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
