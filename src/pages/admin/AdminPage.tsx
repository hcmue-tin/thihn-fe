import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
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
  Switch,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TvRoundedIcon from "@mui/icons-material/TvRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
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
type AdminQuestion = QuestionPayload & {
  options?: Array<{ id?: number; label: string; content: string; isCorrect: boolean; orderNum: number }>;
  fillBlankAnswers?: Array<{ id?: number; acceptedAnswer: string }>;
};
type AdminView = "welcome" | "teams" | "contestants" | "exam_mgmt" | "rules" | "control";

export const AdminPage = () => {
  const { screen, question, connectSocket, emitWithAck, fullState, isConnected } = useRealtime();
  const [adminPassword, setAdminPassword] = useState("");
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem("adminToken"));
  const [teams, setTeams] = useState<Team[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [examSets, setExamSets] = useState<ExamSet[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
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
  const [openEditExamSetDialog, setOpenEditExamSetDialog] = useState(false);
  const [openEditQuestionDialog, setOpenEditQuestionDialog] = useState(false);
  const [examSetName, setExamSetName] = useState("");
  const [examSetOrderNum, setExamSetOrderNum] = useState(1);
  const [editingExamSetId, setEditingExamSetId] = useState<number | null>(null);
  const [editExamSetName, setEditExamSetName] = useState("");
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [editQuestionContent, setEditQuestionContent] = useState("");
  const [editQuestionType, setEditQuestionType] = useState<AdminQuestion["type"]>("single_choice");
  const [editQuestionCountdown, setEditQuestionCountdown] = useState(10);
  const [editQuestionScore, setEditQuestionScore] = useState(1);
  const [editQuestionImageUrl, setEditQuestionImageUrl] = useState("");
  const [editQuestionAudioUrl, setEditQuestionAudioUrl] = useState("");
  const [editQuestionOptions, setEditQuestionOptions] = useState<Array<{ label: string; content: string; isCorrect: boolean; orderNum: number }>>([]);
  const [editQuestionAcceptedAnswers, setEditQuestionAcceptedAnswers] = useState("");
  const [rulesDraft, setRulesDraft] = useState("");
  const [backgroundDraft, setBackgroundDraft] = useState("");
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [isUploadingEditQuestionImage, setIsUploadingEditQuestionImage] = useState(false);
  const [isUploadingEditQuestionAudio, setIsUploadingEditQuestionAudio] = useState(false);
  const [isRulesLoading, setIsRulesLoading] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("welcome");
  const [activeTeamIds, setActiveTeamIds] = useState<number[]>([]);
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
    const [teamsRes, contestantsRes, examSetsRes, rulesRes] = await Promise.allSettled([
      api.get("/teams", headers),
      api.get("/contestants", headers),
      api.get("/exam-sets", headers),
      api.get("/contest-state/rules", headers)
    ]);
    if (teamsRes.status !== "fulfilled" || contestantsRes.status !== "fulfilled" || examSetsRes.status !== "fulfilled") {
      throw new Error("Không thể tải dữ liệu lõi từ server");
    }
    setTeams(teamsRes.value.data.data);
    setContestants(contestantsRes.value.data.data);
    setExamSets(examSetsRes.value.data.data);
    if (rulesRes.status === "fulfilled") {
      setRulesDraft(rulesRes.value.data.data?.rulesContent ?? "");
      setBackgroundDraft(rulesRes.value.data.data?.backgroundUrl ?? "");
    } else {
      setRulesDraft("");
      setBackgroundDraft("");
    }
    if (examSetsRes.value.data.data.length > 0) {
      const stillExists = selectedExamSetId && examSetsRes.value.data.data.some((s: ExamSet) => s.id === selectedExamSetId);
      const nextExamSetId = stillExists ? selectedExamSetId : examSetsRes.value.data.data[0].id;
      setSelectedExamSetId(nextExamSetId);
      setExamSetOrderNum(Math.max(...examSetsRes.value.data.data.map((s: ExamSet) => s.orderNum), 0) + 1);
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
    const nextQuestions = res.data.data as AdminQuestion[];
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
      setBackgroundDraft(res.data.data?.backgroundUrl ?? "");
    } catch {
      setRulesDraft("");
      setBackgroundDraft("");
      setToast({ open: true, message: "Server chưa hỗ trợ API thể lệ (/contest-state/rules)" });
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

  const updateExamSet = async (): Promise<void> => {
    if (!editingExamSetId || !editExamSetName.trim()) return;
    await api.put(
      `/exam-sets/${editingExamSetId}`,
      { name: editExamSetName.trim() },
      authHeaders
    );
    setOpenEditExamSetDialog(false);
    setEditingExamSetId(null);
    if (adminToken) await loadCoreData(adminToken);
    setToast({ open: true, message: "Đã cập nhật bộ đề" });
  };

  const uploadFile = async (file: File, kind: "background" | "question-image" | "question-audio"): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    if (kind === "background") setIsUploadingBackground(true);
    if (kind === "question-image") setIsUploadingEditQuestionImage(true);
    if (kind === "question-audio") setIsUploadingEditQuestionAudio(true);
    try {
      const res = await api.post("/upload", formData, {
        ...authHeaders,
        headers: {
          ...authHeaders.headers,
          "Content-Type": "multipart/form-data"
        }
      });
      const fileUrl = res.data?.data?.fileUrl as string;
      if (kind === "background") setBackgroundDraft(fileUrl);
      if (kind === "question-image") setEditQuestionImageUrl(fileUrl);
      if (kind === "question-audio") setEditQuestionAudioUrl(fileUrl);
    } finally {
      if (kind === "background") setIsUploadingBackground(false);
      if (kind === "question-image") setIsUploadingEditQuestionImage(false);
      if (kind === "question-audio") setIsUploadingEditQuestionAudio(false);
    }
  };

  const updateQuestion = async (): Promise<void> => {
    if (!editingQuestionId || !editQuestionContent.trim()) return;
    if (!Number.isFinite(editQuestionCountdown) || editQuestionCountdown <= 0) {
      setToast({ open: true, message: "Thời gian đếm ngược không hợp lệ" });
      return;
    }
    if (!Number.isFinite(editQuestionScore) || editQuestionScore <= 0) {
      setToast({ open: true, message: "Điểm câu hỏi không hợp lệ" });
      return;
    }
    const normalizedOptions = editQuestionOptions
      .map((opt, index) => ({ ...opt, label: opt.label || String.fromCharCode(65 + index), orderNum: index + 1 }))
      .filter((opt) => opt.content.trim().length > 0);
    const acceptedAnswers = editQuestionAcceptedAnswers
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((acceptedAnswer) => ({ acceptedAnswer }));

    const payload: Record<string, unknown> = {
      type: editQuestionType,
      content: editQuestionContent.trim(),
      countdownSeconds: editQuestionCountdown,
      score: editQuestionScore,
      imageUrl: editQuestionImageUrl.trim() || null,
      audioUrl: editQuestionAudioUrl.trim() || null
    };
    if (["true_false", "single_choice", "multiple_choice", "fill_blank", "listening_choice"].includes(editQuestionType)) {
      payload.options = normalizedOptions;
    }
    if (["fill_blank", "ordering", "matching"].includes(editQuestionType)) {
      payload.fillBlankAnswers = acceptedAnswers;
    }

    await api.put(
      `/questions/${editingQuestionId}`,
      payload,
      authHeaders
    );
    setOpenEditQuestionDialog(false);
    setEditingQuestionId(null);
    if (selectedExamSetId) await loadQuestions(selectedExamSetId);
    setToast({ open: true, message: "Đã cập nhật câu hỏi" });
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
      const orderedQuestionIds = questions.map((q) => q.id);
      const rotationIds = selectedQuestionIds.length > 0 ? selectedQuestionIds : orderedQuestionIds;
      if (rotationIds.length === 0) return;
      const currentIndex = selectedQuestionId ? rotationIds.indexOf(selectedQuestionId) : -1;
      if (currentIndex < 0) {
        setSelectedQuestionId(rotationIds[0]);
        return;
      }
      if (currentIndex >= rotationIds.length - 1) {
        setSelectedQuestionId(null);
        setToast({
          open: true,
          message: selectedQuestionIds.length > 0 ? "Đã hết danh sách câu đã chọn. Hãy chọn lại để chạy vòng mới." : "Đã hết bộ đề hiện tại."
        });
        return;
      }
      setSelectedQuestionId(rotationIds[currentIndex + 1]);
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

  const visibleImageQuestion = useMemo(() => {
    if (!question?.imageUrl) return null;
    if (!["question", "countdown", "reveal"].includes(screen)) return null;
    return question;
  }, [question, screen]);

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
                    <ListItemText primary={s.name} />
                    <Tooltip title="Xóa bộ đề">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingExamSetId(s.id);
                          setEditExamSetName(s.name);
                          setOpenEditExamSetDialog(true);
                        }}
                        sx={{ color: "#1A8C8E" }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
                        <DeleteRoundedIcon fontSize="small" />
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
                <Box sx={{ border: "1px solid rgba(184,217,236,0.3)", borderRadius: 2, maxHeight: 500, overflow: "auto", p: 1, display: "grid", gap: 1 }}>
                  {questions.map((q) => {
                    const isSelected = selectedQuestionId === q.id;
                    return (
                      <Box
                        key={q.id}
                        onClick={() => setSelectedQuestionId(q.id)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: "pointer",
                          border: isSelected ? "1px solid rgba(26,140,142,0.45)" : "1px solid rgba(184,217,236,0.35)",
                          bgcolor: isSelected ? "rgba(26,140,142,0.08)" : "#FFFFFF",
                          transition: "all 0.15s ease",
                          "&:hover": { bgcolor: "rgba(26,140,142,0.05)" }
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, color: "#1A3A4A", mb: 1 }}>{q.content}</Typography>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                          <Stack direction="row" spacing={1}>
                            <Chip size="small" label={q.type} sx={{ fontWeight: 700 }} />
                            <Chip size="small" label={`${q.countdownSeconds}s`} />
                            <Chip size="small" label={`${q.score} điểm`} />
                          </Stack>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Sửa câu hỏi">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingQuestionId(q.id);
                                  setEditQuestionType(q.type);
                                  setEditQuestionContent(q.content);
                                  setEditQuestionCountdown(q.countdownSeconds);
                                  setEditQuestionScore(q.score);
                                  setEditQuestionImageUrl(q.imageUrl ?? "");
                                  setEditQuestionAudioUrl(q.audioUrl ?? "");
                                  const optionSource = (q.options && q.options.length > 0
                                    ? q.options
                                    : [
                                        { label: "A", content: "", isCorrect: false, orderNum: 1 },
                                        { label: "B", content: "", isCorrect: false, orderNum: 2 },
                                        { label: "C", content: "", isCorrect: false, orderNum: 3 },
                                        { label: "D", content: "", isCorrect: false, orderNum: 4 }
                                      ]) as Array<{ label: string; content: string; isCorrect: boolean; orderNum: number }>;
                                  setEditQuestionOptions(
                                    optionSource
                                      .slice()
                                      .sort((a, b) => a.orderNum - b.orderNum)
                                      .map((opt, index) => ({
                                        label: opt.label || String.fromCharCode(65 + index),
                                        content: opt.content ?? "",
                                        isCorrect: Boolean(opt.isCorrect),
                                        orderNum: opt.orderNum ?? index + 1
                                      }))
                                  );
                                  setEditQuestionAcceptedAnswers((q.fillBlankAnswers ?? []).map((item) => item.acceptedAnswer).join("; "));
                                  setOpenEditQuestionDialog(true);
                                }}
                                sx={{ color: "#1A8C8E" }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Xóa câu hỏi">
                              <IconButton
                                size="small"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Xóa câu "${q.content}"?`)) {
                                    await api.delete(`/questions/${q.id}`, authHeaders);
                                    await loadQuestions(selectedExamSetId);
                                    if (selectedQuestionId === q.id) setSelectedQuestionId(null);
                                    setToast({ open: true, message: "Đã xóa câu hỏi" });
                                  }
                                }}
                                sx={{ color: "#DC2626" }}
                              >
                                <DeleteRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
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
              <TextField
                value={backgroundDraft}
                label="Background (LED + Thí sinh)"
                helperText="Tải lên file background rồi bấm Lưu thể lệ"
                fullWidth
                disabled
              />
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileRoundedIcon />}
                disabled={isRulesLoading || isSavingRules || isUploadingBackground}
                sx={{ width: "fit-content" }}
              >
                {isUploadingBackground ? "Đang tải background..." : "Tải background lên"}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await uploadFile(file, "background");
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </Button>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="contained"
                  onClick={async () => {
                    if (!adminToken) return;
                    setIsSavingRules(true);
                    try {
                      await api.put(
                        "/contest-state/rules",
                        { rulesContent: rulesDraft, backgroundUrl: backgroundDraft.trim() || null },
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
                <Button
                  variant="outlined"
                  onClick={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })}
                  disabled={!!pendingAction}
                  sx={{ borderColor: "#D4A741", color: "#D4A741", "&:hover": { borderColor: "#B8922E", bgcolor: "rgba(212,167,65,0.06)" } }}
                >
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
          {visibleImageQuestion?.imageUrl && (
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 1 }}>
                  Hình ảnh câu hỏi hiện tại
                </Typography>
                <Box
                  component="img"
                  key={`${visibleImageQuestion.id}-${visibleImageQuestion.imageUrl}`}
                  src={resolveMediaUrl(visibleImageQuestion.imageUrl)}
                  alt="Hình minh họa câu hỏi"
                  sx={{
                    display: "block",
                    width: "100%",
                    maxHeight: 280,
                    objectFit: "contain",
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.04)"
                  }}
                />
              </CardContent>
            </Card>
          )}
          {visibleAudioQuestion?.audioUrl && (
            <Card>
              <CardContent>
                <Typography variant="body2" sx={{ color: "#4A7A8A", mb: 1 }}>
                  Âm thanh câu hỏi hiện tại
                </Typography>
                <audio ref={adminAudioRef} controls src={resolveMediaUrl(visibleAudioQuestion.audioUrl)} style={{ width: "100%" }} />
              </CardContent>
            </Card>
          )}
          <ExamControlRoom
            currentScreen={screen}
            examSets={examSets}
            questions={questions}
            teams={teams.map((t) => ({ id: t.id, name: t.name }))}
            activeTeamIds={activeTeamIds}
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
            onToggleTeam={(teamId) => {
              setActiveTeamIds((prev) => (prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]));
            }}
            onSelectAllTeams={() => setActiveTeamIds(teams.map((t) => t.id))}
            onClearTeams={() => setActiveTeamIds([])}
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
            onRetakeQuestion={() => withAck("Thi lại câu đã chọn", "admin:retake-question", { questionId: selectedQuestionId })}
            onShowTeamScore={() =>
              withAck("Hiển thị điểm đội", "admin:show-team-score", { examSetId: selectedExamSetId, teamIds: activeTeamIds.length > 0 ? activeTeamIds : undefined })
            }
            onShowLeaderboard={() =>
              withAck("Hiển thị bảng xếp hạng", "admin:show-leaderboard", { teamIds: activeTeamIds.length > 0 ? activeTeamIds : undefined })
            }
            onShowRules={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })}
            onShowTeamList={() => withAck("Hiển thị đội thi", "admin:set-screen", { screen: "team_list", teamIds: activeTeamIds.length > 0 ? activeTeamIds : undefined })}
            onSelectAllQuestions={() => {
              const ids = [...questions.map((q) => q.id)].sort(() => Math.random() - 0.5);
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
            onReplayQuestionAudio={() => withAck("Phát âm thanh LED", "admin:play-led-audio", {})}
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
              <Button variant="text" startIcon={<HomeRoundedIcon />} onClick={() => setActiveView("welcome")} sx={sidebarButtonSx("welcome")}>
                Trang chủ
              </Button>
              <Button variant="text" startIcon={<GroupsRoundedIcon />} onClick={() => setActiveView("teams")} sx={sidebarButtonSx("teams")}>
                Quản lý đội thi
              </Button>
              <Button variant="text" startIcon={<PersonRoundedIcon />} onClick={() => setActiveView("contestants")} sx={sidebarButtonSx("contestants")}>
                Quản lý thí sinh
              </Button>
              <Button variant="text" startIcon={<DescriptionRoundedIcon />} onClick={() => setActiveView("exam_mgmt")} sx={sidebarButtonSx("exam_mgmt")}>
                Quản lý đề thi
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setActiveView("rules");
                  void loadRules();
                }}
                sx={sidebarButtonSx("rules")}
              >
                <DescriptionRoundedIcon sx={{ mr: 1 }} /> Thể lệ cuộc thi
              </Button>
              <Button variant="text" startIcon={<SportsEsportsRoundedIcon />} onClick={() => setActiveView("control")} sx={sidebarButtonSx("control")}>
                Phòng điều khiển
              </Button>
              <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid rgba(184,217,236,0.3)" }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => window.open("/led", "_blank")}
                  sx={{ justifyContent: "flex-start", px: 2.25, py: 1, borderRadius: 2.5, fontWeight: 700, textTransform: "none", color: "#E88B3A", borderColor: "rgba(232,139,58,0.3)", "&:hover": { borderColor: "#E88B3A", bgcolor: "rgba(232,139,58,0.06)" } }}
                >
                  <TvRoundedIcon sx={{ mr: 1 }} /> Mở màn hình LED
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExamSetDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={createExamSet} disabled={!examSetName.trim() || examSetOrderNum < 1}>
            Tạo bộ đề
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEditExamSetDialog} onClose={() => setOpenEditExamSetDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>Sửa bộ đề</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <TextField
            size="small"
            label="Tên bộ đề"
            value={editExamSetName}
            onChange={(e) => setEditExamSetName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditExamSetDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={updateExamSet} disabled={!editExamSetName.trim()}>
            Cập nhật
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEditQuestionDialog} onClose={() => setOpenEditQuestionDialog(false)} fullWidth maxWidth="md">
        <DialogTitle>Sửa câu hỏi</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 1.5, pt: "8px !important" }}>
          <TextField
            size="small"
            label="Nội dung câu hỏi"
            multiline
            minRows={2}
            value={editQuestionContent}
            onChange={(e) => setEditQuestionContent(e.target.value)}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              size="small"
              label="Loại câu hỏi"
              value={editQuestionType}
              disabled
            />
            <TextField
              size="small"
              label="Thời gian (giây)"
              type="number"
              value={editQuestionCountdown}
              onChange={(e) => setEditQuestionCountdown(Number(e.target.value))}
            />
            <TextField
              size="small"
              label="Điểm"
              type="number"
              value={editQuestionScore}
              onChange={(e) => setEditQuestionScore(Number(e.target.value))}
            />
          </Stack>
          {["true_false", "single_choice", "multiple_choice", "fill_blank", "listening_choice"].includes(editQuestionType) && (
            <Stack spacing={1}>
              {editQuestionOptions.map((opt, index) => (
                <Box key={`${opt.label}-${index}`} sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    label={`Đáp án ${opt.label}`}
                    value={opt.content}
                    onChange={(e) =>
                      setEditQuestionOptions((prev) => prev.map((item, i) => (i === index ? { ...item, content: e.target.value } : item)))
                    }
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={opt.isCorrect}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditQuestionOptions((prev) => {
                            const next = [...prev];
                            next[index] = { ...next[index], isCorrect: checked };
                            if (checked && ["true_false", "single_choice", "fill_blank", "listening_choice"].includes(editQuestionType)) {
                              next.forEach((item, i) => {
                                if (i !== index) next[i] = { ...item, isCorrect: false };
                              });
                            }
                            return next;
                          });
                        }}
                      />
                    }
                    label="Đúng"
                  />
                </Box>
              ))}
            </Stack>
          )}
          {["fill_blank", "ordering", "matching"].includes(editQuestionType) && (
            <TextField
              size="small"
              label="Đáp án chuẩn (cách nhau bằng ;)"
              value={editQuestionAcceptedAnswers}
              onChange={(e) => setEditQuestionAcceptedAnswers(e.target.value)}
              helperText="Ví dụ: kim hoặc 1:C;2:D;3:A"
            />
          )}
          <TextField
            size="small"
            label="Link ảnh"
            value={editQuestionImageUrl}
            onChange={(e) => setEditQuestionImageUrl(e.target.value)}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileRoundedIcon />}
            disabled={isUploadingEditQuestionImage}
            sx={{ width: "fit-content" }}
          >
            {isUploadingEditQuestionImage ? "Đang tải ảnh..." : "Tải ảnh lên"}
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await uploadFile(file, "question-image");
                e.currentTarget.value = "";
              }}
            />
          </Button>
          <TextField
            size="small"
            label="Link âm thanh"
            value={editQuestionAudioUrl}
            onChange={(e) => setEditQuestionAudioUrl(e.target.value)}
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<UploadFileRoundedIcon />}
            disabled={isUploadingEditQuestionAudio}
            sx={{ width: "fit-content" }}
          >
            {isUploadingEditQuestionAudio ? "Đang tải âm thanh..." : "Tải âm thanh lên"}
            <input
              type="file"
              hidden
              accept="audio/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await uploadFile(file, "question-audio");
                e.currentTarget.value = "";
              }}
            />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditQuestionDialog(false)}>Hủy</Button>
          <Button variant="contained" onClick={updateQuestion} disabled={!editQuestionContent.trim()}>
            Cập nhật câu hỏi
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    </ThemeProvider>
  );
};
