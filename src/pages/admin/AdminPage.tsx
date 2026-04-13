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
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { lightTheme } from "../../theme";
import { api } from "../../api";
import { ContestantDataGrid } from "../../components/admin/ContestantDataGrid";
import { ExamControlRoom } from "../../components/admin/ExamControlRoom";
import { QuestionCreatorDialog } from "../../components/admin/QuestionCreatorDialog";
import { TeamDataGrid } from "../../components/admin/TeamDataGrid";
import { useRealtime } from "../../hooks/useRealtime";
import type { QuestionPayload } from "../../types/realtime";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };
type Contestant = { id: number; teamId: number | null; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type ExamSet = { id: number; name: string; orderNum: number };
type AdminView = "welcome" | "teams" | "contestants" | "control";

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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string }>({ open: false, message: "" });
  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [openExamSetDialog, setOpenExamSetDialog] = useState(false);
  const [examSetName, setExamSetName] = useState("");
  const [examSetOrderNum, setExamSetOrderNum] = useState(1);
  const [activeView, setActiveView] = useState<AdminView>("welcome");

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
      <ThemeProvider theme={lightTheme}>
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
          <Card sx={{ width: "100%", maxWidth: 380, backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", boxShadow: 24, border: "1px solid rgba(255,255,255,0.4)" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, textAlign: "center", color: "#004282" }}>
                Đăng nhập quản trị
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  type="password"
                  label="Mật khẩu quản trị"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  fullWidth
                />
                <Button variant="contained" size="large" onClick={handleAdminLogin} disabled={!adminPassword} sx={{ mt: 2, fontWeight: 'bold' }}>
                  Đăng nhập
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  const renderMainContent = () => {
    if (activeView === "teams") {
      return (
        <TeamDataGrid
          teams={teams}
          contestants={contestants}
          teamName={teamName}
          onTeamNameChange={setTeamName}
          onAddTeam={async () => {
            await api.post("/teams", { name: teamName }, authHeaders);
            setTeamName("");
            if (adminToken) await loadCoreData(adminToken);
          }}
          onAssignContestantsToTeam={async (teamId, contestantIds) => {
            await Promise.all(
              contestantIds.map((contestantId) =>
                api.put(
                  `/contestants/${contestantId}`,
                  {
                    teamId
                  },
                  authHeaders
                )
              )
            );

            if (adminToken) await loadCoreData(adminToken);
          }}
        />
      );
    }

    if (activeView === "contestants") {
      return (
        <ContestantDataGrid
          contestants={contestants}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          contestantName={contestantName}
          contestantCode={contestantCode}
          contestantPassword={contestantPassword}
          onContestantNameChange={setContestantName}
          onContestantCodeChange={setContestantCode}
          onContestantPasswordChange={setContestantPassword}
          onAddContestant={async () => {
            await api.post(
              "/contestants",
              {
                teamId: null,
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
      );
    }

    if (activeView === "control") {
      return (
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
      );
    }

    return (
      <Card
        sx={{
          borderRadius: 4,
          color: "#f8fafc",
          bgcolor: "#2f2f35",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "none",
          minHeight: 420
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={2.5}>
            <Typography variant="h3" sx={{ fontWeight: 900, maxWidth: 720, color: "#ffffff" }}>
              Xin chào, đã trở lại
            </Typography>
            <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.82)", maxWidth: 760, fontWeight: 400 }}>
              Mọi thứ đã sẵn sàng. Chọn chức năng ở sidebar bên trái để quản lý đội thi, thí sinh hoặc chuyển sang phòng điều khiển thi.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gap: 2,
                pt: 2,
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }
              }}
            >
              <Card sx={{ borderRadius: 3, bgcolor: "#383840", color: "inherit", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    Đội thi
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {teams.length}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3, bgcolor: "#383840", color: "inherit", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    Thí sinh
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {contestants.length}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3, bgcolor: "#383840", color: "inherit", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.72 }}>
                    Bộ đề
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                    {examSets.length}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Alert
              severity={isConnected ? "success" : "warning"}
              sx={{
                borderRadius: 3,
                bgcolor: isConnected ? "#112515" : "#3b2a11",
                color: "#f8fafc",
                border: "1px solid rgba(255,255,255,0.08)",
                "& .MuiAlert-icon": { color: isConnected ? "#4ade80" : "#fbbf24" }
              }}
            >
              {isConnected ? "Realtime đang kết nối ổn định." : "Realtime đang mất kết nối, vui lòng kiểm tra lại."}
            </Alert>
            <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.7)" }}>
              Snapshot realtime: {fullState ? "Đã có dữ liệu trạng thái" : "Chưa có dữ liệu trạng thái"} | Màn hình hiện tại: {screen}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const sidebarButtonSx = (view: AdminView) => ({
    justifyContent: "flex-start",
    px: 2.25,
    py: 1.5,
    borderRadius: 2.5,
    fontWeight: 700,
    textTransform: "none",
    color: activeView === view ? "#ffffff" : "rgba(255,255,255,0.88)",
    bgcolor: activeView === view ? "#ef4444" : "#2f2f35",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "none",
    "&:hover": {
      bgcolor: activeView === view ? "#ef4444" : "#3a3a43",
      boxShadow: "none"
    }
  });

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#0d0d14", p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2 }}>
        <Card
          sx={{
            width: { xs: "100%", lg: 300 },
            flexShrink: 0,
            borderRadius: 4,
            color: "#f8fafc",
            bgcolor: "#1d1d24",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "none"
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>
              Bảng điều khiển quản trị
            </Typography>
            <Stack spacing={1.25}>
              <Button variant="text" onClick={() => setActiveView("welcome")} sx={sidebarButtonSx("welcome")}>
                Xin chào
              </Button>
              <Button variant="text" onClick={() => setActiveView("teams")} sx={sidebarButtonSx("teams")}>
                Quản lý đội thi
              </Button>
              <Button variant="text" onClick={() => setActiveView("contestants")} sx={sidebarButtonSx("contestants")}>
                Quản lý thí sinh
              </Button>
              <Button variant="text" onClick={() => setActiveView("control")} sx={sidebarButtonSx("control")}>
                Phòng điều khiển thi
              </Button>
            </Stack>

            <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: "#26262d", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Typography variant="body2" sx={{ opacity: 0.72 }}>
                Trạng thái kết nối
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.75, fontWeight: 800 }}>
                {isConnected ? "Đã kết nối realtime" : "Mất kết nối realtime"}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#ffffff" }}>
              {activeView === "welcome"
                ? "Xin chào, đã trở lại"
                : activeView === "teams"
                  ? "Quản lý đội thi"
                  : activeView === "contestants"
                    ? "Quản lý thí sinh"
                    : "Phòng điều khiển thi"}
            </Typography>
            <Alert
              severity={isConnected ? "success" : "warning"}
              sx={{
                borderRadius: 3,
                bgcolor: isConnected ? "#112515" : "#3b2a11",
                color: "#f8fafc",
                border: "1px solid rgba(255,255,255,0.08)",
                "& .MuiAlert-icon": { color: isConnected ? "#4ade80" : "#fbbf24" }
              }}
            >
              {isConnected ? "Đã kết nối realtime" : "Mất kết nối realtime"}
            </Alert>
          </Box>

          {renderMainContent()}
        </Box>
      </Box>

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
