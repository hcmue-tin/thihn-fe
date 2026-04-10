import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardContent, Checkbox, FormControlLabel, LinearProgress, MenuItem, Radio, Stack, TextField, Typography } from "@mui/material";
import type { QuestionOption, QuestionPayload } from "../../types/realtime";

type QuestionFormProps = {
  question: QuestionPayload;
  options: QuestionOption[];
  selectedOptionIds: number[];
  fillText: string;
  progress: number;
  remainingSeconds: number;
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
  remainingSeconds,
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
  const [selectedLeftKey, setSelectedLeftKey] = useState<string>("");
  const [selectedRightKey, setSelectedRightKey] = useState<string>("");

  const orderingSequence = fillText.toUpperCase().replace(/[^A-Z]/g, "");
  const leftKeys = Array.from(new Set((question.content.match(/\((\d+)\)/g) || []).map((v) => v.replace(/[()]/g, ""))));
  const rightKeys = Array.from(new Set((question.content.match(/\b([A-Z])\./g) || []).map((v) => v.replace(".", ""))));
  const matchingPairs = useMemo(
    () =>
      fillText
        .split(";")
        .map((item) => item.trim().replace(/\./g, ":"))
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, item) => {
          const [l, r] = item.split(":").map((s) => s.trim());
          if (l && r) acc[l] = r.toUpperCase();
          return acc;
        }, {}),
    [fillText]
  );

  useEffect(() => {
    if (question.type !== "matching") {
      setSelectedLeftKey("");
      setSelectedRightKey("");
    }
  }, [question.type, question.id]);

  const buildMatchingText = (pairs: Record<string, string>): string =>
    leftKeys
      .filter((k) => pairs[k])
      .map((k) => `${k}:${pairs[k]}`)
      .join(";");

  const submitPair = (): void => {
    if (!selectedLeftKey || !selectedRightKey) return;
    const next = { ...matchingPairs, [selectedLeftKey]: selectedRightKey };
    onFillTextChange(buildMatchingText(next));
    setSelectedLeftKey("");
    setSelectedRightKey("");
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {question.content}
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 10, mb: 2 }} />
        <Typography variant="body2" sx={{ mb: 2 }}>
          {waitingForCountdown ? "Thời gian còn lại: Chưa bắt đầu đếm ngược" : `Thời gian còn lại: ${remainingSeconds}s`}
        </Typography>

        {(question.type === "single_choice" || question.type === "true_false" || question.type === "listening_choice") &&
          options.map((opt) => (
            <FormControlLabel
              key={opt.id}
              control={<Radio checked={selectedOptionIds[0] === opt.id} onChange={() => onSelectSingle(opt.id)} disabled={locked} />}
              label={`${opt.label}. ${opt.content}`}
            />
          ))}

        {question.type === "multiple_choice" &&
          options.map((opt) => (
            <FormControlLabel
              key={opt.id}
              control={
                <Checkbox
                  checked={selectedOptionIds.includes(opt.id)}
                  onChange={(e) => onToggleMultiple(opt.id, e.target.checked)}
                  disabled={locked}
                />
              }
              label={`${opt.label}. ${opt.content}`}
            />
          ))}

        {question.type === "fill_blank" && (
          <TextField label="Câu trả lời" value={fillText} onChange={(e) => onFillTextChange(e.target.value)} disabled={locked} fullWidth />
        )}

        {question.type === "ordering" && (
          <Stack spacing={1.2}>
            <Typography variant="body2">Chạm theo thứ tự đúng (ví dụ: B D C A)</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {options.map((opt) => (
                <Button
                  key={opt.id}
                  variant="outlined"
                  disabled={locked}
                  onClick={() => onFillTextChange(`${orderingSequence}${opt.label.toUpperCase()}`)}
                >
                  {opt.label}
                </Button>
              ))}
              <Button variant="text" color="warning" disabled={locked || orderingSequence.length === 0} onClick={() => onFillTextChange(orderingSequence.slice(0, -1))}>
                Xóa 1 ký tự
              </Button>
              <Button variant="text" color="error" disabled={locked || orderingSequence.length === 0} onClick={() => onFillTextChange("")}>
                Làm lại
              </Button>
            </Stack>
            <TextField label="Thứ tự hiện tại" value={orderingSequence} disabled fullWidth />
          </Stack>
        )}

        {question.type === "matching" && leftKeys.length > 0 && rightKeys.length > 0 && (
          <Stack spacing={1.2}>
            <Typography variant="body2">Chọn 1 mục ở cột trái và 1 mục ở cột phải để ghép cặp</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Cột trái</Typography>
                {leftKeys.map((left) => (
                  <Button
                    key={left}
                    variant={selectedLeftKey === left ? "contained" : "outlined"}
                    color={matchingPairs[left] ? "success" : "primary"}
                    disabled={locked}
                    onClick={() => setSelectedLeftKey(left)}
                  >
                    Mục {left} {matchingPairs[left] ? `-> ${matchingPairs[left]}` : ""}
                  </Button>
                ))}
              </Stack>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="subtitle2">Cột phải</Typography>
                {rightKeys.map((right) => (
                  <Button
                    key={right}
                    variant={selectedRightKey === right ? "contained" : "outlined"}
                    disabled={locked}
                    onClick={() => setSelectedRightKey(right)}
                  >
                    Đáp án {right}
                  </Button>
                ))}
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={locked || !selectedLeftKey || !selectedRightKey} onClick={submitPair}>
                Ghép cặp đã chọn
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={locked || !selectedLeftKey || !matchingPairs[selectedLeftKey]}
                onClick={() => {
                  if (!selectedLeftKey) return;
                  const next = { ...matchingPairs };
                  delete next[selectedLeftKey];
                  onFillTextChange(buildMatchingText(next));
                }}
              >
                Xóa ghép mục trái
              </Button>
            </Stack>
            <TextField label="Kết quả ghép" value={fillText} onChange={(e) => onFillTextChange(e.target.value)} disabled={locked} fullWidth />
          </Stack>
        )}

        {question.type === "matching" && (leftKeys.length === 0 || rightKeys.length === 0) && (
          <TextField
            label="Câu trả lời (ví dụ 1:C;2:D;3:A)"
            value={fillText}
            onChange={(e) => onFillTextChange(e.target.value)}
            disabled={locked}
            fullWidth
          />
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={onSubmit} disabled={!canSubmit || locked || isLoading}>
            {isSubmitted ? "Đã nộp" : "Nộp bài"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};
