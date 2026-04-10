import { keyframes, styled } from "@mui/material/styles";
import { Box, Chip, CircularProgress, Fade, Paper, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useRealtime } from "../../hooks/useRealtime";
import type { ContestScreen } from "../../types/realtime";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(212,175,55,0.6); }
  70% { box-shadow: 0 0 0 30px rgba(212,175,55,0); }
  100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); }
`;

const flash = keyframes`
  0%,100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.04); filter: brightness(1.2); }
`;

const ScreenRoot = styled(Box)({
  minHeight: "100vh",
  width: "100%",
  color: "#fff",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at 20% 20%, rgba(198,40,40,0.35), transparent 40%), radial-gradient(circle at 80% 10%, rgba(212,175,55,0.2), transparent 35%), linear-gradient(135deg, #0b0b10 0%, #141421 45%, #190f14 100%)"
});

const GlassCard = styled(Paper)({
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.16)",
  borderRadius: 20,
  transition: "all 350ms ease"
});

const OptionCard = styled(GlassCard)<{ highlighted?: boolean }>(({ highlighted }) => ({
  padding: 20,
  animation: highlighted ? `${flash} 900ms ease-in-out 2` : "none",
  borderColor: highlighted ? "rgba(212,175,55,0.9)" : "rgba(255,255,255,0.16)",
  background: highlighted ? "rgba(212,175,55,0.16)" : "rgba(255,255,255,0.08)"
}));

const screenTitle: Record<ContestScreen, string> = {
  idle: "Chờ Khởi Động Cuộc Thi",
  waiting: "Chuẩn Bị Cuộc Thi",
  rules: "Thể Lệ Cuộc Thi",
  team_list: "Danh Sách Đội Thi",
  question: "Câu Hỏi Đang Hiển Thị",
  countdown: "Đếm Ngược",
  reveal: "Công Bố Đáp Án",
  team_score: "Bảng Điểm Theo Bộ Đề",
  leaderboard: "Bảng Xếp Hạng Chung Cuộc"
};

export const LedScreenPage = () => {
  const { screen, question, options, countdownEndsAt, countdownSeconds, reveal, teamScore, leaderboard, isConnected, connectSocket } =
    useRealtime();
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
    if (token) {
      connectSocket({ token, role: "led" });
    }
  }, [connectSocket]);

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

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progress = useMemo(() => {
    if (!countdownSeconds) return 0;
    const pct = (remainingMs / (countdownSeconds * 1000)) * 100;
    return Math.min(100, Math.max(0, pct));
  }, [countdownSeconds, remainingMs]);

  const revealDetailText = useMemo(() => {
    if (!question || !reveal) return [];

    if (question.type === "ordering") {
      const answer = reveal.fillBlankAnswers[0] || "";
      const normalized = answer.replace(/\s+/g, "").toUpperCase();
      const labelToContent = new Map(options.map((o) => [o.label.toUpperCase(), o.content]));
      const ordered = normalized
        .split("")
        .map((label, idx) => {
          const content = labelToContent.get(label);
          return content ? `${idx + 1}. ${label} - ${content}` : `${idx + 1}. ${label}`;
        })
        .filter(Boolean);
      return [`Thứ tự đúng: ${normalized}`, ...ordered];
    }

    if (question.type === "matching") {
      const answer = reveal.fillBlankAnswers[0] || "";
      const pairs = answer
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/\./g, ":"));
      return pairs.length > 0 ? ["Ghép đúng:", ...pairs.map((p) => `- ${p}`)] : ["Ghép đúng: (không có dữ liệu)"];
    }

    if (question.type === "fill_blank") {
      return reveal.fillBlankAnswers.length > 0
        ? ["Đáp án chấp nhận:", ...reveal.fillBlankAnswers.map((ans) => `- ${ans}`)]
        : ["Đáp án chấp nhận: (không có dữ liệu)"];
    }

    return [];
  }, [question, reveal, options]);

  return (
    <ScreenRoot>
      <Box sx={{ p: 4, height: "100vh", display: "flex", flexDirection: "column", gap: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="div" variant="h3" sx={{ fontWeight: 800 }}>
            HỆ THỐNG THI HÁN NGỮ
          </Typography>
          <Chip
            label={isConnected ? "Đã kết nối realtime" : "Mất kết nối"}
            color={isConnected ? "success" : "error"}
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <Typography component="div" variant="h5" sx={{ color: "secondary.main", letterSpacing: 1 }}>
          {screenTitle[screen]}
        </Typography>

        {(screen === "question" || screen === "countdown" || screen === "reveal") && question && (
          <Fade in timeout={450}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <GlassCard sx={{ p: 3 }}>
                <Typography component="div" variant="h4" sx={{ fontWeight: 700 }}>
                  {question.content}
                </Typography>
              </GlassCard>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {options.map((opt) => (
                  <OptionCard key={opt.id} highlighted={screen === "reveal" && reveal?.correctOptionIds.includes(opt.id)}>
                    <Typography component="div" variant="h5" sx={{ fontWeight: 700 }}>
                      {opt.label}. {opt.content}
                    </Typography>
                  </OptionCard>
                ))}
              </Box>
            </Box>
          </Fade>
        )}

        {screen === "countdown" && (
          <Box sx={{ mt: 2, animation: `${pulse} 2.4s infinite`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <CircularProgress variant="determinate" value={progress} size={220} thickness={3.2} color="secondary" />
              <Box
                sx={{
                  top: 0,
                  left: 0,
                  bottom: 0,
                  right: 0,
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Typography component="div" variant="h2" sx={{ fontWeight: 900 }}>
                  {remainingSeconds}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {screen === "reveal" && reveal && (
          <Fade in timeout={500}>
            <GlassCard sx={{ p: 3 }}>
              <Typography component="div" variant="h5" color="secondary.main" sx={{ fontWeight: 800 }}>
                Đáp án đã được công bố
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                Số bài đúng: {reveal.stats.correct ?? 0}/{reveal.stats.total ?? 0} ({reveal.stats.correctRate ?? 0}%)
              </Typography>
              {revealDetailText.length > 0 && (
                <Box sx={{ mt: 2, p: 2, borderRadius: 2, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)" }}>
                  <Typography component="div" variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                    Đáp án chi tiết
                  </Typography>
                  {revealDetailText.map((line) => (
                    <Typography key={line} variant="body1" sx={{ opacity: 0.95 }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {screen === "team_score" && teamScore && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {teamScore.teams.map((team) => (
              <GlassCard key={team.name} sx={{ p: 2.2 }}>
                <Typography component="div" variant="h6" sx={{ fontWeight: 700 }}>
                  {team.name} - {team.totalScore} điểm
                </Typography>
              </GlassCard>
            ))}
          </Box>
        )}

        {screen === "leaderboard" && leaderboard && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {leaderboard.rankings.map((item) => (
              <GlassCard key={`${item.rank}-${item.name}`} sx={{ p: 2.2 }}>
                <Typography component="div" variant="h6" sx={{ fontWeight: 700 }}>
                  #{item.rank} {item.name} ({item.team}) - {item.totalScore} điểm
                </Typography>
              </GlassCard>
            ))}
          </Box>
        )}
      </Box>
    </ScreenRoot>
  );
};
