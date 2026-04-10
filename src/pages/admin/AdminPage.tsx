import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { api } from "../../api";
import { useRealtime } from "../../hooks/useRealtime";
import type { QuestionPayload } from "../../types/realtime";
import { TeamDataGrid } from "../../components/admin/TeamDataGrid";
import { ContestantDataGrid } from "../../components/admin/ContestantDataGrid";
import { ExamControlRoom } from "../../components/admin/ExamControlRoom";
import { QuestionCreatorDialog } from "../../components/admin/QuestionCreatorDialog";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };
type Contestant = { id: number; teamId: number; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type ExamSet = { id: number; name: string; orderNum: number };

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
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [teamName, setTeamName] = useState("");
  const [contestantName, setContestantName] = useState("");
  const [contestantCode, setContestantCode] = useState("");
  const [contestantPassword, setContestantPassword] = useState("");
  const [teamIdForContestant, setTeamIdForContestant] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [openExamSetDialog, setOpenExamSetDialog] = useState(false);
  const [examSetName, setExamSetName] = useState("");
  const [examSetOrderNum, setExamSetOrderNum] = useState(1);

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
    if (examSetsRes.data.data.length > 0) {
      const stillExists = selectedExamSetId && examSetsRes.data.data.some((s: ExamSet) => s.id === selectedExamSetId);
      const nextExamSetId = stillExists ? selectedExamSetId : examSetsRes.data.data[0].id;
      setSelectedExamSetId(nextExamSetId);
      setExamSetOrderNum(Math.max(...examSetsRes.data.data.map((s: ExamSet) => s.orderNum), 0) + 1);
      await loadQuestions(nextExamSetId, token);
    } else {
      setSelectedExamSetId(null);
      setQuestions([]);
      setExamSetOrderNum(1);
    }
  };

  const loadQuestions = async (examSetId: number, token?: string): Promise<void> => {
    const headers = { headers: { Authorization: `Bearer ${token || adminToken}` } };
    const res = await api.get(`/exam-sets/${examSetId}/questions`, headers);
    const nextQuestions = res.data.data as QuestionPayload[];
    setQuestions(nextQuestions);
    const nextIds = nextQuestions.map((q) => q.id);
    setSelectedQuestionIds((prev) => prev.filter((id) => nextIds.includes(id)));
    setSelectedQuestionId((prev) => (prev && nextIds.includes(prev) ? prev : nextIds[0] ?? null));
  };

  const handleAdminLogin = async (): Promise<void> => {
    const res = await api.post("/auth/admin/login", { password: adminPassword });
    const token = res.data.data.token as string;
    localStorage.setItem("adminToken", token);
    localStorage.setItem("accessToken", token);
    setAdminToken(token);
  };

  const withAck = async (action: string, event: string, payload: object): Promise<void> => {
    try {
      setPendingAction(action);
      const ack = await emitWithAck(event, payload);
      if (!ack.success) {
        setToast({ open: true, message: ack.message || "Action failed" });
        return;
      }
      setToast({ open: true, message: `${action} success` });
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : "Action failed" });
    } finally {
      setPendingAction(null);
    }
  };

  const createExamSet = async (): Promise<void> => {
    if (!adminToken || !examSetName.trim()) return;
    await api.post(
      "/exam-sets",
      {
        name: examSetName.trim(),
        orderNum: examSetOrderNum
      },
      authHeaders
    );
    setOpenExamSetDialog(false);
    setExamSetName("");
    await loadCoreData(adminToken);
    setToast({ open: true, message: "Tạo bộ đề thành công" });
  };

  const stopAndAutoNext = async (): Promise<void> => {
    try {
      setPendingAction("Dừng / hiện đáp án");
      const ack = await emitWithAck("admin:stop-countdown", {});
      if (!ack.success) {
        setToast({ open: true, message: ack.message || "Action failed" });
        return;
      }
      setToast({ open: true, message: "Dừng / hiện đáp án success" });
      if (selectedQuestionIds.length > 0) {
        const currentIndex = selectedQuestionId ? selectedQuestionIds.indexOf(selectedQuestionId) : -1;
        if (currentIndex < 0) {
          setSelectedQuestionId(selectedQuestionIds[0]);
          return;
        }
        if (currentIndex >= selectedQuestionIds.length - 1) {
          setSelectedQuestionId(null);
          setToast({ open: true, message: "Đã hết danh sách câu đã chọn. Hãy chọn lại để chạy vòng mới." });
          return;
        }
        setSelectedQuestionId(selectedQuestionIds[currentIndex + 1]);
      }
    } catch (error) {
      setToast({ open: true, message: error instanceof Error ? error.message : "Action failed" });
    } finally {
      setPendingAction(null);
    }
  };

  if (!adminToken) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Card sx={{ width: "100%", maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Đăng nhập quản trị
            </Typography>
            <Stack spacing={2}>
              <TextField
                type="password"
                label="Mật khẩu quản trị"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <Button variant="contained" onClick={handleAdminLogin} disabled={!adminPassword}>
                Đăng nhập
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Bảng điều khiển quản trị
        </Typography>
        <Alert severity={isConnected ? "success" : "warning"}>{isConnected ? "Đã kết nối realtime" : "Mất kết nối realtime"}</Alert>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TeamDataGrid
            teams={teams}
            teamName={teamName}
            onTeamNameChange={setTeamName}
            onAddTeam={async () => {
              await api.post("/teams", { name: teamName }, authHeaders);
              setTeamName("");
              if (adminToken) await loadCoreData(adminToken);
            }}
          />
          <ContestantDataGrid
            contestants={contestants}
            teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            contestantName={contestantName}
            contestantCode={contestantCode}
            contestantPassword={contestantPassword}
            teamIdForContestant={teamIdForContestant}
            onContestantNameChange={setContestantName}
            onContestantCodeChange={setContestantCode}
            onContestantPasswordChange={setContestantPassword}
            onTeamIdChange={setTeamIdForContestant}
            onAddContestant={async () => {
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
          />
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <ExamControlRoom
            currentScreen={screen}
            examSets={examSets}
            questions={questions}
            selectedExamSetId={selectedExamSetId}
            selectedQuestionId={selectedQuestionId}
            selectedQuestionIds={selectedQuestionIds}
            pendingAction={!!pendingAction}
            onSelectExamSet={async (examSetId) => {
              setSelectedExamSetId(examSetId);
              setSelectedQuestionIds([]);
              setSelectedQuestionId(null);
              await loadQuestions(examSetId);
              await withAck("Chọn bộ đề", "admin:select-exam-set", { examSetId });
            }}
            onSelectQuestion={(questionId) => {
              setSelectedQuestionId(questionId);
              setSelectedQuestionIds((prev) => (prev.includes(questionId) ? prev : [...prev, questionId]));
            }}
            onGoWaiting={() => withAck("Vào màn chờ", "admin:set-screen", { screen: "waiting" })}
            onResetSession={async () => {
              const confirmed = window.confirm("Reset sẽ xóa trạng thái câu đang chạy và dừng countdown. Tiếp tục?");
              if (!confirmed) return;
              await withAck("Reset phiên thi", "admin:reset-session", {});
              setSelectedQuestionId(null);
              setSelectedQuestionIds([]);
            }}
            onShowQuestion={() => withAck("Hiển thị câu hỏi", "admin:show-question", { questionId: selectedQuestionId })}
            onStartCountdown={() => withAck("Bắt đầu đếm ngược", "admin:start-countdown", { questionId: selectedQuestionId })}
            onStopShowAnswer={stopAndAutoNext}
            onShowTeamScore={() => withAck("Hiển thị điểm đội", "admin:show-team-score", { examSetId: selectedExamSetId })}
            onShowLeaderboard={() => withAck("Hiển thị bảng xếp hạng", "admin:show-leaderboard", {})}
            onOpenCreateQuestion={() => setOpenQuestionDialog(true)}
            onOpenCreateExamSet={() => setOpenExamSetDialog(true)}
            onDeleteSelectedQuestion={async () => {
              if (!selectedQuestionId || !adminToken) return;
              await api.delete(`/questions/${selectedQuestionId}`, authHeaders);
              if (selectedExamSetId) {
                await loadQuestions(selectedExamSetId, adminToken);
              }
              setSelectedQuestionIds((prev) => prev.filter((id) => id !== selectedQuestionId));
              setSelectedQuestionId(null);
              setToast({ open: true, message: "Đã xóa câu hỏi" });
            }}
            onDeleteSelectedExamSet={async () => {
              if (!selectedExamSetId || !adminToken) return;
              await api.delete(`/exam-sets/${selectedExamSetId}`, authHeaders);
              setSelectedQuestionId(null);
              setSelectedQuestionIds([]);
              await loadCoreData(adminToken);
              setToast({ open: true, message: "Đã xóa bộ đề" });
            }}
            onSelectAllQuestions={() => {
              const ids = questions.map((q) => q.id);
              setSelectedQuestionIds(ids);
              setSelectedQuestionId(ids[0] ?? null);
            }}
            onClearSelectedQuestions={() => {
              setSelectedQuestionIds([]);
              setSelectedQuestionId(null);
            }}
            onSelectPreviousQuestion={() => {
              if (selectedQuestionIds.length === 0) return;
              const currentIndex = selectedQuestionId ? selectedQuestionIds.indexOf(selectedQuestionId) : 0;
              const prevIndex = currentIndex <= 0 ? selectedQuestionIds.length - 1 : currentIndex - 1;
              setSelectedQuestionId(selectedQuestionIds[prevIndex]);
            }}
            onSelectNextQuestion={() => {
              if (selectedQuestionIds.length === 0) return;
              const currentIndex = selectedQuestionId ? selectedQuestionIds.indexOf(selectedQuestionId) : -1;
              const nextIndex = currentIndex < 0 || currentIndex >= selectedQuestionIds.length - 1 ? 0 : currentIndex + 1;
              setSelectedQuestionId(selectedQuestionIds[nextIndex]);
            }}
          />
        </Grid>
      </Grid>

      <Snackbar open={toast.open} autoHideDuration={3200} onClose={() => setToast({ open: false, message: "" })} message={toast.message} />
      <QuestionCreatorDialog
        open={openQuestionDialog}
        onClose={() => setOpenQuestionDialog(false)}
        selectedExamSetId={selectedExamSetId}
        defaultOrderNum={(questions.length > 0 ? questions[questions.length - 1].orderNum : 0) + 1}
        onCreated={async () => {
          if (selectedExamSetId) {
            await loadQuestions(selectedExamSetId);
          }
          setToast({ open: true, message: "Tạo câu hỏi thành công" });
        }}
      />
      <Dialog open={openExamSetDialog} onClose={() => setOpenExamSetDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Tạo bộ đề mới</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <TextField
            size="small"
            label="Tên bộ đề"
            value={examSetName}
            onChange={(e) => setExamSetName(e.target.value)}
            placeholder="Ví dụ: Nhịp cầu Hán ngữ 2026 - Vòng 1"
          />
          <TextField
            size="small"
            label="Thứ tự hiển thị"
            type="number"
            value={examSetOrderNum}
            onChange={(e) => setExamSetOrderNum(Number(e.target.value))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamSetDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={createExamSet} disabled={!examSetName.trim() || examSetOrderNum < 1}>
            Tạo bộ đề
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
