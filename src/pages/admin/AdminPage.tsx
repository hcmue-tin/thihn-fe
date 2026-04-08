import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
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
  Typography
} from "@mui/material";
import { api } from "../../api";
import { useRealtime } from "../../hooks/useRealtime";
import type { ContestScreen, QuestionPayload } from "../../types/realtime";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };
type Contestant = { id: number; teamId: number; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type ExamSet = { id: number; name: string; orderNum: number };

const canShowQuestion = (screen: ContestScreen): boolean =>
  ["waiting", "rules", "team_list", "reveal", "team_score"].includes(screen);
const canStartCountdown = (screen: ContestScreen): boolean => screen === "question";
const canStopShowAnswer = (screen: ContestScreen): boolean => screen === "countdown";

export const AdminPage = () => {
  const { screen, connectSocket, emitWithAck, fullState, isConnected } = useRealtime();
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [teams, setTeams] = useState<Team[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [questions, setQuestions] = useState<QuestionPayload[]>([]);
  const [selectedExamSetId, setSelectedExamSetId] = useState<number | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState("");
  const [contestantName, setContestantName] = useState("");
  const [contestantCode, setContestantCode] = useState("");
  const [contestantPassword, setContestantPassword] = useState("");
  const [teamIdForContestant, setTeamIdForContestant] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${adminToken}`
      }
    }),
    [adminToken]
  );

  useEffect(() => {
    if (adminToken) {
      connectSocket({ token: adminToken, role: "admin" });
      loadCoreData(adminToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, connectSocket]);

  const loadCoreData = async (token: string): Promise<void> => {
    const headers = { headers: { Authorization: `Bearer ${token}` } };
    const [teamsRes, contestantsRes, examSetsRes] = await Promise.all([
      api.get("/teams", headers),
      api.get("/contestants", headers),
      api.get("/exam-sets", headers)
    ]);
    setTeams(teamsRes.data.data);
    setContestants(contestantsRes.data.data);
    setExamSets(examSetsRes.data.data);
    if (examSetsRes.data.data.length > 0 && !selectedExamSetId) {
      setSelectedExamSetId(examSetsRes.data.data[0].id);
      await loadQuestions(examSetsRes.data.data[0].id, token);
    }
  };

  const loadQuestions = async (examSetId: number, token?: string): Promise<void> => {
    const headers = { headers: { Authorization: `Bearer ${token || adminToken}` } };
    const res = await api.get(`/exam-sets/${examSetId}/questions`, headers);
    setQuestions(res.data.data);
  };

  const handleAdminLogin = async (): Promise<void> => {
    const res = await api.post("/auth/admin/login", { password: adminPassword });
    const token = res.data.data.token as string;
    localStorage.setItem("adminToken", token);
    localStorage.setItem("accessToken", token);
    setAdminToken(token);
  };

  const withAck = async (action: string, event: string, payload: object): Promise<void> => {
    setPendingAction(action);
    const ack = await emitWithAck(event, payload);
    setPendingAction(null);
    if (!ack.success) {
      setFeedback(ack.message || "Action failed");
      return;
    }
    setFeedback(`${action} success`);
  };

  if (!adminToken) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Admin Login
            </Typography>
            <Stack spacing={2}>
              <TextField
                type="password"
                label="Admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <Button variant="contained" onClick={handleAdminLogin} disabled={!adminPassword}>
                Login
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Admin Control Panel
        </Typography>
        <Alert severity={isConnected ? "success" : "warning"}>{isConnected ? "Socket connected" : "Socket disconnected"}</Alert>
      </Box>

      {feedback && <Alert sx={{ mb: 2 }}>{feedback}</Alert>}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6">Teams</Typography>
              <Stack direction="row" spacing={1} sx={{ my: 1 }}>
                <TextField size="small" label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <Button
                  variant="contained"
                  onClick={async () => {
                    await api.post("/teams", { name: teamName }, authHeaders);
                    setTeamName("");
                    if (adminToken) await loadCoreData(adminToken);
                  }}
                  disabled={!teamName}
                >
                  Add
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Contestants</TableCell>
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
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6">Contestants</Typography>
              <Stack spacing={1} sx={{ my: 1 }}>
                <TextField
                  size="small"
                  label="Name"
                  value={contestantName}
                  onChange={(e) => setContestantName(e.target.value)}
                />
                <TextField size="small" label="Code" value={contestantCode} onChange={(e) => setContestantCode(e.target.value)} />
                <TextField
                  size="small"
                  label="Password"
                  type="password"
                  value={contestantPassword}
                  onChange={(e) => setContestantPassword(e.target.value)}
                />
                <TextField
                  size="small"
                  label="Team ID"
                  value={teamIdForContestant ?? ""}
                  onChange={(e) => setTeamIdForContestant(Number(e.target.value))}
                />
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!teamIdForContestant) return;
                    await api.post(
                      "/contestants",
                      {
                        teamId: teamIdForContestant,
                        code: contestantCode,
                        password: contestantPassword,
                        name: contestantName
                      },
                      authHeaders
                    );
                    setContestantName("");
                    setContestantCode("");
                    setContestantPassword("");
                    if (adminToken) await loadCoreData(adminToken);
                  }}
                  disabled={!contestantName || !contestantCode || !contestantPassword || !teamIdForContestant}
                >
                  Add Contestant
                </Button>
              </Stack>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contestants.slice(0, 8).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.code}</TableCell>
                      <TableCell>{c.totalScore}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Exam Control Room
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Current screen: <strong>{fullState?.screen || screen}</strong>
              </Typography>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6">Questions</Typography>
                  <Box sx={{ my: 1 }}>
                    <select
                      value={selectedExamSetId ?? ""}
                      onChange={async (e) => {
                        const examSetId = Number(e.target.value);
                        setSelectedExamSetId(examSetId);
                        await loadQuestions(examSetId);
                        await withAck("Select exam set", "admin:select-exam-set", { examSetId });
                      }}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        background: "#1f1f2b",
                        color: "white",
                        border: "1px solid rgba(255,255,255,0.2)"
                      }}
                    >
                      {examSets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.orderNum}. {s.name}
                        </option>
                      ))}
                    </select>
                  </Box>
                  <List sx={{ maxHeight: 380, overflow: "auto", bgcolor: "background.paper", borderRadius: 2 }}>
                    {questions.map((q) => (
                      <ListItemButton
                        key={q.id}
                        selected={selectedQuestionId === q.id}
                        onClick={() => setSelectedQuestionId(q.id)}
                      >
                        <ListItemText primary={`Q${q.orderNum}: ${q.content}`} />
                      </ListItemButton>
                    ))}
                  </List>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="h6">State Machine Controller</Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    <Button
                      size="large"
                      variant="contained"
                      disabled={!selectedQuestionId || !canShowQuestion(screen) || !!pendingAction}
                      onClick={() => withAck("Show Question", "admin:show-question", { questionId: selectedQuestionId })}
                    >
                      Show Question
                    </Button>
                    <Button
                      size="large"
                      variant="contained"
                      color="secondary"
                      disabled={!selectedQuestionId || !canStartCountdown(screen) || !!pendingAction}
                      onClick={() => withAck("Start Countdown", "admin:start-countdown", { questionId: selectedQuestionId })}
                    >
                      Start Countdown
                    </Button>
                    <Button
                      size="large"
                      variant="contained"
                      color="warning"
                      disabled={!canStopShowAnswer(screen) || !!pendingAction}
                      onClick={() => withAck("Stop / Show Answer", "admin:stop-countdown", {})}
                    >
                      Stop / Show Answer
                    </Button>
                    <Divider />
                    <Button
                      size="large"
                      variant="outlined"
                      disabled={!selectedExamSetId || !!pendingAction}
                      onClick={() => withAck("Show Team Score", "admin:show-team-score", { examSetId: selectedExamSetId })}
                    >
                      Show Team Score
                    </Button>
                    <Button
                      size="large"
                      variant="outlined"
                      disabled={!!pendingAction}
                      onClick={() => withAck("Show Leaderboard", "admin:show-leaderboard", {})}
                    >
                      Show Leaderboard
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
