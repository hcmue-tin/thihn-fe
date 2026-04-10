import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from "@mui/material";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };

type TeamDataGridProps = {
  teamName: string;
  teams: Team[];
  onTeamNameChange: (value: string) => void;
  onAddTeam: () => void;
};

export const TeamDataGrid = ({ teamName, teams, onTeamNameChange, onAddTeam }: TeamDataGridProps) => (
  <TeamDataGridContent teamName={teamName} teams={teams} onTeamNameChange={onTeamNameChange} onAddTeam={onAddTeam} />
);

const TeamDataGridContent = ({ teamName, teams, onTeamNameChange, onAddTeam }: TeamDataGridProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">Quản lý đội thi</Typography>
        <Button sx={{ my: 1.5 }} variant="contained" onClick={() => setOpen(true)}>
          Tạo đội mới
        </Button>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Tên đội</TableCell>
              <TableCell>Số thí sinh</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell>{team.name}</TableCell>
                <TableCell>{team.contestantCount ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
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
          <Button onClick={() => setOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={() => {
              onAddTeam();
              setOpen(false);
            }}
            disabled={!teamName}
          >
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};
