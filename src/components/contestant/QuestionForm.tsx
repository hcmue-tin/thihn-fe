import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, CardContent, Checkbox, LinearProgress, Radio, Stack, TextField, Typography } from "@mui/material";
import { resolveMediaUrl } from "../../api";
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
  const interactionLocked = locked || waitingForCountdown;

  return (
    <Card elevation={0} sx={{ backgroundColor: 'transparent' }}>
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Typography variant="h6" sx={{ mb: 2, color: '#0F172A', fontWeight: 800, lineHeight: 1.5 }}>
          {question.content}
        </Typography>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="body2">
            {waitingForCountdown ? "Chưa bắt đầu đếm ngược" : "Đang đếm ngược"}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {waitingForCountdown ? "--" : `${remainingSeconds}s`}
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 10, mb: 2, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #D4A741, #F5D98A)' }, bgcolor: 'rgba(184,217,236,0.3)' }} />

        {(question.type === "single_choice" || question.type === "true_false" || question.type === "listening_choice") && (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {options.map((opt) => {
              const isSelected = selectedOptionIds[0] === opt.id;
              return (
                <Box
                  key={opt.id}
                  onClick={() => !interactionLocked && onSelectSingle(opt.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: isSelected ? '#1A8C8E' : 'rgba(26,140,142,0.15)',
                    backgroundColor: isSelected ? 'rgba(26,140,142,0.05)' : '#ffffff',
                    cursor: interactionLocked ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(26,140,142,0.1)' : 'none',
                    '&:hover': {
                      backgroundColor: interactionLocked ? (isSelected ? 'rgba(26,140,142,0.05)' : '#ffffff') : 'rgba(26,140,142,0.08)',
                      borderColor: interactionLocked ? (isSelected ? '#1A8C8E' : 'rgba(26,140,142,0.15)') : '#1A8C8E'
                    }
                  }}
                >
                  <Radio
                    checked={isSelected}
                    onChange={() => onSelectSingle(opt.id)}
                    disabled={interactionLocked}
                    sx={{ p: 0, mr: 1.5, color: '#1A8C8E', '&.Mui-checked': { color: '#1A8C8E' } }}
                  />
                  <Typography sx={{ fontWeight: isSelected ? 600 : 400, color: '#1E293B', wordBreak: 'break-word' }}>
                    {opt.label}. {opt.content}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        {question.type === "multiple_choice" && (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {options.map((opt) => {
              const isSelected = selectedOptionIds.includes(opt.id);
              return (
                <Box
                  key={opt.id}
                  onClick={() => !interactionLocked && onToggleMultiple(opt.id, !isSelected)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: isSelected ? '#1A8C8E' : 'rgba(26,140,142,0.15)',
                    backgroundColor: isSelected ? 'rgba(26,140,142,0.05)' : '#ffffff',
                    cursor: interactionLocked ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(26,140,142,0.1)' : 'none',
                    '&:hover': {
                      backgroundColor: interactionLocked ? (isSelected ? 'rgba(26,140,142,0.05)' : '#ffffff') : 'rgba(26,140,142,0.08)',
                      borderColor: interactionLocked ? (isSelected ? '#1A8C8E' : 'rgba(26,140,142,0.15)') : '#1A8C8E'
                    }
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => onToggleMultiple(opt.id, e.target.checked)}
                    disabled={interactionLocked}
                    sx={{ p: 0, mr: 1.5, color: '#1A8C8E', '&.Mui-checked': { color: '#1A8C8E' } }}
                  />
                  <Typography sx={{ fontWeight: isSelected ? 600 : 400, color: '#1E293B', wordBreak: 'break-word' }}>
                    {opt.label}. {opt.content}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}

        {question.type === "fill_blank" && (
          <TextField label="Câu trả lời" value={fillText} onChange={(e) => onFillTextChange(e.target.value)} disabled={interactionLocked} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, backgroundColor: '#f8fafc' } }} />
        )}

        {question.type === "ordering" && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Chạm theo thứ tự đúng (ví dụ: B D C A)</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {options.map((opt) => (
                <Button
                  key={opt.id}
                  variant="outlined"
                  disabled={interactionLocked}
                  onClick={() => onFillTextChange(`${orderingSequence}${opt.label.toUpperCase()}`)}
                  sx={{ borderRadius: 2, minWidth: 48, fontWeight: 700, borderColor: '#1A8C8E', color: '#1A8C8E', '&:hover': { backgroundColor: 'rgba(26,140,142,0.08)', borderColor: '#1A8C8E' } }}
                >
                  {opt.label}
                </Button>
              ))}
              <Button variant="text" color="warning" disabled={interactionLocked || orderingSequence.length === 0} onClick={() => onFillTextChange(orderingSequence.slice(0, -1))} sx={{ borderRadius: 2, fontWeight: 600 }}>
                Xóa 1 ký tự
              </Button>
              <Button variant="text" color="error" disabled={interactionLocked || orderingSequence.length === 0} onClick={() => onFillTextChange("")} sx={{ borderRadius: 2, fontWeight: 600 }}>
                Làm lại
              </Button>
            </Box>
            <TextField label="Thứ tự hiện tại" value={orderingSequence} disabled fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, backgroundColor: '#f8fafc', fontWeight: 600 } }} />
          </Stack>
        )}

        {question.type === "matching" && leftKeys.length > 0 && rightKeys.length > 0 && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>Chọn 1 mục ở cột trái và 1 mục ở cột phải để ghép cặp</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.5 }}>Cột trái</Typography>
                {leftKeys.map((left) => (
                  <Button
                    key={left}
                    variant={selectedLeftKey === left ? "contained" : "outlined"}
                    color={matchingPairs[left] ? "success" : "primary"}
                    disabled={interactionLocked}
                    onClick={() => setSelectedLeftKey(left)}
                    sx={{ borderRadius: 2, justifyContent: 'flex-start', textAlign: 'left', px: 2, py: 1.5, textTransform: 'none', fontWeight: selectedLeftKey === left ? 600 : 500, borderColor: matchingPairs[left] ? undefined : 'rgba(26,140,142,0.3)', color: matchingPairs[left] ? undefined : '#0F6B6D', '&:hover': { borderColor: '#1A8C8E', backgroundColor: matchingPairs[left] ? undefined : 'rgba(26,140,142,0.05)' } }}
                  >
                    Mục {left} {matchingPairs[left] && <span style={{ marginLeft: 8, fontWeight: 700 }}>→ {matchingPairs[left]}</span>}
                  </Button>
                ))}
              </Stack>
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ color: '#1E293B', fontWeight: 600, mb: 0.5 }}>Cột phải</Typography>
                {rightKeys.map((right) => (
                  <Button
                    key={right}
                    variant={selectedRightKey === right ? "contained" : "outlined"}
                    disabled={interactionLocked}
                    onClick={() => setSelectedRightKey(right)}
                    sx={{ borderRadius: 2, px: 2, py: 1.5, textTransform: 'none', fontWeight: selectedRightKey === right ? 600 : 500, borderColor: 'rgba(26,140,142,0.3)', color: '#0F6B6D', '&:hover': { borderColor: '#1A8C8E', backgroundColor: 'rgba(26,140,142,0.05)' }, ...(selectedRightKey === right ? { color: 'white', backgroundColor: '#1A8C8E', '&:hover': { backgroundColor: '#0F6B6D' } } : {}) }}
                  >
                    Đáp án {right}
                  </Button>
                ))}
              </Stack>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              <Button variant="contained" disabled={interactionLocked || !selectedLeftKey || !selectedRightKey} onClick={submitPair} sx={{ borderRadius: 2, fontWeight: 600, px: 3, background: 'linear-gradient(135deg, #1A8C8E, #0F6B6D)', '&:hover': { background: 'linear-gradient(135deg, #0F6B6D, #0A5557)' } }}>
                Ghép cặp đã chọn
              </Button>
              <Button
                variant="outlined"
                color="warning"
                disabled={interactionLocked || !selectedLeftKey || !matchingPairs[selectedLeftKey]}
                onClick={() => {
                  if (!selectedLeftKey) return;
                  const next = { ...matchingPairs };
                  delete next[selectedLeftKey];
                  onFillTextChange(buildMatchingText(next));
                }}
                sx={{ borderRadius: 2, fontWeight: 600, px: 3 }}
              >
                Xóa ghép mục trái
              </Button>
            </Box>
            <TextField label="Kết quả ghép" value={fillText} onChange={(e) => onFillTextChange(e.target.value)} disabled={interactionLocked} fullWidth sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, backgroundColor: '#f8fafc' } }} />
          </Stack>
        )}

        {question.type === "matching" && (leftKeys.length === 0 || rightKeys.length === 0) && (
          <TextField
            label="Câu trả lời (ví dụ 1:C;2:D;3:A)"
            value={fillText}
            onChange={(e) => onFillTextChange(e.target.value)}
            disabled={interactionLocked}
            fullWidth
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, backgroundColor: '#f8fafc' } }}
          />
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={onSubmit}
            disabled={!canSubmit || locked || isLoading}
            fullWidth
            sx={{
              height: 48,
              borderRadius: 3,
              fontWeight: 800,
              fontSize: "1rem",
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
