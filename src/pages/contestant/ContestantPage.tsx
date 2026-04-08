import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Radio,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { api } from "../../api";
import { useRealtime } from "../../hooks/useRealtime";

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
    if (screen === "countdown" && !countdownEndsAt) {
      setLocked(true);
    }
  }, [screen, countdownEndsAt]);

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
      setError("Login failed. Please check code/password.");
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
      return;
    }
    setIsSubmitted(true);
    setLocked(true);
  };

  if (!token || !identity) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
        <Card sx={{ width: "100%", maxWidth: 380 }}>
          <CardContent>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
              Contestant Login
            </Typography>
            <Stack spacing={2}>
              <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value)} fullWidth />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button variant="contained" onClick={handleLogin} disabled={isLoading || !code || !password}>
                Login
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const showWaiting = screen === "idle" || screen === "waiting" || screen === "rules" || screen === "team_list";
  const showQuestion = (screen === "question" || screen === "countdown") && question;
  const showResult = screen === "reveal" && latestAnswerResult;

  return (
    <Box sx={{ p: 2, maxWidth: 720, mx: "auto" }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {identity.name} ({identity.code})
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, opacity: 0.85 }}>
        Total score: {latestAnswerResult?.totalScore ?? identity.totalScore}
      </Typography>

      {showWaiting && <Alert severity="info">Waiting for admin to begin...</Alert>}

      {showQuestion && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {question.content}
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 10, mb: 2 }} />
            <Typography variant="body2" sx={{ mb: 2 }}>
              Time left: {Math.ceil(remainingMs / 1000)}s
            </Typography>

            {question.type === "single_choice" &&
              options.map((opt) => (
                <FormControlLabel
                  key={opt.id}
                  control={
                    <Radio
                      checked={selectedOptionIds[0] === opt.id}
                      onChange={() => setSelectedOptionIds([opt.id])}
                      disabled={locked}
                    />
                  }
                  label={`${opt.label}. ${opt.content}`}
                />
              ))}

            {question.type === "multiple_choice" &&
              options.map((opt) => (
                <FormControlLabel
                  key={opt.id}
                  control={
                    <Checkbox
                      checked={selectedOptionIds.includes(opt.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedOptionIds((prev) => [...prev, opt.id]);
                        else setSelectedOptionIds((prev) => prev.filter((id) => id !== opt.id));
                      }}
                      disabled={locked}
                    />
                  }
                  label={`${opt.label}. ${opt.content}`}
                />
              ))}

            {question.type === "fill_blank" && (
              <TextField
                label="Your answer"
                value={fillText}
                onChange={(e) => setFillText(e.target.value)}
                disabled={locked}
                fullWidth
              />
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={submitAnswer} disabled={locked || isLoading}>
                {isSubmitted ? "Submitted" : "Submit"}
              </Button>
              {locked && <Alert severity="success">Submission locked</Alert>}
            </Stack>
          </CardContent>
        </Card>
      )}

      {showResult && (
        <Alert severity={latestAnswerResult.isCorrect ? "success" : "warning"} sx={{ mt: 2 }}>
          {latestAnswerResult.isCorrect ? "Correct answer!" : "Incorrect answer."} +{latestAnswerResult.scoreEarned} points. Total:{" "}
          {latestAnswerResult.totalScore}
        </Alert>
      )}
    </Box>
  );
};
