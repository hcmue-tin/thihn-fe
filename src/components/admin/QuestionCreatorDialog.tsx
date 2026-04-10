import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Stack,
  Switch,
  TextField
} from "@mui/material";
import { api } from "../../api";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedExamSetId: number | null;
  defaultOrderNum: number;
  onCreated: () => Promise<void>;
};

type QuestionType = "true_false" | "single_choice" | "multiple_choice" | "fill_blank" | "ordering" | "matching" | "listening_choice";

const typeOptions: Array<{ value: QuestionType; label: string }> = [
  { value: "true_false", label: "Dạng 1 - Phán đoán đúng/sai" },
  { value: "single_choice", label: "Dạng 2 - Chọn đáp án đúng" },
  { value: "fill_blank", label: "Dạng 3 - Điền vào chỗ trống" },
  { value: "ordering", label: "Dạng 4 - Sắp xếp thành câu/đoạn" },
  { value: "matching", label: "Dạng 5 - Nối nội dung tương ứng" },
  { value: "listening_choice", label: "Dạng 6 - Nghe và chọn đáp án đúng" }
];

export const QuestionCreatorDialog = ({ open, onClose, selectedExamSetId, defaultOrderNum, onCreated }: Props) => {
  const [type, setType] = useState<QuestionType>("single_choice");
  const [content, setContent] = useState("");
  const [score, setScore] = useState(1);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [orderNum, setOrderNum] = useState(defaultOrderNum);
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [acceptedAnswer, setAcceptedAnswer] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [options, setOptions] = useState([
    { label: "A", content: "", isCorrect: false, orderNum: 1 },
    { label: "B", content: "", isCorrect: false, orderNum: 2 },
    { label: "C", content: "", isCorrect: false, orderNum: 3 },
    { label: "D", content: "", isCorrect: false, orderNum: 4 }
  ]);

  const showOptions = useMemo(() => ["true_false", "single_choice", "multiple_choice", "fill_blank", "listening_choice"].includes(type), [type]);
  const showAccepted = useMemo(() => ["fill_blank", "ordering", "matching"].includes(type), [type]);

  useEffect(() => {
    if (open) {
      setOrderNum(defaultOrderNum);
    }
  }, [open, defaultOrderNum]);

  const reset = () => {
    setType("single_choice");
    setContent("");
    setScore(1);
    setCountdownSeconds(10);
    setOrderNum(defaultOrderNum);
    setAudioUrl("");
    setImageUrl("");
    setAcceptedAnswer("");
    setOptions([
      { label: "A", content: "", isCorrect: false, orderNum: 1 },
      { label: "B", content: "", isCorrect: false, orderNum: 2 },
      { label: "C", content: "", isCorrect: false, orderNum: 3 },
      { label: "D", content: "", isCorrect: false, orderNum: 4 }
    ]);
  };

  const submit = async () => {
    if (!selectedExamSetId) return;
    await api.post("/questions", {
      examSetId: selectedExamSetId,
      type,
      content,
      imageUrl: imageUrl || null,
      audioUrl: audioUrl || null,
      countdownSeconds,
      score,
      orderNum,
      options: showOptions
        ? options
            .filter((o) => o.content.trim().length > 0 || type === "true_false")
            .map((o, idx) => ({
              label: o.label,
              content: type === "true_false" ? (idx === 0 ? "正确" : idx === 1 ? "错误" : o.content) : o.content,
              isCorrect: o.isCorrect,
              orderNum: o.orderNum
            }))
        : [],
      fillBlankAnswers: showAccepted
        ? acceptedAnswer
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((accepted) => ({ acceptedAnswer: accepted }))
        : []
    });
    await onCreated();
    reset();
    onClose();
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" label="Số thứ tự câu" type="number" value={orderNum} onChange={(e) => setOrderNum(Number(e.target.value))} />
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
              accept="audio/*"
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
          <Stack spacing={1}>
            {options.map((opt, idx) => (
              <Box key={opt.label} sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: "center" }}>
                <TextField
                  size="small"
                  label={`Đáp án ${opt.label}`}
                  value={type === "true_false" ? (idx === 0 ? "正确" : idx === 1 ? "错误" : opt.content) : opt.content}
                  onChange={(e) => {
                    const next = [...options];
                    next[idx].content = e.target.value;
                    setOptions(next);
                  }}
                  fullWidth
                  disabled={type === "true_false" && idx < 2}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={opt.isCorrect}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx].isCorrect = e.target.checked;
                        if (["true_false", "single_choice", "listening_choice", "fill_blank"].includes(type) && e.target.checked) {
                          next.forEach((it, i) => {
                            if (i !== idx) it.isCorrect = false;
                          });
                        }
                        setOptions(next);
                      }}
                    />
                  }
                  label="Đúng"
                />
              </Box>
            ))}
          </Stack>
        )}

        {showAccepted && (
          <TextField
            size="small"
            label="Đáp án chuẩn (cách nhau bằng ;)"
            value={acceptedAnswer}
            onChange={(e) => setAcceptedAnswer(e.target.value)}
            helperText='Ví dụ: BDCA hoặc 1:C;2:D;3:A hoặc "井底之蛙"'
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button variant="contained" onClick={submit} disabled={!selectedExamSetId || !content}>
          Lưu câu hỏi
        </Button>
      </DialogActions>
    </Dialog>
  );
};
