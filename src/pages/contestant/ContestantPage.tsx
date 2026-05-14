import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { api, getBackendBaseUrl, resolveMediaUrl } from "../../api";
import { clearAllSessions } from "../../auth/session";
import { useRealtime } from "../../hooks/useRealtime";
import { QuestionForm } from "../../components/contestant/QuestionForm";
import { ResultView } from "../../components/contestant/ResultView";
import { useCountdownClock } from "../../hooks/realtime/useCountdownClock";
import { lightTheme } from "../../theme";
import { fluid, fluidFont } from "../../utils/fluid";

type ContestantIdentity = {
  id: number;
  teamId?: number | null;
  code: string;
  name: string;
  unit?: string | null;
  totalScore: number;
};

type AnswerReceivedPayload = {
  questionId: number;
  timestamp?: number;
  selectedOptionIds?: number[] | null;
  fillText?: string | null;
};

type PendingSubmitPayload = {
  questionId: number;
  selectedOptionIds?: number[];
  fillText?: string;
  createdAt: number;
};

const readStoredContestantProfile = (): ContestantIdentity | null => {
  const raw = localStorage.getItem("contestantProfile");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ContestantIdentity;
  } catch {
    localStorage.removeItem("contestantProfile");
    localStorage.removeItem("contestantToken");
    localStorage.removeItem("accessToken");
    return null;
  }
};

/*
 * The contestant page is designed as a fit-to-viewport experience — the
 * whole UI must fit on laptops (1366x768), desktops and iPad landscape
 * without any scrolling. We achieve this with:
 *   - 100svh outer container + overflow: hidden
 *   - Fluid padding/gap/sizes via clamp() rather than breakpoint ladders
 *   - A CSS grid for the question / timer row that uses `fr` units so
 *     internal blocks expand/shrink proportionally with width
 *   - Body.app-no-scroll via useEffect (desktop/tablet only; see index.css)
 */

export const ContestantPage = () => {
  const {
    socket,
    isConnected,
    screen,
    question,
    options,
    countdownEndsAt,
    countdownSeconds,
    latestAnswerResult,
    rulesContent,
    backgroundUrl,
    contestantBackgroundUrl,
    questionShowSeq,
    ledSolutionVisible,
    reveal,
    fullState,
    connectSocket,
    disconnectSocket,
    emitWithAck
  } = useRealtime();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(localStorage.getItem("contestantToken"));
  const [identity, setIdentity] = useState<ContestantIdentity | null>(readStoredContestantProfile);
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [fillText, setFillText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [officialScore, setOfficialScore] = useState<number>(identity?.totalScore ?? 0);
  const [contestantBackgroundFallback, setContestantBackgroundFallback] = useState<string | null>(null);
  const [bgLoadState, setBgLoadState] = useState<"idle" | "loaded" | "error">("idle");
  const [countedQuestionId, setCountedQuestionId] = useState<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const pendingRetryKeyRef = useRef<string | null>(null);
  const currentSessionId = fullState?.currentSessionId ?? 1;
  const draftKey = question && identity ? `contestantDraft:${identity.id}:${currentSessionId}:${question.id}` : null;
  const pendingSubmitKey = question && identity ? `contestantPendingSubmit:${identity.id}:${currentSessionId}:${question.id}` : null;
  const [resultPopupVisible, setResultPopupVisible] = useState(false);
  const passwordInputProps = {
    autoCapitalize: "none" as const,
    autoCorrect: "off" as const,
    spellCheck: false,
    inputMode: "text" as const,
    style: { imeMode: "disabled" } as any
  };

  // Opt-in to body-level overflow hidden for this route. The CSS media
  // query in index.css automatically relaxes this on mobile (<=640px).
  useEffect(() => {
    document.body.classList.add("app-no-scroll");
    return () => document.body.classList.remove("app-no-scroll");
  }, []);

  useEffect(() => {
    if (token) {
      connectSocket({ token, role: "contestant" });
    }
  }, [token, connectSocket]);

  useEffect(() => {
    if (!token || !identity) return;
    let mounted = true;
    void api
      .get<{ success: boolean; data: { contestantId: number; totalScore: number } }>("/contestants/me/score")
      .then((res) => {
        if (!mounted) return;
        setOfficialScore(Number(res.data.data.totalScore) || 0);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [identity?.id, latestAnswerResult?.totalScore, token]);

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem("contestantToken") || localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    void fetch(`${getBackendBaseUrl()}/api/contest-state/rules`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json?.data) return;
        const data = json.data as { contestantBackgroundUrl?: string | null; backgroundUrl?: string | null };
        setContestantBackgroundFallback(data.contestantBackgroundUrl ?? data.backgroundUrl ?? null);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!socket || !question) return;
    const onAnswerReceived = (payload: AnswerReceivedPayload) => {
      if (payload.questionId !== question.id) return;
      if (payload.selectedOptionIds) {
        setSelectedOptionIds(payload.selectedOptionIds);
      }
      if (payload.fillText !== undefined && payload.fillText !== null) {
        setFillText(payload.fillText);
      }
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      if (pendingSubmitKey) {
        localStorage.removeItem(pendingSubmitKey);
      }
      setIsSubmitted(true);
      setLocked(true);
    };
    socket.on("contestant:answer-received", onAnswerReceived);
    return () => {
      socket.off("contestant:answer-received", onAnswerReceived);
    };
  }, [draftKey, pendingSubmitKey, socket, question]);

  useEffect(() => {
    if (!question) {
      return;
    }
    let restoredSelectedOptionIds: number[] = [];
    let restoredFillText = "";
    if (draftKey) {
      try {
        const rawDraft = localStorage.getItem(draftKey);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft) as { selectedOptionIds?: number[]; fillText?: string };
          if (Array.isArray(parsed.selectedOptionIds)) {
            restoredSelectedOptionIds = parsed.selectedOptionIds.map(Number).filter(Number.isFinite);
          }
          if (typeof parsed.fillText === "string") {
            restoredFillText = parsed.fillText;
          }
        }
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    setSelectedOptionIds(restoredSelectedOptionIds);
    setFillText(restoredFillText);
    setIsSubmitted(false);
    setLocked(false);
    autoSubmitTriggeredRef.current = false;
    pendingRetryKeyRef.current = null;
  }, [draftKey, question?.id, questionShowSeq]);

  useEffect(() => {
    if (!draftKey || !question || locked || isSubmitted) return;
    const hasDraft = selectedOptionIds.length > 0 || fillText.trim().length > 0;
    if (!hasDraft) {
      localStorage.removeItem(draftKey);
      return;
    }
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        selectedOptionIds,
        fillText,
        updatedAt: Date.now()
      })
    );
  }, [draftKey, fillText, isSubmitted, locked, question, selectedOptionIds]);

  const { remainingMs, remainingSeconds, progress } = useCountdownClock(countdownEndsAt, countdownSeconds);
  useEffect(() => {
    if (!question) {
      setCountedQuestionId(null);
      return;
    }
    setCountedQuestionId((prev) => (prev === question.id ? prev : null));
  }, [question?.id]);
  useEffect(() => {
    if (question && countdownEndsAt) {
      setCountedQuestionId(question.id);
    }
  }, [countdownEndsAt, question]);

  const handleLogin = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post("/auth/contestant/login", { code, password });
      const data = response.data.data as { token: string; contestant: ContestantIdentity };
      localStorage.setItem("contestantToken", data.token);
      localStorage.setItem("accessToken", data.token);
      localStorage.setItem("contestantProfile", JSON.stringify(data.contestant));
      setIdentity(data.contestant);
      setOfficialScore(Number(data.contestant.totalScore) || 0);
      setToken(data.token);
    } catch {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra mã và mật khẩu.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (): Promise<void> => {
    if (!question || locked || isSubmitted) return;
    setIsLoading(true);
    const normalizedFillText = fillText.trim();
    const payload = {
      questionId: question.id,
      selectedOptionIds: selectedOptionIds.length > 0 ? selectedOptionIds : undefined,
      fillText: normalizedFillText.length > 0 ? normalizedFillText : undefined
    };
    if (pendingSubmitKey) {
      localStorage.setItem(pendingSubmitKey, JSON.stringify({ ...payload, createdAt: Date.now() }));
    }
    const ack = await emitWithAck("contestant:submit-answer", payload);
    setIsLoading(false);
    if (!ack.success) {
      const shouldRetry =
        ack.message === "Socket not connected" ||
        ack.message?.includes("Mất kết nối") ||
        ack.message?.toLowerCase().includes("connect");
      if (!shouldRetry && pendingSubmitKey) {
        localStorage.removeItem(pendingSubmitKey);
      }
      if (ack.message === "Submission is not allowed now") {
        return;
      }
      setError(ack.message || "Submit failed");
      setToastOpen(true);
      return;
    }
    if (draftKey) {
      localStorage.removeItem(draftKey);
    }
    if (pendingSubmitKey) {
      localStorage.removeItem(pendingSubmitKey);
    }
    setIsSubmitted(true);
    setLocked(true);
  };

  const hasPendingSelection = selectedOptionIds.length > 0 || fillText.trim().length > 0;

  useEffect(() => {
    if (!isConnected || !pendingSubmitKey || !question || locked || isSubmitted || isLoading) return;
    if (screen !== "countdown" && screen !== "reveal") return;
    const rawPending = localStorage.getItem(pendingSubmitKey);
    if (!rawPending || pendingRetryKeyRef.current === pendingSubmitKey) return;

    let pending: PendingSubmitPayload | null = null;
    try {
      pending = JSON.parse(rawPending) as PendingSubmitPayload;
    } catch {
      localStorage.removeItem(pendingSubmitKey);
      return;
    }
    if (!pending || pending.questionId !== question.id) {
      localStorage.removeItem(pendingSubmitKey);
      return;
    }

    pendingRetryKeyRef.current = pendingSubmitKey;
    if (pending.selectedOptionIds) setSelectedOptionIds(pending.selectedOptionIds);
    if (pending.fillText !== undefined) setFillText(pending.fillText);

    void (async () => {
      setIsLoading(true);
      const ack = await emitWithAck("contestant:submit-answer", {
        questionId: pending.questionId,
        selectedOptionIds: pending.selectedOptionIds,
        fillText: pending.fillText
      });
      setIsLoading(false);

      if (ack.success) {
        localStorage.removeItem(pendingSubmitKey);
        if (draftKey) localStorage.removeItem(draftKey);
        setIsSubmitted(true);
        setLocked(true);
        return;
      }

      const shouldRetry =
        ack.message === "Socket not connected" ||
        ack.message?.includes("Mất kết nối") ||
        ack.message?.toLowerCase().includes("connect");
      if (shouldRetry) {
        pendingRetryKeyRef.current = null;
        return;
      }

      localStorage.removeItem(pendingSubmitKey);
      if (ack.message !== "Submission is not allowed now") {
        setError(ack.message || "Submit failed");
        setToastOpen(true);
      }
    })();
  }, [draftKey, emitWithAck, isConnected, isLoading, isSubmitted, locked, pendingSubmitKey, question, screen]);

  useEffect(() => {
    if (
      screen !== "countdown" ||
      !question ||
      isSubmitted ||
      locked ||
      isLoading ||
      !hasPendingSelection ||
      remainingMs > 0 ||
      autoSubmitTriggeredRef.current
    ) {
      return;
    }
    autoSubmitTriggeredRef.current = true;
    void submitAnswer();
  }, [hasPendingSelection, isLoading, isSubmitted, locked, question, remainingMs, screen]);

  useEffect(() => {
    if (
      screen !== "reveal" ||
      !question ||
      isSubmitted ||
      locked ||
      isLoading ||
      !hasPendingSelection ||
      autoSubmitTriggeredRef.current
    ) {
      return;
    }
    autoSubmitTriggeredRef.current = true;
    void submitAnswer();
  }, [hasPendingSelection, isLoading, isSubmitted, locked, question, screen]);

  const correctAnswerText = useMemo(() => {
    if (!question || !reveal) return "";
    if (question.type === "single_choice" || question.type === "true_false" || question.type === "multiple_choice") {
      const labels = options
        .filter((opt) => reveal.correctOptionIds.includes(opt.id))
        .map((opt) => opt.label)
        .filter(Boolean);
      return labels.length > 0 ? labels.join(", ") : "";
    }
    if (question.type === "ordering") {
      return reveal.fillBlankAnswers
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" | ");
    }
    if (question.type === "matching") {
      return (reveal.fillBlankAnswers[0] ?? "")
        .split(";")
        .map((pair) => pair.trim().replace(/\./g, ":"))
        .filter(Boolean)
        .join("; ");
    }
    if (question.type === "fill_blank") {
      return reveal.fillBlankAnswers
        .map((value) => value.trim())
        .filter(Boolean)
        .join(" | ");
    }
    return "";
  }, [options, question, reveal]);



  if (!token || !identity) {
    return (
      <ThemeProvider theme={lightTheme}>
        <Box
          sx={{
            minHeight: "100svh",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: fluid(1, 2, 3),
            backgroundColor: "#EAF3F8"
          }}
        >
          <Card
            sx={{
              width: "min(92vw, 28rem)",
              backgroundColor: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(26,140,142,0.15)",
              borderRadius: fluid(1, 1.5, 2)
            }}
          >
            <CardContent sx={{ p: fluid(1.25, 2.2, 3) }}>
              <Typography variant="h5" sx={{ mb: fluid(1, 1.5, 2), fontWeight: 900, textAlign: "center", color: "#0F6B6D" }}>
                Đăng nhập thí sinh
              </Typography>
              <Stack spacing={fluid(1, 1.5, 2)}>
                <TextField label="Mã thí sinh" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
                <TextField
                  label="Mật khẩu"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && code && password && !isLoading) {
                      void handleLogin();
                    }
                  }}
                  slotProps={{ htmlInput: passwordInputProps }}
                  fullWidth
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleLogin}
                  disabled={isLoading || !code || !password}
                  sx={{
                    mt: fluid(0.5, 1, 1.5),
                    fontWeight: "bold",
                    minHeight: fluid(2.5, 3.25, 3.75),
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)",
                    "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" }
                  }}
                >
                  Đăng nhập
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </ThemeProvider>
    );
  }

  const showWaiting = screen === "idle" || screen === "waiting" || screen === "rules" || screen === "team_list";
  const showRules = screen === "rules";
  const isDuringQuestionFlow = screen === "question" || screen === "countdown" || screen === "reveal";
  const activeTeamId = fullState?.activeTeamId ?? null;
  const isTeamNotSelected = isDuringQuestionFlow && activeTeamId == null;
  const isBlockedByTeam = isDuringQuestionFlow && activeTeamId != null && identity.teamId !== activeTeamId;
  const shouldBlockInteraction = isTeamNotSelected || isBlockedByTeam;

  const showQuestion = !shouldBlockInteraction && isDuringQuestionFlow && question;
  const showResult = !shouldBlockInteraction && screen === "reveal" && ledSolutionVisible && latestAnswerResult;
  const showCorrectAnswer =
    !shouldBlockInteraction && screen === "reveal" && ledSolutionVisible && question && reveal;
  const waitingForCountdown = screen === "question";

  useEffect(() => {
    if (showResult) {
      setResultPopupVisible(true);
      const timer = setTimeout(() => setResultPopupVisible(false), 2000);
      return () => clearTimeout(timer);
    } else {
      setResultPopupVisible(false);
    }
  }, [showResult]);
  const canSubmit = isConnected && !shouldBlockInteraction && screen === "countdown" && !!countdownEndsAt && remainingMs > 0 && !isSubmitted;
  const isMatchingQuestion = question?.type === "matching";
  const contestantBg =
    (contestantBackgroundUrl && contestantBackgroundUrl.trim().length > 0 ? contestantBackgroundUrl : null) ??
    (backgroundUrl && backgroundUrl.trim().length > 0 ? backgroundUrl : null) ??
    contestantBackgroundFallback;
  const contestantBackgroundImage =
    contestantBg && contestantBg.trim().length > 0 ? resolveMediaUrl(contestantBg) : null;
  const debugEnabled = new URLSearchParams(window.location.search).get("debugBg") === "1";
  const handleLogout = (): void => {
    disconnectSocket();
    clearAllSessions();
    setToken(null);
    setIdentity(null);
    setCode("");
    setPassword("");
  };

  const countdownDisplay =
    screen === "countdown"
      ? remainingSeconds
      : countedQuestionId === question?.id
        ? 0
        : (question?.countdownSeconds ?? countdownSeconds ?? 0);

  return (
    <ThemeProvider theme={lightTheme}>
      {/* Fixed, fluid background — the logo must NEVER be embedded in the
          background image. Image is a separate, contained element. */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundColor: "#EAF3F8",
          overflow: "hidden"
        }}
      >
        {contestantBackgroundImage && (
          <>
            <Box
              component="img"
              src={contestantBackgroundImage}
              alt=""
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
                opacity: 0.34,
                filter: "blur(20px) saturate(0.95)",
                transform: "scale(1.05)"
              }}
            />
            <Box
              component="img"
              src={contestantBackgroundImage}
              alt=""
              onLoad={() => setBgLoadState("loaded")}
              onError={() => setBgLoadState("error")}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                objectPosition: "center center",
                opacity: 1
              }}
            />
          </>
        )}
      </Box>

      <Box
        sx={{
          height: "100svh",
          width: "100%",
          display: "grid",
          gridTemplateRows: "20svh minmax(0, 80svh)",
          position: "relative",
          zIndex: 1,
          px: fluid(0.75, 1.6, 2.5),
          pt: 0,
          pb: fluid(0.5, 1, 1.2),
          overflow: "hidden",
          "@media (max-width: 640px)": {
            overflow: "auto",
            height: "auto",
            minHeight: "100svh",
            gridTemplateRows: "auto minmax(0, 1fr)"
          }
        }}
      >
        {/* 20% top reserved for logo/banner area */}
        <Box sx={{ height: "100%", minHeight: 0 }} />
        <Box
          sx={{
            height: "100%",
            minHeight: 0,
            width: "100%",
            maxWidth: "min(96vw, 90rem)",
            mx: "auto",
            position: "relative",
            overflow: "hidden",
            backgroundColor: "rgba(255,255,255,0.92)",
            borderRadius: fluid(0.75, 1.2, 1.5),
            p: fluid(0.75, 1.2, 1.75),
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(26,140,142,0.15)",
            boxShadow: "0 16px 48px rgba(26,140,142,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: fluid(0.4, 0.7, 1)
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: fluid(0.5, 1, 1.5),
              flexWrap: "wrap"
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                color: "#0F6B6D",
                textTransform: "uppercase",
                fontSize: fluidFont.h6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
                flex: 1
              }}
            >
              {identity.name} ({identity.code})
            </Typography>
            <Box
              sx={{
                px: fluid(0.9, 1.2, 1.6),
                py: fluid(0.25, 0.4, 0.55),
                borderRadius: 999,
                background: "linear-gradient(135deg, #D4A741, #F5D98A)",
                color: "#FFFFFF",
                fontWeight: 800,
                fontSize: fluidFont.body,
                boxShadow: "0 4px 16px rgba(212,167,65,0.3)",
                whiteSpace: "nowrap"
              }}
            >
              Tổng điểm: {latestAnswerResult?.totalScore ?? officialScore}
            </Box>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={handleLogout}
              sx={{ fontWeight: 700, flexShrink: 0, fontSize: fluidFont.body }}
            >
              Đăng xuất
            </Button>
          </Box>
          {identity.unit && (
            <Typography sx={{ textAlign: "center", color: "#4A7A8A", fontSize: fluidFont.body }}>
              {identity.unit}
            </Typography>
          )}

          {/* Main content area fills remaining space fluidly. */}
          <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: fluid(0.5, 1, 1.5), position: "relative" }}>
            {shouldBlockInteraction && (
              <Alert severity="warning" sx={{ borderRadius: 3, fontSize: fluidFont.body }}>
                {isTeamNotSelected
                  ? "Chưa có đội nào được chọn. Vui lòng chờ đến lượt đội của bạn."
                  : "Bạn không thuộc đội đang thi. Vui lòng chờ đến lượt đội của bạn."}
              </Alert>
            )}
            {!isConnected && (
              <Alert severity="warning" sx={{ borderRadius: 3, fontSize: fluidFont.body }}>
                Mat ket noi may chu. Dap an dang chon da duoc luu tam, vui long cho tu ket noi lai.
              </Alert>
            )}
            {!shouldBlockInteraction && showWaiting && (
              <Alert severity="info" sx={{ borderRadius: 3, fontSize: fluidFont.body }}>
                {showRules ? "Đang hiển thị thể lệ cuộc thi" : "Đang chờ quản trị viên bắt đầu..."}
              </Alert>
            )}
            {!shouldBlockInteraction && isDuringQuestionFlow && !question && (
              <Alert severity="info" sx={{ borderRadius: 3, fontSize: fluidFont.body }}>
                Dang tai cau hoi...
              </Alert>
            )}
            {showRules && (
              <Card
                sx={{
                  borderRadius: 3,
                  border: "1px solid rgba(26,140,142,0.15)",
                  overflow: "auto"
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F6B6D", mb: 1 }}>
                    Thể lệ cuộc thi
                  </Typography>
                  <Typography sx={{ whiteSpace: "pre-wrap", color: "#1A3A4A", fontSize: fluidFont.body }}>
                    {rulesContent?.trim() || "Chưa cấu hình thể lệ cuộc thi"}
                  </Typography>
                </CardContent>
              </Card>
            )}

            {showQuestion && question && (
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: fluid(0.75, 1.4, 2),
                  alignItems: "stretch",
                  "@media (max-width: 640px)": {
                    gap: fluid(0.75, 1, 1.25)
                  }
                }}
              >
                {!isMatchingQuestion && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      flexShrink: 0
                    }}
                  >
                    <Box
                      sx={{
                        width: fluid(4.5, 9, 8, "vmin"),
                        height: fluid(4.5, 9, 8, "vmin"),
                        aspectRatio: "1 / 1",
                        borderRadius: "50%",
                        border: "2px solid rgba(15,107,109,0.28)",
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                        boxShadow: "0 12px 28px rgba(15,107,109,0.14)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 900,
                          color: "#17324d",
                          lineHeight: 1,
                          fontSize: fluidFont.displaySm
                        }}
                      >
                        {countdownDisplay}
                      </Typography>
                    </Box>
                  </Box>
                )}

                <Box
                  sx={{
                    minWidth: 0,
                    flex: 1,
                    minHeight: 0,
                    p: fluid(0.5, 1, 1.25),
                    borderRadius: 3,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    border: "1px solid rgba(26,140,142,0.16)",
                    boxShadow: "0 10px 28px rgba(23,50,77,0.08)",
                    overflow: "auto"
                  }}
                >
                  <QuestionForm
                    question={question}
                    options={options}
                    selectedOptionIds={selectedOptionIds}
                    fillText={fillText}
                    progress={progress}
                    locked={locked || screen === "reveal"}
                    isLoading={isLoading}
                    isSubmitted={isSubmitted}
                    canSubmit={canSubmit}
                    waitingForCountdown={waitingForCountdown}
                    countdownValue={isMatchingQuestion ? countdownDisplay : null}
                    correctOptionIds={showCorrectAnswer && reveal ? reveal.correctOptionIds : undefined}
                    correctAnswerText={showCorrectAnswer ? correctAnswerText : undefined}
                    onSelectSingle={(optionId) => setSelectedOptionIds([optionId])}
                    onToggleMultiple={(optionId, checked) => {
                      if (checked) setSelectedOptionIds((prev) => [...prev, optionId]);
                      else setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
                    }}
                    onFillTextChange={setFillText}
                    onSubmit={submitAnswer}
                  />
                </Box>
              </Box>
            )}

            {resultPopupVisible && latestAnswerResult && (
              <Box
                sx={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1000,
                  animation: "popup-fade 0.3s ease-out"
                }}
              >
                <ResultView isCorrect={latestAnswerResult.isCorrect} />
                <style>
                  {`
                    @keyframes popup-fade {
                      from { opacity: 0; transform: translate(-50%, -40%); }
                      to { opacity: 1; transform: translate(-50%, -50%); }
                    }
                  `}
                </style>
              </Box>
            )}
          </Box>

          <Snackbar open={toastOpen && !!error} autoHideDuration={3500} onClose={() => setToastOpen(false)} message={error} />
        </Box>
      </Box>
      {debugEnabled && (
        <Box
          sx={{
            position: "fixed",
            left: 8,
            bottom: 8,
            zIndex: 9999,
            maxWidth: "min(90vw, 860px)",
            bgcolor: "rgba(15,23,42,0.78)",
            color: "#E2E8F0",
            px: 1.2,
            py: 0.9,
            borderRadius: 1.5,
            fontSize: "11px",
            lineHeight: 1.35,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}
        >
          {`CONTESTANT BG DEBUG
state=${bgLoadState}
contestantBackgroundUrl=${String(contestantBackgroundUrl ?? "")}
backgroundUrl=${String(backgroundUrl ?? "")}
fallback=${String(contestantBackgroundFallback ?? "")}
resolved=${String(contestantBackgroundImage ?? "")}`}
        </Box>
      )}
    </ThemeProvider>
  );
};
