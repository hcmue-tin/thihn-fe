import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { api } from "../../api";
import { MatchingEditor } from "./MatchingEditor";
import { MATCHING_MAX, MATCHING_MIN } from "./matchingEditorUtils";
import { buildQuestionContent, parseAcceptedAnswers } from "./questionFormUtils";
import { AcceptedAnswerEditor } from "./question-edit/AcceptedAnswerEditor";
import { ChoiceOptionsEditor } from "./question-edit/ChoiceOptionsEditor";
import type { QuestionType } from "../../types/question";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedExamSetId: number | null;
  defaultOrderNum: number;
  onCreated: () => Promise<void>;
};

const typeOptions: Array<{ value: QuestionType; label: string }> = [
  { value: "true_false", label: "Dạng 1 - Phán đoán đúng/sai" },
  { value: "single_choice", label: "Dạng 2 - Chọn một đáp án đúng" },
  { value: "multiple_choice", label: "Dạng 2b - Chọn nhiều đáp án đúng" },
  { value: "fill_blank", label: "Dạng 3 - Điền vào chỗ trống" },
  { value: "ordering", label: "Dạng 4 - Sắp xếp thành câu/đoạn" },
  { value: "matching", label: "Dạng 5 - Nối nội dung tương ứng" }
];

const defaultFourOptions = [
  { label: "A", content: "", isCorrect: false, orderNum: 1 },
  { label: "B", content: "", isCorrect: false, orderNum: 2 },
  { label: "C", content: "", isCorrect: false, orderNum: 3 },
  { label: "D", content: "", isCorrect: false, orderNum: 4 }
];

export const QuestionCreatorDialog = ({ open, onClose, selectedExamSetId, defaultOrderNum, onCreated }: Props) => {
  const [type, setType] = useState<QuestionType>("single_choice");
  const [content, setContent] = useState("");
  const [score, setScore] = useState(1);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [orderNum, setOrderNum] = useState(defaultOrderNum);
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [orderingAnswer, setOrderingAnswer] = useState("");
  const [matchingN, setMatchingN] = useState(4);
  const [matchingLeft, setMatchingLeft] = useState<string[]>(() => Array(4).fill(""));
  const [matchingRight, setMatchingRight] = useState<string[]>(() => Array(4).fill(""));
  const [matchingAccepted, setMatchingAccepted] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [options, setOptions] = useState(defaultFourOptions);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const showOptions = useMemo(
    () => type !== "matching",
    [type]
  );

  useEffect(() => {
    if (open) {
      setOrderNum(defaultOrderNum);
    }
  }, [open, defaultOrderNum]);

  useEffect(() => {
    if (type === "true_false") {
      setOptions([
        { label: "A", content: "", isCorrect: false, orderNum: 1 },
        { label: "B", content: "", isCorrect: false, orderNum: 2 }
      ]);
    } else if (type === "ordering" || type === "single_choice" || type === "multiple_choice" || type === "fill_blank") {
      setOptions(defaultFourOptions.map((o) => ({ ...o })));
    }
    if (type === "matching") {
      setMatchingN(4);
      setMatchingLeft(Array(4).fill(""));
      setMatchingRight(Array(4).fill(""));
      setMatchingAccepted("");
    }
  }, [type]);

  const resizeMatching = (n: number): void => {
    const clamp = Math.min(MATCHING_MAX, Math.max(MATCHING_MIN, n));
    setMatchingN(clamp);
    setMatchingLeft((prev) => {
      const next = [...prev];
      while (next.length < clamp) next.push("");
      return next.slice(0, clamp);
    });
    setMatchingRight((prev) => {
      const next = [...prev];
      while (next.length < clamp) next.push("");
      return next.slice(0, clamp);
    });
  };

  const reset = () => {
    setType("single_choice");
    setContent("");
    setScore(1);
    setCountdownSeconds(10);
    setOrderNum(defaultOrderNum);
    setAudioUrl("");
    setImageUrl("");
    setOrderingAnswer("");
    setMatchingN(4);
    setMatchingLeft(Array(4).fill(""));
    setMatchingRight(Array(4).fill(""));
    setMatchingAccepted("");
    setOptions(defaultFourOptions.map((o) => ({ ...o })));
    setSubmitError(null);
  };

  const submit = async () => {
    if (!selectedExamSetId) return;
    setSubmitError(null);
    let finalContent = content.trim();
    let fillBlankAnswers: Array<{ acceptedAnswer: string }> = [];

    if (type === "ordering") {
      fillBlankAnswers = parseAcceptedAnswers(orderingAnswer, type);
    } else if (type === "matching") {
      finalContent = buildQuestionContent(type, content, matchingLeft, matchingRight);
      fillBlankAnswers = parseAcceptedAnswers(matchingAccepted, type);
    }

    const optionsPayload = showOptions
      ? options
          .filter((o) => o.content.trim().length > 0)
          .map((o) => ({
            label: o.label,
            content: o.content,
            isCorrect: o.isCorrect,
            orderNum: o.orderNum
          }))
      : [];

    try {
      await api.post("/questions", {
        examSetId: selectedExamSetId,
        type,
        content: finalContent,
        imageUrl: imageUrl || null,
        audioUrl: audioUrl || null,
        countdownSeconds,
        score,
        orderNum,
        options: optionsPayload,
        fillBlankAnswers
      });
      await onCreated();
      reset();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
          : "";
      setSubmitError(msg || "Không thể lưu câu hỏi");
    }
  };

  const uploadFile = async (file: File, kind: "image" | "audio"): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    if (kind === "image") {
      setIsUploadingImage(true);
    } else {
      setIsUploadingAudio(true);
    }
    try {
      const res = await api.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      const url = res.data?.data?.fileUrl as string;
      if (kind === "image") {
        setImageUrl(url);
      } else {
        setAudioUrl(url);
      }
    } finally {
      if (kind === "image") {
        setIsUploadingImage(false);
      } else {
        setIsUploadingAudio(false);
      }
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Tạo câu hỏi mới</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <TextField select size="small" label="Dạng câu hỏi" value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
          {typeOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField size="small" label="Nội dung câu hỏi" value={content} onChange={(e) => setContent(e.target.value)} multiline minRows={2} />
        {type === "fill_blank" && (
          <Typography variant="body2" sx={{ color: "#475569" }}>
            Dùng <strong>___</strong> trong câu để hiển thị chỗ trống. Thí sinh chọn một trong bốn đáp án
            A–D.
          </Typography>
        )}

        {type === "matching" && (
          <Box component="ul" sx={{ color: "#475569", m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2">
              Cột trái: mục <strong>1, 2, 3, 4</strong> — cột phải: <strong>A, B, C, D</strong>.
            </Typography>
            <Typography component="li" variant="body2">
              Có thể tăng lên <strong>8 cặp</strong>.
            </Typography>
            <Typography component="li" variant="body2">
              Đáp án đúng: nhập <strong>1:A;2:B;3:C;4:D</strong> hoặc ghép nhanh bên dưới.
            </Typography>
          </Box>
        )}

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Điểm" type="number" value={score} onChange={(e) => setScore(Number(e.target.value))} />
          <TextField
            size="small"
            label="Thời gian (giây)"
            type="number"
            value={countdownSeconds}
            onChange={(e) => setCountdownSeconds(Number(e.target.value))}
          />
        </Stack>
        <Stack spacing={1}>
          <TextField size="small" label="URL hình ảnh (tự động sau khi tải lên)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <Button variant="outlined" component="label" disabled={isUploadingImage}>
            Tải ảnh lên server
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await uploadFile(file, "image");
                }
                e.currentTarget.value = "";
              }}
            />
          </Button>
          {isUploadingImage && <LinearProgress />}
        </Stack>

        <Stack spacing={1}>
          <TextField size="small" label="URL âm thanh (tự động sau khi tải lên)" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} />
          <Button variant="outlined" component="label" disabled={isUploadingAudio}>
            Tải âm thanh lên server
            <input
              type="file"
              hidden
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.webm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await uploadFile(file, "audio");
                }
                e.currentTarget.value = "";
              }}
            />
          </Button>
          {isUploadingAudio && <LinearProgress />}
        </Stack>

        {showOptions && (
          <ChoiceOptionsEditor type={type} options={options} onChange={setOptions} />
        )}

        {type === "ordering" && (
          <AcceptedAnswerEditor label="Thứ tự đúng" value={orderingAnswer} onChange={setOrderingAnswer} helperText="Ví dụ: BDCA" />
        )}

        {type === "matching" && (
          <MatchingEditor
            count={matchingN}
            minCount={MATCHING_MIN}
            maxCount={MATCHING_MAX}
            leftItems={matchingLeft}
            rightItems={matchingRight}
            accepted={matchingAccepted}
            acceptedLabel="Đáp án mẫu: 1:A;2:B;3:C;4:D"
            onResize={resizeMatching}
            onLeftChange={(index, value) => {
              const next = [...matchingLeft];
              next[index] = value;
              setMatchingLeft(next);
            }}
            onRightChange={(index, value) => {
              const next = [...matchingRight];
              next[index] = value;
              setMatchingRight(next);
            }}
            onAcceptedChange={setMatchingAccepted}
          />
        )}

        {submitError && (
          <Typography color="error" variant="body2">
            {submitError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={
            !selectedExamSetId ||
            !content.trim() ||
            (type === "matching" &&
              (!matchingAccepted.trim() ||
                !matchingLeft.some((s) => s.trim()) ||
                !matchingRight.some((s) => s.trim())))
          }
        >
          Lưu câu hỏi
        </Button>
      </DialogActions>
    </Dialog>
  );
};
