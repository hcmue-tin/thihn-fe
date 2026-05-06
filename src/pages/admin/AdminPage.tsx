import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Snackbar,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { appTheme } from "../../theme";
import { api, toastApp } from "../../api";
import type { AdminQuestion, AdminView, Contestant, ExamSet, Team } from "../../types/admin";
import { BackgroundsSection } from "../../components/admin/page/BackgroundsSection";
import { ContestantsSection } from "../../components/admin/page/ContestantsSection";
import { ControlRoomSection } from "../../components/admin/page/ControlRoomSection";
import { AdminSidebar } from "../../components/admin/page/AdminSidebar";
import { AdminWelcomeView } from "../../components/admin/page/AdminWelcomeView";
import { ExamManagementSection } from "../../components/admin/page/ExamManagementSection";
import { ExamSetDialogs } from "../../components/admin/page/ExamSetDialogs";
import { RulesSection } from "../../components/admin/page/RulesSection";
import { TeamsSection } from "../../components/admin/page/TeamsSection";
import { QuestionCreatorDialog } from "../../components/admin/QuestionCreatorDialog";
import { EditQuestionDialog } from "../../components/admin/question-edit/EditQuestionDialog";
import { buildQuestionContent, parseAcceptedAnswers } from "../../components/admin/questionFormUtils";
import { ACCEPTED_ANSWER_TYPES, CHOICE_TYPES } from "../../components/admin/questionTypeGroups";
import { useContestantActions, useExamActions, useTeamActions } from "../../hooks/admin/useAdminDomainActions";
import { useRealtime } from "../../hooks/useRealtime";
import { useQuestionEditorState } from "../../hooks/admin/useQuestionEditorState";

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
  const [examSetName, setExamSetName] = useState("");
  const [examSetOrderNum, setExamSetOrderNum] = useState(1);
  const [editingExamSetId, setEditingExamSetId] = useState<number | null>(null);
  const [editExamSetName, setEditExamSetName] = useState("");
  const {
    openEditQuestionDialog,
    setOpenEditQuestionDialog,
    editingQuestionId,
    setEditingQuestionId,
    editQuestionContent,
    setEditQuestionContent,
    editQuestionType,
    editQuestionCountdown,
    setEditQuestionCountdown,
    editQuestionScore,
    setEditQuestionScore,
    editQuestionImageUrl,
    setEditQuestionImageUrl,
    editQuestionAudioUrl,
    setEditQuestionAudioUrl,
    editQuestionOptions,
    setEditQuestionOptions,
    editQuestionAcceptedAnswers,
    setEditQuestionAcceptedAnswers,
    editMatchingN,
    editMatchingLeft,
    editMatchingRight,
    setEditMatchingLeft,
    setEditMatchingRight,
    resizeEditMatching,
    openEditorForQuestion
  } = useQuestionEditorState();
  const [rulesDraft, setRulesDraft] = useState("");
  const [ledBackgroundDraft, setLedBackgroundDraft] = useState("");
  const [ledWaitingBackgroundDraft, setLedWaitingBackgroundDraft] = useState("");
  const [contestantBackgroundDraft, setContestantBackgroundDraft] = useState("");
  const [isUploadingLedBg, setIsUploadingLedBg] = useState(false);
  const [isUploadingLedWaitingBg, setIsUploadingLedWaitingBg] = useState(false);
  const [isUploadingContestantBg, setIsUploadingContestantBg] = useState(false);
  const [isUploadingEditQuestionImage, setIsUploadingEditQuestionImage] = useState(false);
  const [isUploadingEditQuestionAudio, setIsUploadingEditQuestionAudio] = useState(false);
  const [isRulesLoading, setIsRulesLoading] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [activeView, setActiveView] = useState<AdminView>("welcome");
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [isLedSolutionRevealed, setIsLedSolutionRevealed] = useState(false);
  const [selectedContestantIds, setSelectedContestantIds] = useState<number[]>([]);
  const [bulkTeamTarget, setBulkTeamTarget] = useState<number | "">("");

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

  useEffect(() => {
    if (fullState?.activeTeamId !== undefined) {
      setActiveTeamId(fullState.activeTeamId ?? null);
    }
  }, [fullState?.activeTeamId]);

  useEffect(() => {
    if (screen !== "reveal") {
      setIsLedSolutionRevealed(false);
    }
  }, [screen, question?.id]);

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
      const d = rulesRes.value.data.data;
      setRulesDraft(d?.rulesContent ?? "");
      setLedBackgroundDraft(d?.ledBackgroundUrl ?? d?.backgroundUrl ?? "");
      setLedWaitingBackgroundDraft(d?.ledWaitingBackgroundUrl ?? "");
      setContestantBackgroundDraft(d?.contestantBackgroundUrl ?? d?.backgroundUrl ?? "");
    } else {
      setRulesDraft("");
      setLedBackgroundDraft("");
      setContestantBackgroundDraft("");
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
      const d = res.data.data;
      setRulesDraft(d?.rulesContent ?? "");
      setLedBackgroundDraft(d?.ledBackgroundUrl ?? d?.backgroundUrl ?? "");
      setLedWaitingBackgroundDraft(d?.ledWaitingBackgroundUrl ?? "");
      setContestantBackgroundDraft(d?.contestantBackgroundUrl ?? d?.backgroundUrl ?? "");
    } catch {
      setRulesDraft("");
      setLedBackgroundDraft("");
      setContestantBackgroundDraft("");
      setToast({ open: true, message: "Server chưa hỗ trợ API thể lệ (/contest-state/rules)" });
    } finally {
      setIsRulesLoading(false);
    }
  };

  const saveDisplayConfig = async (successMessage: string): Promise<void> => {
    if (!adminToken) return;
    setIsSavingRules(true);
    try {
      await api.put(
        "/contest-state/rules",
        {
          rulesContent: rulesDraft,
          ledBackgroundUrl: ledBackgroundDraft.trim() || null,
          ledWaitingBackgroundUrl: ledWaitingBackgroundDraft.trim() || null,
          contestantBackgroundUrl: contestantBackgroundDraft.trim() || null
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      toastApp(successMessage, "success");
    } finally {
      setIsSavingRules(false);
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

  const uploadFile = async (file: File, kind: "led-bg" | "led-waiting-bg" | "contestant-bg" | "question-image" | "question-audio"): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    if (kind === "led-bg") setIsUploadingLedBg(true);
    if (kind === "led-waiting-bg") setIsUploadingLedWaitingBg(true);
    if (kind === "contestant-bg") setIsUploadingContestantBg(true);
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
      if (kind === "led-bg") setLedBackgroundDraft(fileUrl);
      if (kind === "led-waiting-bg") setLedWaitingBackgroundDraft(fileUrl);
      if (kind === "contestant-bg") setContestantBackgroundDraft(fileUrl);
      if (kind === "question-image") setEditQuestionImageUrl(fileUrl);
      if (kind === "question-audio") setEditQuestionAudioUrl(fileUrl);
      toastApp("Tải tệp lên thành công", "success");
    } finally {
      if (kind === "led-bg") setIsUploadingLedBg(false);
      if (kind === "led-waiting-bg") setIsUploadingLedWaitingBg(false);
      if (kind === "contestant-bg") setIsUploadingContestantBg(false);
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
    const acceptedAnswers = parseAcceptedAnswers(editQuestionAcceptedAnswers, editQuestionType);

    const payload: Record<string, unknown> = {
      type: editQuestionType,
      content:
        buildQuestionContent(editQuestionType, editQuestionContent, editMatchingLeft, editMatchingRight),
      countdownSeconds: editQuestionCountdown,
      score: editQuestionScore,
      imageUrl: editQuestionImageUrl.trim() || null,
      audioUrl: editQuestionAudioUrl.trim() || null
    };
    if (CHOICE_TYPES.includes(editQuestionType)) {
      payload.options = normalizedOptions;
    }
    if (editQuestionType === "fill_blank") {
      payload.fillBlankAnswers = [];
    } else if (ACCEPTED_ANSWER_TYPES.includes(editQuestionType)) {
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
      setPendingAction("B1: Dừng & hiện đáp án thí sinh");
      const ack = await emitWithAck("admin:stop-countdown", {});
      if (!ack.success) {
        setToast({ open: true, message: ack.message || "Action failed" });
        return;
      }
      setIsLedSolutionRevealed(false);
      setToast({ open: true, message: "Đã hiện đáp án thí sinh. Bạn có thể bấm B2 để hiện đáp án đúng trên LED." });
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

  const revealSolutionOnLed = async (): Promise<void> => {
    if (isLedSolutionRevealed) return;
    try {
      setPendingAction("B2: LED hiển thị đáp án đúng");
      const ack = await emitWithAck("admin:reveal-solution-on-led", {});
      if (!ack.success) {
        setToast({ open: true, message: ack.message || "Action failed" });
        return;
      }
      setIsLedSolutionRevealed(true);
      setToast({ open: true, message: "Đã hiển thị đáp án đúng cho LED và thí sinh." });
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

  const teamActions = useTeamActions({
    teamName,
    authHeaders,
    adminToken,
    loadCoreData,
    setTeamName,
    setToast
  });

  const contestantActions = useContestantActions({
    bulkTeamTarget,
    selectedContestantIds,
    authHeaders,
    adminToken,
    loadCoreData,
    setSelectedContestantIds: (ids) => setSelectedContestantIds(ids),
    setBulkTeamTarget: (value) => setBulkTeamTarget(value),
    contestantCode,
    contestantPassword,
    contestantName,
    setContestantName,
    setContestantCode,
    setContestantPassword,
    setToast
  });

  const examActions = useExamActions({
    authHeaders,
    adminToken,
    loadCoreData,
    loadQuestions,
    selectedExamSetId,
    selectedQuestionId,
    setSelectedExamSetId: (value) => setSelectedExamSetId(value),
    setQuestions: (next) => setQuestions(next),
    setToast,
    setSelectedQuestionId: (id) => setSelectedQuestionId(id)
  });

  if (!adminToken) {
    return (
      <ThemeProvider theme={appTheme}>
        <Box
          sx={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: "clamp(1rem, 2vw, 3rem)",
            background: "linear-gradient(165deg, #E8F4FA 0%, #F0F7FB 50%, #E8F4FA 100%)"
          }}
        >
          <Card
            sx={{
              width: "min(92vw, 28rem)",
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(26,140,142,0.15)"
            }}
          >
            <CardContent sx={{ p: "clamp(1.5rem, 2.5vw, 3rem)" }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 900, textAlign: "center", color: "#0F6B6D" }}>
                Đăng nhập quản trị
              </Typography>
              <Stack spacing={2.5}>
                <TextField
                  type="password"
                  label="Mật khẩu quản trị"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && adminPassword) {
                      void handleAdminLogin();
                    }
                  }}
                  slotProps={{
                    htmlInput: {
                      autoCapitalize: "none",
                      autoCorrect: "off",
                      spellCheck: false,
                      inputMode: "text",
                      style: { imeMode: "disabled" as never }
                    }
                  }}
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
        <TeamsSection
          teams={teams}
          contestants={contestants}
          teamName={teamName}
          onTeamNameChange={setTeamName}
          onAddTeam={teamActions.onAddTeam}
          onEditTeam={teamActions.onEditTeam}
          onDeleteTeam={teamActions.onDeleteTeam}
          onAssignContestantsToTeam={teamActions.onAssignContestantsToTeam}
        />
      );
    }

    if (activeView === "contestants") {
      return (
        <ContestantsSection
          contestants={contestants}
          teams={teams}
          selectedContestantIds={selectedContestantIds}
          bulkTeamTarget={bulkTeamTarget}
          onToggleContestantSelected={(id) =>
            setSelectedContestantIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
          onBulkTeamTargetChange={setBulkTeamTarget}
          onBulkAssignTeam={contestantActions.onBulkAssignTeam}
          onImportExcel={contestantActions.onImportExcel}
          contestantName={contestantName}
          contestantCode={contestantCode}
          contestantPassword={contestantPassword}
          onContestantNameChange={setContestantName}
          onContestantCodeChange={setContestantCode}
          onContestantPasswordChange={setContestantPassword}
          onAddContestant={contestantActions.onAddContestant}
          onEditContestant={contestantActions.onEditContestant}
          onDeleteContestant={contestantActions.onDeleteContestant}
        />
      );
    }

    if (activeView === "exam_mgmt") {
      return (
        <ExamManagementSection
          examSets={examSets}
          questions={questions}
          selectedExamSetId={selectedExamSetId}
          selectedQuestionId={selectedQuestionId}
          onOpenCreateExamSet={() => setOpenExamSetDialog(true)}
          onSelectExamSet={examActions.onSelectExamSet}
          onEditExamSet={(id, name) => {
            setEditingExamSetId(id);
            setEditExamSetName(name);
            setOpenEditExamSetDialog(true);
          }}
          onDeleteExamSet={examActions.onDeleteExamSet}
          onOpenCreateQuestion={() => setOpenQuestionDialog(true)}
          onSelectQuestion={setSelectedQuestionId}
          onEditQuestion={openEditorForQuestion}
          onDeleteQuestion={examActions.onDeleteQuestion}
        />
      );
    }

    if (activeView === "rules") {
      return (
        <RulesSection
          rulesDraft={rulesDraft}
          ledBackgroundDraft={ledBackgroundDraft}
          contestantBackgroundDraft={contestantBackgroundDraft}
          isRulesLoading={isRulesLoading}
          isSavingRules={isSavingRules}
          onRulesDraftChange={setRulesDraft}
          onSaveRules={async () => {
            await saveDisplayConfig("Đã lưu thể lệ cuộc thi");
          }}
          onShowRulesOnLed={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })}
          onReloadRules={() => loadRules()}
        />
      );
    }

    if (activeView === "backgrounds") {
      return (
        <BackgroundsSection
          ledBackgroundDraft={ledBackgroundDraft}
          ledWaitingBackgroundDraft={ledWaitingBackgroundDraft}
          contestantBackgroundDraft={contestantBackgroundDraft}
          isUploadingLedBg={isUploadingLedBg}
          isUploadingLedWaitingBg={isUploadingLedWaitingBg}
          isUploadingContestantBg={isUploadingContestantBg}
          isSavingRules={isSavingRules}
          onUploadLedBackground={(file) => uploadFile(file, "led-bg")}
          onUploadLedWaitingBackground={(file) => uploadFile(file, "led-waiting-bg")}
          onUploadContestantBackground={(file) => uploadFile(file, "contestant-bg")}
          onSaveBackgrounds={async () => {
            await saveDisplayConfig("Đã lưu hình nền");
          }}
        />
      );
    }

    if (activeView === "control") {
      return (
        <ControlRoomSection
          screen={screen}
          questionAudioUrl={visibleAudioQuestion?.audioUrl ?? null}
          questionImageUrl={visibleImageQuestion?.imageUrl ?? null}
          questionImageId={visibleImageQuestion?.id ?? null}
          questionAudioId={visibleAudioQuestion?.id ?? null}
          examSets={examSets}
          questions={questions}
          teams={teams}
          activeTeamId={activeTeamId}
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
          onSelectTeam={(teamId) => {
            setActiveTeamId(teamId);
            if (!adminToken) return;
            void emitWithAck("admin:set-active-team", { activeTeamId: teamId ?? null });
          }}
          onGoWaiting={() => withAck("Vào màn chờ", "admin:set-screen", { screen: "waiting", teamIds: activeTeamId != null ? [activeTeamId] : undefined })}
          onResetSession={async () => {
            const confirmed = window.confirm("Reset sẽ xóa trạng thái câu đang chạy và dừng countdown. Tiếp tục?");
            if (!confirmed) return;
            await withAck("Reset phiên thi", "admin:reset-session", {});
            setSelectedQuestionId(null);
            setSelectedQuestionIds([]);
          }}
          onShowQuestion={() => withAck("Hiển thị câu hỏi", "admin:show-question", { questionId: selectedQuestionId, activeTeamId })}
          onStartCountdown={() => withAck("Bắt đầu đếm ngược", "admin:start-countdown", { questionId: selectedQuestionId, activeTeamId })}
          onStopShowAnswer={stopAndAutoNext}
          onRetakeQuestion={() => withAck("Thi lại câu đã chọn", "admin:retake-question", { questionId: selectedQuestionId, activeTeamId })}
          onShowTeamScore={() => withAck("Hiển thị điểm đội", "admin:show-team-score", { examSetId: selectedExamSetId, teamIds: activeTeamId != null ? [activeTeamId] : undefined, activeTeamId })}
          onShowLeaderboard={() => withAck("Hiển thị bảng xếp hạng", "admin:show-leaderboard", { activeTeamId, showAll: true })}
          onLeaderboardPrevPage={() => withAck("Chuyển trang trước bảng xếp hạng", "admin:leaderboard-page", { direction: "prev" })}
          onLeaderboardNextPage={() => withAck("Chuyển trang sau bảng xếp hạng", "admin:leaderboard-page", { direction: "next" })}
          onShowRules={() => withAck("Hiển thị thể lệ", "admin:set-screen", { screen: "rules" })}
          onShowTeamList={() => withAck("Hiển thị đội thi", "admin:set-screen", { screen: "team_list", teamIds: activeTeamId != null ? [activeTeamId] : undefined })}
          onRevealSolutionOnLed={revealSolutionOnLed}
          isLedSolutionRevealed={isLedSolutionRevealed}
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
          onReplayQuestionAudio={() => withAck("Phát âm thanh LED", "admin:play-led-audio", {})}
        />
      );
    }

    return (
      <AdminWelcomeView
        teamsCount={teams.length}
        contestantsCount={contestants.length}
        examSetsCount={examSets.length}
        isConnected={isConnected}
        hasFullState={Boolean(fullState)}
        screen={screen}
      />
    );
  };

  return (
    <ThemeProvider theme={appTheme}>
    <Box sx={{ minHeight: "100vh", bgcolor: "#F0F7FB", p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: 2 }}>
        <AdminSidebar
          activeView={activeView}
          isConnected={isConnected}
          onOpenLedScreen={() => window.open("/led", "_blank")}
          onChangeView={(view) => {
            setActiveView(view);
            if (view === "rules" || view === "backgrounds") {
              void loadRules();
            }
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: "#0F6B6D" }}>
              {activeView === "welcome"
                ? "Trang chủ"
                : activeView === "teams"
                  ? "Quản lý đội thi"
                  : activeView === "contestants"
                    ? "Quản lý thí sinh"
                  : activeView === "exam_mgmt"
                    ? "Quản lý đề thi"
                  : activeView === "rules"
                    ? "Thể lệ cuộc thi"
                    : activeView === "backgrounds"
                      ? "Hình nền hiển thị"
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
      <ExamSetDialogs
        openCreate={openExamSetDialog}
        openEdit={openEditExamSetDialog}
        examSetName={examSetName}
        examSetOrderNum={examSetOrderNum}
        editExamSetName={editExamSetName}
        onCloseCreate={() => setOpenExamSetDialog(false)}
        onCloseEdit={() => setOpenEditExamSetDialog(false)}
        onExamSetNameChange={setExamSetName}
        onEditExamSetNameChange={setEditExamSetName}
        onCreate={createExamSet}
        onUpdate={updateExamSet}
      />
      <EditQuestionDialog
        open={openEditQuestionDialog}
        questionType={editQuestionType}
        content={editQuestionContent}
        countdown={editQuestionCountdown}
        score={editQuestionScore}
        options={editQuestionOptions}
        acceptedAnswers={editQuestionAcceptedAnswers}
        matchingN={editMatchingN}
        matchingLeft={editMatchingLeft}
        matchingRight={editMatchingRight}
        imageUrl={editQuestionImageUrl}
        audioUrl={editQuestionAudioUrl}
        isUploadingImage={isUploadingEditQuestionImage}
        isUploadingAudio={isUploadingEditQuestionAudio}
        onClose={() => setOpenEditQuestionDialog(false)}
        onSave={updateQuestion}
        onContentChange={setEditQuestionContent}
        onCountdownChange={setEditQuestionCountdown}
        onScoreChange={setEditQuestionScore}
        onOptionChange={setEditQuestionOptions}
        onAcceptedAnswersChange={setEditQuestionAcceptedAnswers}
        onResizeMatching={resizeEditMatching}
        onMatchingLeftChange={(idx, value) => {
          const next = [...editMatchingLeft];
          next[idx] = value;
          setEditMatchingLeft(next);
        }}
        onMatchingRightChange={(idx, value) => {
          const next = [...editMatchingRight];
          next[idx] = value;
          setEditMatchingRight(next);
        }}
        onImageUrlChange={setEditQuestionImageUrl}
        onAudioUrlChange={setEditQuestionAudioUrl}
        onUploadImage={(file) => uploadFile(file, "question-image")}
        onUploadAudio={(file) => uploadFile(file, "question-audio")}
      />
    </Box>
    </ThemeProvider>
  );
};
