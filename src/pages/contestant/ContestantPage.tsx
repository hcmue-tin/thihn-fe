import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardContent, Snackbar, Stack, TextField, Typography } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { api } from "../../api";
import { useRealtime } from "../../hooks/useRealtime";
import { QuestionForm } from "../../components/contestant/QuestionForm";
import { ResultView } from "../../components/contestant/ResultView";
import { lightTheme } from "../../theme";
import bgImage from "../../assets/Contexts.png";

type ContestantIdentity = {
  id: number;
  code: string;
  name: string;
  unit?: string | null;
  totalScore: number;
};

export const ContestantPage = () => {
  const {
    screen,
    question,
    options,
    countdownEndsAt,
    countdownSeconds,
    latestAnswerResult,
    connectSocket,
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

  useEffect(() => {
    if (token) {
      connectSocket({ token, role: "contestant" });
    }
  }, [token, connectSocket]);

  useEffect(() => {
    if (!question) {
      return;
    }
    setSelectedOptionIds([]);
    setFillText("");
    setIsSubmitted(false);
    setLocked(false);
  }, [question?.id]);

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
      setToastOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (): Promise<void> => {
    if (!question || locked || isSubmitted) return;
    setIsLoading(true);
    const payload =
      question.type === "fill_blank"
        ? { questionId: question.id, fillText }
        : { questionId: question.id, selectedOptionIds };
    const ack = await emitWithAck("contestant:submit-answer", payload);
    setIsLoading(false);
    if (!ack.success) {
      setError(ack.message || "Submit failed");
      setToastOpen(true);
      return;
    }
    setIsSubmitted(true);
    setLocked(true);
  };

  if (!token || !identity) {
    return (
      <ThemeProvider theme={lightTheme}>
        <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2, backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
          <Card sx={{ width: "100%", maxWidth: 380, backgroundColor: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", boxShadow: 24, border: "1px solid rgba(255,255,255,0.4)" }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 800, textAlign: "center", color: "#004282" }}>
                Đăng nhập thí sinh
              </Typography>
              <Stack spacing={2.5}>
                <TextField label="Mã thí sinh" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
                <TextField
                  label="Mật khẩu"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button variant="contained" size="large" onClick={handleLogin} disabled={isLoading || !code || !password} sx={{ mt: 2, fontWeight: 'bold' }}>
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
  const showQuestion = (screen === "question" || screen === "countdown") && question;
  const showResult = screen === "reveal" && latestAnswerResult;
  const waitingForCountdown = screen === "question";
  const canSubmit = screen === "countdown" && !!countdownEndsAt && remainingMs > 0 && !isSubmitted;

  return (
    <ThemeProvider theme={lightTheme}>
      <Box sx={{ minHeight: "100vh", p: 2, pt: { xs: 16, sm: 20, md: 24 }, backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        <Box sx={{ maxWidth: 720, mx: "auto", backgroundColor: "rgba(255, 255, 255, 0.95)", borderRadius: 3, p: 3, backdropFilter: "blur(10px)", boxShadow: 24, border: "1px solid rgba(255,255,255,0.4)" }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: "#004282", textTransform: "uppercase", textAlign: "center", mb: 0.5 }}>
            {identity.name} ({identity.code})
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, fontWeight: 700, color: "#ed6c02", textAlign: "center" }}>
            Tổng điểm: {latestAnswerResult?.totalScore ?? identity.totalScore}
          </Typography>

        {showWaiting && <Alert severity="info" sx={{ mb: 2 }}>Đang chờ quản trị viên bắt đầu...</Alert>}

        {showQuestion && question && (
          <QuestionForm
            question={question}
            options={options}
            selectedOptionIds={selectedOptionIds}
            fillText={fillText}
            progress={progress}
            remainingSeconds={Math.ceil(remainingMs / 1000)}
            locked={locked}
            isLoading={isLoading}
            isSubmitted={isSubmitted}
            canSubmit={canSubmit}
            waitingForCountdown={waitingForCountdown}
            onSelectSingle={(optionId) => setSelectedOptionIds([optionId])}
            onToggleMultiple={(optionId, checked) => {
              if (checked) setSelectedOptionIds((prev) => [...prev, optionId]);
              else setSelectedOptionIds((prev) => prev.filter((id) => id !== optionId));
            }}
            onFillTextChange={setFillText}
            onSubmit={submitAnswer}
          />
        )}

        {showResult && latestAnswerResult && (
          <ResultView
            isCorrect={latestAnswerResult.isCorrect}
            scoreEarned={latestAnswerResult.scoreEarned}
            totalScore={latestAnswerResult.totalScore}
          />
        )}

        <Snackbar open={toastOpen && !!error} autoHideDuration={3500} onClose={() => setToastOpen(false)} message={error} />
        </Box>
      </Box>
    </ThemeProvider>
  );
};
