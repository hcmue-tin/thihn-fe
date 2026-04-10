import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";

type Contestant = { id: number; teamId: number; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type Team = { id: number; name: string };

type ContestantDataGridProps = {
  contestants: Contestant[];
  contestantName: string;
  contestantCode: string;
  contestantPassword: string;
  teamIdForContestant: number | null;
  teams: Team[];
  onContestantNameChange: (value: string) => void;
  onContestantCodeChange: (value: string) => void;
  onContestantPasswordChange: (value: string) => void;
  onTeamIdChange: (value: number) => void;
  onAddContestant: () => void;
};

export const ContestantDataGrid = ({
  contestants,
  contestantName,
  contestantCode,
  contestantPassword,
  teamIdForContestant,
  teams,
  onContestantNameChange,
  onContestantCodeChange,
  onContestantPasswordChange,
  onTeamIdChange,
  onAddContestant
}: ContestantDataGridProps) => {
  const [open, setOpen] = useState(false);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t.name])), [teams]);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Quản lý thí sinh</Typography>
        <Button sx={{ my: 1.5 }} variant="contained" onClick={() => setOpen(true)}>
          Tạo thí sinh
        </Button>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tên</TableCell>
              <TableCell>Mã</TableCell>
              <TableCell>Đội</TableCell>
              <TableCell>Điểm</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contestants.slice(0, 8).map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.name}</TableCell>
                <TableCell>{c.code}</TableCell>
                <TableCell>{teamMap.get(c.teamId) || `#${c.teamId}`}</TableCell>
                <TableCell>{c.totalScore}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
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
          <TextField
            size="small"
            select
            label="Đội thi"
            value={teamIdForContestant ?? ""}
            onChange={(e) => onTeamIdChange(Number(e.target.value))}
          >
            {teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => {
              onAddContestant();
              setOpen(false);
            }}
            disabled={!contestantName || !contestantCode || !contestantPassword || !teamIdForContestant}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
