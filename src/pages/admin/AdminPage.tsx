import { useEffect, useMemo, useRef, useState } from "react";
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
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { appTheme } from "../../theme";
import { api, resolveMediaUrl } from "../../api";
import { ContestantDataGrid } from "../../components/admin/ContestantDataGrid";
import { ExamControlRoom } from "../../components/admin/ExamControlRoom";
import { QuestionCreatorDialog } from "../../components/admin/QuestionCreatorDialog";
import { TeamDataGrid } from "../../components/admin/TeamDataGrid";
import { useRealtime } from "../../hooks/useRealtime";
import type { QuestionPayload } from "../../types/realtime";

type Team = { id: number; name: string; description: string | null; contestantCount?: number };
type Contestant = { id: number; teamId: number | null; code: string; name: string; unit: string | null; totalScore: number; isOnline: boolean };
type ExamSet = { id: number; name: string; orderNum: number };
type AdminView = "welcome" | "teams" | "contestants" | "exam_mgmt" | "rules" | "control";

export const AdminPage = () => {
  const { screen, question, connectSocket, emitWithAck, fullState, isConnected } = useRealtime();
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
  const [rulesDraft, setRulesDraft] = useState("");
  const [isRulesLoading, setIsRulesLoading] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("welcome");
  const adminAudioRef = useRef<HTMLAudioElement | null>(null);

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
    const [teamsRes, contestantsRes, examSetsRes, rulesRes] = await Promise.all([
      api.get("/teams", headers),
      api.get("/contestants", headers),
      api.get("/exam-sets", headers),
      api.get("/contest-state/rules", headers)
    ]);
    setTeams(teamsRes.data.data);
    setContestants(contestantsRes.data.data);
    setExamSets(examSetsRes.data.data);
    setRulesDraft(rulesRes.data.data?.rulesContent ?? "");
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

  const loadRules = async (token = adminToken): Promise<void> => {
    if (!token) return;
    setIsRulesLoading(true);
    try {
      const res = await api.get("/contest-state/rules", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRulesDraft(res.data.data?.rulesContent ?? "");
    } finally {
      setIsRulesLoading(false);
    }
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

  const visibleAudioQuestion = useMemo(() => {
    if (!question?.audioUrl) return null;
    if (!["question", "countdown", "reveal"].includes(screen)) return null;
    return question;
  }, [question, screen]);

  useEffect(() => {
    if (!visibleAudioQuestion?.audioUrl || !adminAudioRef.current) return;
    const node = adminAudioRef.current;
    node.currentTime = 0;
    void node.play().catch(() => undefined);
  }, [visibleAudioQuestion?.id, visibleAudioQuestion?.audioUrl]);

  if (!adminToken) {
    return (
      <ThemeProvider theme={appTheme}>
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2, background: "linear-gradient(165deg, #E8F4FA 0%, #F0F7FB 50%, #E8F4FA 100%)" }}>
          <Card sx={{ width: "100%", maxWidth: 400, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(26,140,142,0.15)" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 900, textAlign: "center", color: "#0F6B6D" }}>
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
                <Button variant="contained" size="large" onClick={handleAdminLogin} disabled={!adminPassword} sx={{ mt: 2, fontWeight: 'bold', background: 'linear-gradient(135deg, #1A8C8E, #0F6B6D)', '&:hover': { background: 'linear-gradient(135deg, #0F6B6D, #0A5557)' } }}>
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
          onEditTeam={async (teamId, name) => {
            await api.put(`/teams/${teamId}`, { name }, authHeaders);
            if (adminToken) await loadCoreData(adminToken);
            setToast({ open: true, message: "Đã cập nhật tên đội" });
          }}
          onDeleteTeam={async (teamId) => {
            await api.delete(`/teams/${teamId}`, authHeaders);
            if (adminToken) await loadCoreData(adminToken);
            setToast({ open: true, message: "Đã xóa đội" });
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
          onEditContestant={async (id, data) => {
            await api.put(`/contestants/${id}`, data, authHeaders);
            if (adminToken) await loadCoreData(adminToken);
            setToast({ open: true, message: "Đã cập nhật thí sinh" });
          }}
          onDeleteContestant={async (id) => {
            await api.delete(`/contestants/${id}`, authHeaders);
            if (adminToken) await loadCoreData(adminToken);
            setToast({ open: true, message: "Đã xóa thí sinh" });
          }}
        />
      );
    }

    if (activeView === "exam_mgmt") {
      return (
        <Stack spacing={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6B6D", mb: 1.5 }}>Quản lý bộ đề</Typography>
              <Button
                variant="contained"
                onClick={() => setOpenExamSetDialog(true)}
                sx={{ mb: 2, background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
              >
                + Tạo bộ đề mới
              </Button>
              <List sx={{ border: "1px solid rgba(184,217,236,0.3)", borderRadius: 2 }}>
                {examSets.map((s) => (
                  <ListItemButton
                    key={s.id}
                    selected={selectedExamSetId === s.id}
                    onClick={async () => {
                      setSelectedExamSetId(s.id);
                      await loadQuestions(s.id);
                    }}
                    sx={{ borderLeft: selectedExamSetId === s.id ? "4px solid #1A8C8E" : "4px solid transparent", "&.Mui-selected": { bgcolor: "rgba(26,140,142,0.06)" } }}
                  >
                    <ListItemText primary={`${s.orderNum}. ${s.name}`} />
                    <Tooltip title="Xóa bộ đề">
                      <IconButton
                        size="small"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Xóa bộ đề "${s.name}"?`)) {
                            await api.delete(`/exam-sets/${s.id}`, authHeaders);
                            if (adminToken) await loadCoreData(adminToken);
                            if (selectedExamSetId === s.id) {
                              setSelectedExamSetId(null);
                              setQuestions([]);
                            }
                            setToast({ open: true, message: "Đã xóa bộ đề" });
                          }
                        }}
                        sx={{ color: "#DC2626" }}
                      >
                        <Typography component="span" sx={{ fontSize: 14 }}>🗑️</Typography>
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                ))}
              </List>
            </CardContent>
          </Card>

          {selectedExamSetId && (
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: "#0F6B6D" }}>
                    Câu hỏi ({questions.length})
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setOpenQuestionDialog(true)}
                    sx={{ background: "linear-gradient(135deg, #D4A741, #E88B3A)", "&:hover": { background: "linear-gradient(135deg, #B8922E, #D4A741)" } }}
                  >
                    + Tạo câu hỏi
                  </Button>
                </Box>
                <List sx={{ border: "1px solid rgba(184,217,236,0.3)", borderRadius: 2, maxHeight: 500, overflow: "auto" }}>
                  {questions.map((q) => (
                    <ListItemButton
                      key={q.id}
                      selected={selectedQuestionId === q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      sx={{ borderLeft: selectedQuestionId === q.id ? "4px solid #D4A741" : "4px solid transparent", "&.Mui-selected": { bgcolor: "rgba(212,167,65,0.06)" } }}
                    >
                      <ListItemText
                        primary={`Q${q.orderNum}: ${q.content}`}
                        secondary={`${q.type} | ${q.countdownSeconds}s | ${q.score} điểm`}
                      />
                      <Tooltip title="Xóa câu hỏi">
                        <IconButton
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Xóa câu Q${q.orderNum}?`)) {
                              await api.delete(`/questions/${q.id}`, authHeaders);
                              await loadQuestions(selectedExamSetId);
                              if (selectedQuestionId === q.id) setSelectedQuestionId(null);
                              setToast({ open: true, message: "Đã xóa câu hỏi" });
                            }
                          }}
                          sx={{ color: "#DC2626" }}
                        >
                          <Typography component="span" sx={{ fontSize: 14 }}>🗑️</Typography>
                        </IconButton>
                      </Tooltip>
                    </ListItemButton>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Stack>
      );
    }

    if (activeView === "rules") {
      return (
        <Card>
          <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
            <Stack spacing={2}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F6B6D" }}>
                Nội dung thể lệ cuộc thi
              </Typography>
              <TextField
                multiline
                rows={12}
                value={rulesDraft}
                onChange={(e) => setRulesDraft(e.target.value)}
                placeholder="Nhập thể lệ cuộc thi để hiển thị trên màn hình LED..."
                fullWidth
                disabled={isRulesLoading || isSavingRules}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!adminToken) return;
                    setIsSavingRules(true);
                    try {
                      await api.put(
                        "/contest-state/rules",
                        { rulesContent: rulesDraft },
                        { headers: { Authorization: `Bearer ${adminToken}` } }
                      );
                      setToast({ open: true, message: "Đã lưu thể lệ cuộc thi" });
                    } finally {
                      setIsSavingRules(false);
                    }
                  }}
                  disabled={isRulesLoading || isSavingRules}
                  sx={{ background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}
                >
                  Lưu thể lệ
                </Button>
                <Button variant="outlined" onClick={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })} disabled={!!pendingAction} sx={{ borderColor: "#D4A741", color: "#D4A741", "&:hover": { borderColor: "#B8922E", bgcolor: "rgba(212,167,65,0.06)" } }}>
                  Hiển thị lên LED
                </Button>
                <Button variant="text" onClick={() => void loadRules()} disabled={isRulesLoading || isSavingRules}>
                  Tải lại
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      );
    }

    if (activeView === "control") {
      return (
        <Stack spacing={2}>
          {visibleAudioQuestion?.audioUrl && (
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 1 }}>
                  🔊 Âm thanh câu hỏi hiện tại
                </Typography>
                <audio ref={adminAudioRef} controls autoPlay src={resolveMediaUrl(visibleAudioQuestion.audioUrl)} style={{ width: "100%" }} />
              </CardContent>
            </Card>
          )}
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
            onShowRules={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })}
            onShowTeamList={() => withAck("Hiển thị đội thi", "admin:set-screen", { screen: "team_list" })}
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
            questionAudioUrl={visibleAudioQuestion?.audioUrl ?? null}
            onReplayQuestionAudio={() => {
              if (!adminAudioRef.current) return;
              adminAudioRef.current.currentTime = 0;
              void adminAudioRef.current.play().catch(() => undefined);
            }}
          />
        </Stack>
      );
    }

    return (
      <Card
        sx={{
          borderRadius: 4,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid rgba(184,217,236,0.3)",
          minHeight: 420
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={2.5}>
            <Typography variant="h3" sx={{ fontWeight: 900, maxWidth: 720, color: "#0F6B6D" }}>
              Xin chào, đã trở lại
            </Typography>
            <Typography variant="h6" sx={{ color: "#4A7A8A", maxWidth: 760, fontWeight: 400 }}>
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
              <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(26,140,142,0.06), rgba(26,140,142,0.02))", border: "1px solid rgba(26,140,142,0.12)" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
                    Đội thi
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#1A8C8E" }}>
                    {teams.length}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(212,167,65,0.06), rgba(212,167,65,0.02))", border: "1px solid rgba(212,167,65,0.15)" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
                    Thí sinh
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#D4A741" }}>
                    {contestants.length}
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, rgba(232,139,58,0.06), rgba(232,139,58,0.02))", border: "1px solid rgba(232,139,58,0.12)" }}>
                <CardContent>
                  <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
                    Bộ đề
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: "#E88B3A" }}>
                    {examSets.length}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Alert
              severity={isConnected ? "success" : "warning"}
              sx={{ borderRadius: 3 }}
            >
              {isConnected ? "Realtime đang kết nối ổn định." : "Realtime đang mất kết nối, vui lòng kiểm tra lại."}
            </Alert>
            <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
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
    color: activeView === view ? "#FFFFFF" : "#1A3A4A",
    bgcolor: activeView === view ? "#1A8C8E" : "transparent",
    border: activeView === view ? "1px solid #1A8C8E" : "1px solid rgba(184,217,236,0.3)",
    boxShadow: "none",
    "&:hover": {
      bgcolor: activeView === view ? "#0F6B6D" : "rgba(26,140,142,0.06)",
      boxShadow: "none"
    }
  });

  return (
    <ThemeProvider theme={appTheme}>
    <Box sx={{ minHeight: "100vh", bgcolor: "#F0F7FB", p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2 }}>
        <Card
          sx={{
            width: { xs: "100%", lg: 280 },
            flexShrink: 0,
            borderRadius: 4,
            background: "rgba(255,255,255,0.95)",
            borderLeft: "4px solid #1A8C8E",
            border: "1px solid rgba(184,217,236,0.3)"
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: "#0F6B6D" }}>
              Bảng điều khiển
            </Typography>
            <Stack spacing={1.25}>
              <Button variant="text" onClick={() => setActiveView("welcome")} sx={sidebarButtonSx("welcome")}>
                🏠 Trang chủ
              </Button>
              <Button variant="text" onClick={() => setActiveView("teams")} sx={sidebarButtonSx("teams")}>
                👥 Quản lý đội thi
              </Button>
              <Button variant="text" onClick={() => setActiveView("contestants")} sx={sidebarButtonSx("contestants")}>
                🧑 Quản lý thí sinh
              </Button>
              <Button variant="text" onClick={() => setActiveView("exam_mgmt")} sx={sidebarButtonSx("exam_mgmt")}>
                📝 Quản lý đề thi
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setActiveView("rules");
                  void loadRules();
                }}
                sx={sidebarButtonSx("rules")}
              >
                📜 Thể lệ cuộc thi
              </Button>
              <Button variant="text" onClick={() => setActiveView("control")} sx={sidebarButtonSx("control")}>
                🎮 Phòng điều khiển
              </Button>
              <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(184,217,236,0.3)" }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.open("/led", "_blank")}
                  sx={{ justifyContent: "flex-start", px: 2.25, py: 1, borderRadius: 2.5, fontWeight: 700, textTransform: "none", color: "#E88B3A", borderColor: "rgba(232,139,58,0.3)", "&:hover": { borderColor: "#E88B3A", bgcolor: "rgba(232,139,58,0.06)" } }}
                >
                  🖥️ Mở màn hình LED
                </Button>
              </Box>
            </Stack>

            <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: isConnected ? "rgba(21,128,61,0.06)" : "rgba(232,139,58,0.06)", border: isConnected ? "1px solid rgba(21,128,61,0.15)" : "1px solid rgba(232,139,58,0.2)" }}>
              <Typography variant="body2" sx={{ color: "#4A7A8A" }}>
                Trạng thái kết nối
              </Typography>
              <Typography variant="h6" sx={{ mt: 0.75, fontWeight: 800, color: isConnected ? "#15803D" : "#E88B3A" }}>
                {isConnected ? "Đã kết nối" : "Mất kết nối"}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#0F6B6D" }}>
              {activeView === "welcome"
                ? "Xin chào, đã trở lại"
                : activeView === "teams"
                  ? "Quản lý đội thi"
                  : activeView === "contestants"
                    ? "Quản lý thí sinh"
                  : activeView === "exam_mgmt"
                    ? "Quản lý đề thi"
                  : activeView === "rules"
                    ? "Thể lệ cuộc thi"
                    : "Phòng điều khiển thi"}
            </Typography>
            <Alert severity={isConnected ? "success" : "warning"} sx={{ borderRadius: 3 }}>
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
    </ThemeProvider>
  );
};
