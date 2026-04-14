import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
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
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };
type Contestant = { id: number; teamId: number | null; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };

type TeamDataGridProps = {
  teamName: string;
  teams: Team[];
  contestants: Contestant[];
  onTeamNameChange: (value: string) => void;
  onAddTeam: () => void | Promise<void>;
  onEditTeam: (teamId: number, name: string) => void | Promise<void>;
  onDeleteTeam: (teamId: number) => void | Promise<void>;
  onAssignContestantsToTeam: (teamId: number, contestantIds: number[]) => void | Promise<void>;
};

export const TeamDataGrid = ({
  teamName,
  teams,
  contestants,
  onTeamNameChange,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAssignContestantsToTeam
}: TeamDataGridProps) => (
  <TeamDataGridContent
    teamName={teamName}
    teams={teams}
    contestants={contestants}
    onTeamNameChange={onTeamNameChange}
    onAddTeam={onAddTeam}
    onEditTeam={onEditTeam}
    onDeleteTeam={onDeleteTeam}
    onAssignContestantsToTeam={onAssignContestantsToTeam}
  />
);

const TeamDataGridContent = ({
  teamName,
  teams,
  contestants,
  onTeamNameChange,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAssignContestantsToTeam
}: TeamDataGridProps) => {
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedContestantIds, setSelectedContestantIds] = useState<number[]>([]);
  const [targetTeam, setTargetTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState("");

  const availableCount = useMemo(() => contestants.filter((contestant) => contestant.teamId === null).length, [contestants]);

  const resetAssignDialog = () => {
    setSelectedContestantIds([]);
    setTargetTeam(null);
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">Quản lý đội thi</Typography>
        <Button
          sx={{ my: 1.5, background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
          variant="contained"
          onClick={() => setOpenCreateDialog(true)}
        >
          + Tạo đội mới
        </Button>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, color: "#0F6B6D" } }}>
              <TableCell>Tên đội</TableCell>
              <TableCell>Số thí sinh</TableCell>
              <TableCell align="right">Hành động</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id} sx={{ "&:nth-of-type(odd)": { bgcolor: "#F7FBFD" } }}>
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.contestantCount ?? 0}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} sx={{ justifyContent: "flex-end" }}>
                    <Tooltip title="Thêm thí sinh">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setTargetTeam(team);
                          setSelectedContestantIds([]);
                          setOpenAssignDialog(true);
                        }}
                        sx={{ color: "#1A8C8E" }}
                      >
                        <PersonAddRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sửa tên đội">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setTargetTeam(team);
                          setEditName(team.name);
                          setOpenEditDialog(true);
                        }}
                        sx={{ color: "#D4A741" }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Xóa đội">
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (window.confirm(`Xóa đội "${team.name}"? Thí sinh sẽ không còn thuộc đội này.`)) {
                            void onDeleteTeam(team.id);
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
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Tạo đội thi</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            size="small"
            label="Tên đội"
            value={teamName}
            onChange={(e) => onTeamNameChange(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={async () => {
              await onAddTeam();
              setOpenCreateDialog(false);
            }}
            disabled={!teamName.trim()}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Sửa tên đội</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            size="small"
            label="Tên đội"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (targetTeam) {
                await onEditTeam(targetTeam.id, editName);
              }
              setOpenEditDialog(false);
            }}
            disabled={!editName.trim()}
          >
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Dialog */}
      <Dialog
        open={openAssignDialog}
        onClose={() => {
          setOpenAssignDialog(false);
          resetAssignDialog();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Thêm thí sinh vào đội {targetTeam?.name ?? ""}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <Box sx={{ borderRadius: 2, border: "1px solid rgba(184,217,236,0.3)", p: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2">Chọn thí sinh cho đội</Typography>
              <Chip size="small" label={`Sẵn sàng: ${availableCount}`} />
            </Box>
            <List sx={{ maxHeight: 320, overflow: "auto", p: 0 }}>
              {contestants.map((contestant) => {
                const disabled = contestant.teamId !== null;
                const selected = selectedContestantIds.includes(contestant.id);

                return (
                  <ListItemButton
                    key={contestant.id}
                    disabled={disabled}
                    selected={selected}
                    onClick={() => {
                      setSelectedContestantIds((prev) => (selected ? prev.filter((id) => id !== contestant.id) : [...prev, contestant.id]));
                    }}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      opacity: disabled ? 0.45 : 1
                    }}
                  >
                    <Checkbox edge="start" checked={selected} disableRipple tabIndex={-1} sx={{ mr: 1 }} />
                    <ListItemText
                      primary={contestant.name}
                      secondary={disabled ? "Đã có đội" : `${contestant.code} • Chưa có đội`}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenAssignDialog(false);
              resetAssignDialog();
            }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={async () => {
              if (!targetTeam) return;
              await onAssignContestantsToTeam(targetTeam.id, selectedContestantIds);
              setOpenAssignDialog(false);
              resetAssignDialog();
            }}
            disabled={!targetTeam || selectedContestantIds.length === 0}
          >
            Thêm vào đội
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
