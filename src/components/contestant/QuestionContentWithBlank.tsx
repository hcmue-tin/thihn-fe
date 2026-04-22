import { Box, Typography } from "@mui/material";
import type { ReactElement } from "react";
import { fluid } from "../../utils/fluid";

/** Nhận `___`, `____` hoặc `{{blank}}` trong nội dung để hiển thị chỗ trống. */
const BLANK_RE = /\{\{blank\}\}|_{3,}/g;

type Props = {
  content: string;
  variant?: "h6" | "body1";
  sx?: object;
};

export const QuestionContentWithBlank = ({ content, variant = "h6", sx }: Props): ReactElement => {
  const parts = content.split(BLANK_RE);
  const blanks = content.match(BLANK_RE) ?? [];

  if (blanks.length === 0) {
    return (
      <Typography variant={variant} sx={{ mb: fluid(0.5, 0.9, 1.2), color: "#0F172A", fontWeight: 800, lineHeight: 1.5, ...sx }} component="div">
        {content}
      </Typography>
    );
  }

  return (
    <Typography
      variant={variant}
      component="div"
      sx={{ mb: fluid(0.5, 0.9, 1.2), color: "#0F172A", fontWeight: 800, lineHeight: 1.65, ...sx }}
    >
      {parts.map((part, i) => (
        <span key={`p-${i}-${part.slice(0, 12)}`}>
          {part}
          {i < blanks.length && (
            <Box
              component="span"
              sx={{
                display: "inline-block",
                // Blank width scales with the text itself via em units.
                minWidth: "4em",
                borderBottom: "0.2em solid",
                borderColor: "#1A8C8E",
                mx: "0.4em",
                verticalAlign: "baseline",
                height: "1.05em",
                borderRadius: "2px 2px 0 0"
              }}
            />
          )}
        </span>
      ))}
    </Typography>
  );
};
