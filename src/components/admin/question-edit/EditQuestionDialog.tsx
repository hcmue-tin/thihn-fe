import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import { MatchingEditor } from "../MatchingEditor";
import { MATCHING_MAX, MATCHING_MIN } from "../matchingEditorUtils";
import { CHOICE_TYPES } from "../questionTypeGroups";
import { AcceptedAnswerEditor } from "./AcceptedAnswerEditor";
import { ChoiceOptionsEditor } from "./ChoiceOptionsEditor";
import type { EditableQuestionOption, EditableQuestion } from "../../../hooks/admin/useQuestionEditorState";

type Props = {
  open: boolean;
  questionType: EditableQuestion["type"];
  content: string;
  countdown: number;
  score: number;
  options: EditableQuestionOption[];
  acceptedAnswers: string;
  matchingN: number;
  matchingLeft: string[];
  matchingRight: string[];
  imageUrl: string;
  audioUrl: string;
  isUploadingImage: boolean;
  isUploadingAudio: boolean;
  onClose: () => void;
  onSave: () => void;
  onContentChange: (value: string) => void;
  onCountdownChange: (value: number) => void;
  onScoreChange: (value: number) => void;
  onOptionChange: (next: EditableQuestionOption[]) => void;
  onAcceptedAnswersChange: (value: string) => void;
  onResizeMatching: (n: number) => void;
  onMatchingLeftChange: (idx: number, value: string) => void;
  onMatchingRightChange: (idx: number, value: string) => void;
  onImageUrlChange: (value: string) => void;
  onAudioUrlChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<void>;
  onUploadAudio: (file: File) => Promise<void>;
};

export const EditQuestionDialog = ({
  open,
  questionType,
  content,
  countdown,
  score,
  options,
  acceptedAnswers,
  matchingN,
  matchingLeft,
  matchingRight,
  imageUrl,
  audioUrl,
  isUploadingImage,
  isUploadingAudio,
  onClose,
  onSave,
  onContentChange,
  onCountdownChange,
  onScoreChange,
  onOptionChange,
  onAcceptedAnswersChange,
  onResizeMatching,
  onMatchingLeftChange,
  onMatchingRightChange,
  onImageUrlChange,
  onAudioUrlChange,
  onUploadImage,
  onUploadAudio
}: Props) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>Sửa câu hỏi</DialogTitle>
    <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
      <TextField size="small" label="Nội dung câu hỏi" value={content} onChange={(e) => onContentChange(e.target.value)} multiline minRows={2} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <TextField size="small" label="Thời gian (giây)" type="number" value={countdown} onChange={(e) => onCountdownChange(Number(e.target.value))} />
        <TextField size="small" label="Điểm" type="number" value={score} onChange={(e) => onScoreChange(Number(e.target.value))} />
      </Stack>

      {CHOICE_TYPES.includes(questionType) && (
        <ChoiceOptionsEditor type={questionType} options={options} onChange={onOptionChange} />
      )}

      {questionType === "fill_blank" && (
        <Typography variant="body2" sx={{ color: "#475569" }}>
          Đánh dấu một đáp án đúng (A-D). Trong nội dung câu dùng <strong>___</strong> để hiển thị chỗ trống.
        </Typography>
      )}

      {questionType === "ordering" && (
        <AcceptedAnswerEditor label="Thứ tự đúng" value={acceptedAnswers} onChange={onAcceptedAnswersChange} helperText="Ví dụ: BDCA" />
      )}

      {questionType === "matching" && (
        <Stack spacing={1.25}>
          <Box component="ul" sx={{ color: "#475569", m: 0, pl: 2.5 }}>
            <Typography component="li" variant="body2">Cột trái: mục <strong>1, 2, 3, 4…</strong> — cột phải: <strong>A, B, C, D…</strong>.</Typography>
            <Typography component="li" variant="body2">Có thể tăng lên <strong>8 cặp</strong>.</Typography>
            <Typography component="li" variant="body2">Đáp án đúng: nhập <strong>1:A;2:B;3:C;4:D</strong> hoặc ghép nhanh bên dưới.</Typography>
          </Box>
          <MatchingEditor
            count={matchingN}
            minCount={MATCHING_MIN}
            maxCount={MATCHING_MAX}
            leftItems={matchingLeft}
            rightItems={matchingRight}
            accepted={acceptedAnswers}
            acceptedLabel="Đáp án mẫu: 1:A;2:B;3:C;4:D"
            onResize={onResizeMatching}
            onLeftChange={onMatchingLeftChange}
            onRightChange={onMatchingRightChange}
            onAcceptedChange={onAcceptedAnswersChange}
          />
        </Stack>
      )}

      <TextField size="small" label="Link ảnh" value={imageUrl} onChange={(e) => onImageUrlChange(e.target.value)} />
      <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />} disabled={isUploadingImage} sx={{ width: "fit-content" }}>
        {isUploadingImage ? "Đang tải ảnh..." : "Tải ảnh lên"}
        <input
          type="file"
          hidden
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onUploadImage(file);
            e.currentTarget.value = "";
          }}
        />
      </Button>
      <TextField size="small" label="Link âm thanh" value={audioUrl} onChange={(e) => onAudioUrlChange(e.target.value)} />
      <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />} disabled={isUploadingAudio} sx={{ width: "fit-content" }}>
        {isUploadingAudio ? "Đang tải âm thanh..." : "Tải âm thanh lên"}
        <input
          type="file"
          hidden
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.opus,.webm,.flac"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await onUploadAudio(file);
            e.currentTarget.value = "";
          }}
        />
      </Button>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Hủy</Button>
      <Button variant="contained" onClick={onSave} disabled={!content.trim()}>
        Cập nhật câu hỏi
      </Button>
    </DialogActions>
  </Dialog>
);
