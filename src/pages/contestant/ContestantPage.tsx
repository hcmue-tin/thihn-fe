import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { api, getBackendBaseUrl, resolveMediaUrl } from "../../api";
import { clearAllSessions } from "../../auth/session";
import { useRealtime } from "../../hooks/useRealtime";
import { QuestionForm } from "../../components/contestant/QuestionForm";
import { ResultView } from "../../components/contestant/ResultView";
import { lightTheme } from "../../theme";

type ContestantIdentity = {
  id: number;
  teamId?: number | null;
  code: string;
  name: string;
  unit?: string | null;
  totalScore: number;
};

const DESKTOP_FRAME_MAX_WIDTH = 1440;

export const ContestantPage = () => {
  const {
    socket,
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
  const [identity, setIdentity] = useState<ContestantIdentity | null>(() => {
    const raw = localStorage.getItem("contestantProfile");
    return raw ? (JSON.parse(raw) as ContestantIdentity) : null;
  });
  const [error, setError] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [fillText, setFillText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [contestantBackgroundFallback, setContestantBackgroundFallback] = useState<string | null>(null);
  const [bgLoadState, setBgLoadState] = useState<"idle" | "loaded" | "error">("idle");
  const autoSubmitTriggeredRef = useRef(false);
  const passwordInputProps = {
    autoCapitalize: "none" as const,
    autoCorrect: "off" as const,
    spellCheck: false,
    inputMode: "text" as const,
    style: { imeMode: "disabled" as never }
  };

  useEffect(() => {
    if (token) {
      connectSocket({ token, role: "contestant" });
    }
  }, [token, connectSocket]);
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
    const onAnswerReceived = (payload: { questionId: number }) => {
      if (payload.questionId !== question.id) return;
      setIsSubmitted(true);
      setLocked(true);
    };
    socket.on("contestant:answer-received", onAnswerReceived);
    return () => {
      socket.off("contestant:answer-received", onAnswerReceived);
    };
  }, [socket, question]);

  useEffect(() => {
    if (!question) {
      return;
    }
    setSelectedOptionIds([]);
    setFillText("");
    setIsSubmitted(false);
    setLocked(false);
    autoSubmitTriggeredRef.current = false;
  }, [question?.id, questionShowSeq]);

  useEffect(() => {
    if (!countdownEndsAt) {
      setRemainingMs(0);
      return;
    }
    let raf = 0;
    const render = () => {
      setRemainingMs(Math.max(0, countdownEndsAt - Date.now()));
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [countdownEndsAt]);

  const progress = useMemo(() => {
    if (!countdownSeconds) return 0;
    return Math.min(100, Math.max(0, (remainingMs / (countdownSeconds * 1000)) * 100));
  }, [remainingMs, countdownSeconds]);

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
    const ack = await emitWithAck("contestant:submit-answer", payload);
    setIsLoading(false);
    if (!ack.success) {
      if (ack.message === "Submission is not allowed now") {
        return;
      }
      setError(ack.message || "Submit failed");
      setToastOpen(true);
      return;
    }
    setIsSubmitted(true);
    setLocked(true);
  };

  const hasPendingSelection = selectedOptionIds.length > 0 || fillText.trim().length > 0;

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

  if (!token || !identity) {
    return (
      <ThemeProvider theme={lightTheme}>
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: { xs: 1.5, sm: 2 }, backgroundColor: "#EAF3F8" }}>
          <Card sx={{ width: "100%", maxWidth: 400, backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(26,140,142,0.15)", borderRadius: { xs: 3, sm: 5 } }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 900, textAlign: "center", color: "#0F6B6D" }}>
                Đăng nhập thí sinh
              </Typography>
              <Stack spacing={2.5}>
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
                <Button variant="contained" size="large" onClick={handleLogin} disabled={isLoading || !code || !password} sx={{ mt: 2, fontWeight: "bold", minHeight: { xs: 44, sm: 48 }, borderRadius: 3, background: "linear-gradient(135deg, #1A8C8E, #0F6B6D)", "&:hover": { background: "linear-gradient(135deg, #0F6B6D, #0A5557)" } }}>
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
  const showCorrectAnswer = !shouldBlockInteraction && screen === "reveal" && ledSolutionVisible && question && reveal;
  const waitingForCountdown = screen === "question";
  const canSubmit = !shouldBlockInteraction && screen === "countdown" && !!countdownEndsAt && remainingMs > 0 && !isSubmitted;
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
  return (
    <ThemeProvider theme={lightTheme}>
      {/* Nền cố định (fixed) toàn màn hình */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
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
                objectFit: "fill",
                objectPosition: "center",
                opacity: 0.3,
                filter: "blur(14px) saturate(0.95)",
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
                objectFit: "fill",
                objectPosition: "center",
                opacity: 1
              }}
            />
          </>
        )}
      </Box>
      <Box
        sx={{
          minHeight: "100vh",
          position: "relative",
          zIndex: 1,
          px: { xs: 2, sm: 3, md: 4 },
          pb: { xs: 4, sm: 6, md: 8 },
          pt: { xs: "16vh", sm: "17vh", md: "18vh", lg: "19vh" }
        }}
      >
        <Box sx={{ width: "100%", maxWidth: DESKTOP_FRAME_MAX_WIDTH, mx: "auto", position: "relative", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.92)", borderRadius: { xs: 3, sm: 5 }, p: { xs: 2, sm: 3, md: 4 }, backdropFilter: "blur(16px)", border: "1px solid rgba(26,140,142,0.15)", boxShadow: "0 16px 48px rgba(26,140,142,0.1)" }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0F6B6D", textTransform: "uppercase", textAlign: "center", flex: 1, minWidth: 0, fontSize: { xs: "1rem", sm: "1.25rem" }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: { xs: "normal", sm: "nowrap" }, overflowWrap: "anywhere" }}>
              {identity.name} ({identity.code})
            </Typography>
            <Button size="small" variant="outlined" color="inherit" onClick={handleLogout} sx={{ fontWeight: 700, flexShrink: 0 }}>
              Đăng xuất
            </Button>
          </Box>
          {identity.unit && (
            <Typography variant="body2" sx={{ textAlign: "center", color: "#4A7A8A", mb: 0.5 }}>
              {identity.unit}
            </Typography>
          )}
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
            <Box sx={{ px: { xs: 2, sm: 3 }, py: 0.75, borderRadius: 50, background: "linear-gradient(135deg, #D4A741, #F5D98A)", color: "#FFFFFF", fontWeight: 800, fontSize: { xs: "0.9rem", sm: "1rem" }, boxShadow: "0 4px 16px rgba(212,167,65,0.3)" }}>
              Tổng điểm: {latestAnswerResult?.totalScore ?? 0}
            </Box>
          </Box>

        {shouldBlockInteraction && (
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
            {isTeamNotSelected ? "Chưa có đội nào được chọn. Vui lòng chờ đến lượt đội của bạn." : "Bạn không thuộc đội đang thi. Vui lòng chờ đến lượt đội của bạn."}
          </Alert>
        )}
        {!shouldBlockInteraction && showWaiting && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 3 }}>
            {showRules ? "Đang hiển thị thể lệ cuộc thi" : "Đang chờ quản trị viên bắt đầu..."}
          </Alert>
        )}
        {showRules && (
          <Card sx={{ mb: 2, borderRadius: 3, border: "1px solid rgba(26,140,142,0.15)" }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "#0F6B6D", mb: 1 }}>
                Thể lệ cuộc thi
              </Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#1A3A4A" }}>
                {rulesContent?.trim() || "Chưa cấu hình thể lệ cuộc thi"}
              </Typography>
            </CardContent>
          </Card>
        )}

        {showQuestion && question && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 220px" },
              gap: { xs: 2, md: 3 },
              alignItems: "stretch"
            }}
          >
            <Box
              sx={{
                minWidth: 0,
                p: { xs: 1.25, sm: 1.75, md: 2.2 },
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(26,140,142,0.16)",
                boxShadow: "0 10px 28px rgba(23,50,77,0.08)"
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
                countdownValue={null}
                onSelectSingle={(optionId) => setSelectedOptionIds([optionId])}
                onToggleMultiple={(optionId, checked) => {
                  if (checked) setSelectedOptionIds((prev) => [...prev, optionId]);
                  else setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
                }}
                onFillTextChange={setFillText}
                onSubmit={submitAnswer}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                minHeight: { xs: 132, sm: 156, lg: "100%" }
              }}
            >
              <Box
                sx={{
                  width: { xs: 112, sm: 126, md: 146 },
                  height: { xs: 112, sm: 126, md: 146 },
                  borderRadius: "50%",
                  border: "2px solid rgba(15,107,109,0.28)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                  boxShadow: "0 12px 28px rgba(15,107,109,0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#17324d", lineHeight: 1, fontSize: { xs: "2.2rem", sm: "2.8rem", md: "3.4rem" } }}>
                  {screen === "countdown" ? Math.ceil(remainingMs / 1000) : "—"}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {showResult && latestAnswerResult && (
          <ResultView
            isCorrect={latestAnswerResult.isCorrect}
          />
        )}
        {showCorrectAnswer && (
          <Card
            sx={{
              mt: 2,
              borderRadius: 3,
              border: "2px solid rgba(212,167,65,0.55)",
              background: "linear-gradient(135deg, rgba(212,167,65,0.12), rgba(255,255,255,0.92))"
            }}
          >
            <CardContent>
              <Typography sx={{ fontWeight: 900, color: "#8A5A00", mb: 0.75 }}>
                Đáp án đúng
              </Typography>
              <Typography sx={{ color: "#17324d", fontWeight: 700, overflowWrap: "anywhere" }}>
                {correctAnswerText || "Đang cập nhật đáp án"}
              </Typography>
            </CardContent>
          </Card>
        )}

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
