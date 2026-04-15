import { TeamDataGrid } from "../TeamDataGrid";
import type { Contestant, Team } from "../../../types/admin";

type Props = {
  teams: Team[];
  contestants: Contestant[];
  teamName: string;
  onTeamNameChange: (value: string) => void;
  onAddTeam: () => Promise<void>;
  onEditTeam: (teamId: number, name: string) => Promise<void>;
  onDeleteTeam: (teamId: number) => Promise<void>;
  onAssignContestantsToTeam: (teamId: number, contestantIds: number[]) => Promise<void>;
};

export const TeamsSection = ({
  teams,
  contestants,
  teamName,
  onTeamNameChange,
  onAddTeam,
  onEditTeam,
  onDeleteTeam,
  onAssignContestantsToTeam
}: Props) => (
  <TeamDataGrid
    teams={teams}
    contestants={contestants}
    teamName={teamName}
    onTeamNameChange={onTeamNameChange}
    onAddTeam={onAddTeam}
    onEditTeam={onEditTeam}
    onDeleteTeam={onDeleteTeam}
    onAssignContestantsToTeam={onAssignContestantsToTeam}
  />
);
