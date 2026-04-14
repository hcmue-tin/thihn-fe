import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

type Contestant = { id: number; teamId: number | null; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type Team = { id: number; name: string };

type ContestantDataGridProps = {
  contestants: Contestant[];
  contestantName: string;
  contestantCode: string;
  contestantPassword: string;
  teams: Team[];
  onContestantNameChange: (value: string) => void;
  onContestantCodeChange: (value: string) => void;
  onContestantPasswordChange: (value: string) => void;
  onAddContestant: () => void;
  onEditContestant: (id: number, data: { name: string; code: string; unit: string | null; teamId: number | null }) => void | Promise<void>;
  onDeleteContestant: (id: number) => void | Promise<void>;
};

export const ContestantDataGrid = ({
  contestants,
  contestantName,
  contestantCode,
  contestantPassword,
  teams,
  onContestantNameChange,
  onContestantCodeChange,
  onContestantPasswordChange,
  onAddContestant,
  onEditContestant,
  onDeleteContestant
}: ContestantDataGridProps) => {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<Contestant | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editTeamId, setEditTeamId] = useState<number | "">("");
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  const openEditFor = (c: Contestant) => {
    setEditTarget(c);
    setEditName(c.name);
    setEditCode(c.code);
    setEditUnit(c.unit ?? "");
    setEditTeamId(c.teamId ?? "");
    setOpenEdit(true);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Quản lý thí sinh</Typography>
        <Button
          sx={{ my: 1.5, background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
          variant="contained"
          onClick={() => setOpenCreate(true)}
        >
          + Tạo thí sinh
        </Button>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, color: "#0F6B6D" } }}>
              <TableCell>Tên</TableCell>
              <TableCell>Mã</TableCell>
              <TableCell>Đơn vị</TableCell>
              <TableCell>Đội</TableCell>
              <TableCell>Điểm</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contestants.map((c) => (
              <TableRow key={c.id} sx={{ "&:nth-of-type(odd)": { bgcolor: "#F7FBFD" } }}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>{c.unit || "—"}</TableCell>
                <TableCell>{c.teamId ? teamMap.get(c.teamId) || `#${c.teamId}` : "Chưa có đội"}</TableCell>
                <TableCell>{c.totalScore}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                    <Tooltip title="Sửa thí sinh">
                      <IconButton size="small" onClick={() => openEditFor(c)} sx={{ color: "#D4A741" }}>
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa thí sinh">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Xóa thí sinh "${c.name}" (${c.code})?`)) {
                            void onDeleteContestant(c.id);
                          }
                        }}
                        sx={{ color: "#DC2626" }}
                      >
                        <DeleteRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo thí sinh</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <TextField size="small" label="Tên thí sinh" value={contestantName} onChange={(e) => onContestantNameChange(e.target.value)} />
          <TextField size="small" label="Mã thí sinh" value={contestantCode} onChange={(e) => onContestantCodeChange(e.target.value)} />
          <TextField
            size="small"
            label="Mật khẩu"
            type="password"
            value={contestantPassword}
            onChange={(e) => onContestantPasswordChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => {
              onAddContestant();
              setOpenCreate(false);
            }}
            disabled={!contestantName || !contestantCode || !contestantPassword}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa thí sinh</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <TextField size="small" label="Tên thí sinh" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <TextField size="small" label="Mã thí sinh" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
          <TextField size="small" label="Đơn vị" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
          <TextField
            select
            size="small"
            label="Đội"
            value={editTeamId}
            onChange={(e) => setEditTeamId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <MenuItem value="">Chưa có đội</MenuItem>
            {teams.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (editTarget) {
                await onEditContestant(editTarget.id, {
                  name: editName,
                  code: editCode,
                  unit: editUnit || null,
                  teamId: editTeamId === "" ? null : (editTeamId as number)
                });
              }
              setOpenEdit(false);
            }}
            disabled={!editName || !editCode}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
