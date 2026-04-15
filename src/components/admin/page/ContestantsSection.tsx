import { ContestantDataGrid } from "../ContestantDataGrid";
import type { Contestant, Team } from "../../../types/admin";

type Props = {
  contestants: Contestant[];
  teams: Team[];
  selectedContestantIds: number[];
  bulkTeamTarget: number | "";
  contestantName: string;
  contestantCode: string;
  contestantPassword: string;
  onToggleContestantSelected: (id: number) => void;
  onBulkTeamTargetChange: (value: number | "") => void;
  onBulkAssignTeam: () => Promise<void>;
  onImportExcel: (file: File) => Promise<void>;
  onContestantNameChange: (value: string) => void;
  onContestantCodeChange: (value: string) => void;
  onContestantPasswordChange: (value: string) => void;
  onAddContestant: () => Promise<void>;
  onEditContestant: (id: number, data: { name: string; code: string; unit: string | null; teamId: number | null }) => Promise<void>;
  onDeleteContestant: (id: number) => Promise<void>;
};

export const ContestantsSection = ({
  contestants,
  teams,
  selectedContestantIds,
  bulkTeamTarget,
  contestantName,
  contestantCode,
  contestantPassword,
  onToggleContestantSelected,
  onBulkTeamTargetChange,
  onBulkAssignTeam,
  onImportExcel,
  onContestantNameChange,
  onContestantCodeChange,
  onContestantPasswordChange,
  onAddContestant,
  onEditContestant,
  onDeleteContestant
}: Props) => (
  <ContestantDataGrid
    contestants={contestants}
    teams={teams.map((t) => ({ id: t.id, name: t.name }))}
    selectedContestantIds={selectedContestantIds}
    bulkTeamTarget={bulkTeamTarget}
    onToggleContestantSelected={onToggleContestantSelected}
    onBulkTeamTargetChange={onBulkTeamTargetChange}
    onBulkAssignTeam={onBulkAssignTeam}
    onImportExcel={onImportExcel}
    contestantName={contestantName}
    contestantCode={contestantCode}
    contestantPassword={contestantPassword}
    onContestantNameChange={onContestantNameChange}
    onContestantCodeChange={onContestantCodeChange}
    onContestantPasswordChange={onContestantPasswordChange}
    onAddContestant={onAddContestant}
    onEditContestant={onEditContestant}
    onDeleteContestant={onDeleteContestant}
  />
);
