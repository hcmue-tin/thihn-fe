import { Box, Button, Stack, Typography } from "@mui/material";
import type { QuestionOption } from "../../../types/realtime";
import { fluid, fluidFont } from "../../../utils/fluid";

type Props = {
  options: QuestionOption[];
  orderingSequence: string;
  locked: boolean;
  correctAnswerText?: string;
  onFillTextChange: (value: string) => void;
};

export const OrderingQuestionView = ({ options, orderingSequence, locked, correctAnswerText, onFillTextChange }: Props) => {
  const withDisplayLabels = options.map((opt, index) => ({
    ...opt,
    displayLabel: (opt.label?.trim() || String.fromCharCode(65 + index)).toUpperCase()
  }));

  const handleOptionClick = (label: string) => {
    if (locked) return;

    if (orderingSequence.includes(label)) {
      // Remove it if already selected
      onFillTextChange(orderingSequence.replace(label, ""));
    } else {
      // Add it if limit not reached
      if (orderingSequence.length < options.length) {
        onFillTextChange(`${orderingSequence}${label}`);
      }
    }
  };

  return (
    <Stack spacing={fluid(0.5, 0.75, 1)} sx={{ minHeight: 0, overflow: "hidden" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography sx={{ color: "#475569", fontWeight: 700, fontSize: fluidFont.caption, lineHeight: 1.2 }}>
          Chọn vào các đáp án theo thứ tự đúng
        </Typography>
        <Button
          variant="text"
          color="error"
          disabled={locked || orderingSequence.length === 0}
          onClick={() => onFillTextChange("")}
          sx={{ borderRadius: 2, fontWeight: 800, fontSize: fluidFont.caption, minWidth: 0, py: 0 }}
        >
          Làm lại
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
          gap: fluid(0.4, 0.6, 0.8),
          minHeight: 0,
          overflowY: "auto",
          "@media (min-width: 640px)": {
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
          }
        }}
      >
        {withDisplayLabels.map((opt) => {
          const selectedIndex = orderingSequence.indexOf(opt.displayLabel);
          const isSelected = selectedIndex !== -1;
          const orderNumber = selectedIndex + 1;

          return (
            <Button
              key={opt.id}
              variant={isSelected ? "contained" : "outlined"}
              disabled={locked}
              onClick={() => handleOptionClick(opt.displayLabel)}
              sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                p: fluid(0.5, 0.75, 1),
                borderRadius: 2,
                minHeight: fluid(2.5, 3, 3.5),
                borderColor: isSelected ? "transparent" : "rgba(26,140,142,0.3)",
                backgroundColor: isSelected ? "rgba(26,140,142,0.12)" : "rgba(248, 250, 252, 0.75)",
                color: isSelected ? "#0F6B6D" : "#0F172A",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: isSelected ? "rgba(26,140,142,0.2)" : "rgba(26,140,142,0.08)",
                },
                position: "relative",
                overflow: "hidden"
              }}
            >
              <Box sx={{ display: "flex", width: "100%", alignItems: "flex-start", gap: 1 }}>
                <Typography sx={{ fontWeight: 900, fontSize: fluidFont.body, color: isSelected ? "#0F6B6D" : "#1A8C8E" }}>
                  {opt.displayLabel}.
                </Typography>
                <Typography
                  sx={{
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: fluidFont.body,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    flex: 1
                  }}
                  title={opt.content}
                >
                  {opt.content}
                </Typography>
              </Box>

              {isSelected && (
                <Box
                  sx={{
                    position: "absolute",
                    top: fluid(0.2, 0.3, 0.4),
                    right: fluid(0.2, 0.3, 0.4),
                    width: fluid(1.2, 1.5, 1.8),
                    height: fluid(1.2, 1.5, 1.8),
                    borderRadius: "50%",
                    backgroundColor: "#1A8C8E",
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: fluidFont.caption,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                >
                  {orderNumber}
                </Box>
              )}
            </Button>
          );
        })}
      </Box>

      {/* Show the sequence explicitly so they are confident */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "stretch",
          justifyContent: "center",
          gap: fluid(0.5, 0.75, 1)
        }}
      >
        <Box
          sx={{
            minHeight: fluid(2, 2.35, 2.75),
            px: fluid(0.5, 0.75, 1),
            py: fluid(0.25, 0.35, 0.45),
            borderRadius: 2,
            border: "1px dashed rgba(26,140,142,0.4)",
            backgroundColor: "rgba(255,255,255,0.5)",
            color: "#0F6B6D",
            fontWeight: 800,
            fontSize: fluidFont.body,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1
          }}
        >
          {orderingSequence ? (
            <>
              Thứ tự của bạn:
              <Typography sx={{ fontWeight: 900, fontSize: fluidFont.subtitle, letterSpacing: 2 }}>
                {orderingSequence.split('').join(' ')}
              </Typography>
            </>
          ) : (
            "Chưa chọn thứ tự nào"
          )}
        </Box>

        {correctAnswerText && (
          <Box
            sx={{
              minHeight: fluid(2, 2.35, 2.75),
              px: fluid(0.5, 0.75, 1),
              py: fluid(0.25, 0.35, 0.45),
              borderRadius: 2,
              border: "2px solid #22c55e",
              backgroundColor: "rgba(34,197,94,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              animation: "blink-correct-inline 1s ease-in-out infinite",
              "@keyframes blink-correct-inline": {
                "0%, 100%": { borderColor: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.25)" },
                "50%": { borderColor: "#86efac", boxShadow: "0 0 14px rgba(34,197,94,0.45)" }
              }
            }}
          >
            <Typography sx={{ fontWeight: 900, color: "#15803d", fontSize: fluidFont.caption, whiteSpace: "nowrap" }}>
              Đáp án đúng:
            </Typography>
            <Typography sx={{ fontWeight: 900, color: "#15803d", fontSize: fluidFont.subtitle, letterSpacing: 2 }}>
              {correctAnswerText}
            </Typography>
          </Box>
        )}
      </Box>
    </Stack>
  );
};
