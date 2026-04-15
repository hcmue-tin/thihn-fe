import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

type Props = {
  openCreate: boolean;
  openEdit: boolean;
  examSetName: string;
  examSetOrderNum: number;
  editExamSetName: string;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onExamSetNameChange: (value: string) => void;
  onEditExamSetNameChange: (value: string) => void;
  onCreate: () => Promise<void> | void;
  onUpdate: () => Promise<void> | void;
};

export const ExamSetDialogs = ({
  openCreate,
  openEdit,
  examSetName,
  examSetOrderNum,
  editExamSetName,
  onCloseCreate,
  onCloseEdit,
  onExamSetNameChange,
  onEditExamSetNameChange,
  onCreate,
  onUpdate
}: Props) => (
  <>
    <Dialog open={openCreate} onClose={onCloseCreate} fullWidth maxWidth="sm">
      <DialogTitle>Tạo bộ đề mới</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <TextField
          size="small"
          label="Tên bộ đề"
          value={examSetName}
          onChange={(e) => onExamSetNameChange(e.target.value)}
          placeholder="Ví dụ: Nhịp cầu Hán ngữ 2026 - Vòng 1"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseCreate}>Hủy</Button>
        <Button variant="contained" onClick={() => void onCreate()} disabled={!examSetName.trim() || examSetOrderNum < 1}>
          Tạo bộ đề
        </Button>
      </DialogActions>
    </Dialog>
    <Dialog open={openEdit} onClose={onCloseEdit} fullWidth maxWidth="sm">
      <DialogTitle>Sửa bộ đề</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
        <TextField size="small" label="Tên bộ đề" value={editExamSetName} onChange={(e) => onEditExamSetNameChange(e.target.value)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseEdit}>Hủy</Button>
        <Button variant="contained" onClick={() => void onUpdate()} disabled={!editExamSetName.trim()}>
          Cập nhật
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
