import { Box, Chip, CircularProgress, Fade, Paper, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import ledBackground from "../../assets/Led.png";
import { useRealtime } from "../../hooks/useRealtime";
import type { ContestScreen } from "../../types/realtime";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(245, 170, 28, 0.45); }
  70% { box-shadow: 0 0 0 30px rgba(245, 170, 28, 0); }
  100% { box-shadow: 0 0 0 0 rgba(245, 170, 28, 0); }
`;

const flash = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.02); filter: brightness(1.08); }
`;

const ScreenRoot = styled(Box)({
  minHeight: "100svh",
  width: "100vw",
  position: "relative",
  overflow: "hidden",
  color: "#17324d",
  marginLeft: "calc(50% - 50vw)",
  backgroundImage: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.08) 100%), url(${ledBackground})`,
  backgroundSize: "cover",
  backgroundPosition: "center top",
  backgroundRepeat: "no-repeat"
});

const GlassCard = styled(Paper)({
  background: "linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(247,251,255,0.64) 100%)",
  backdropFilter: "blur(14px)",
  border: "1px solid rgba(111, 165, 207, 0.2)",
  boxShadow: "0 22px 50px rgba(93, 142, 176, 0.14)",
  borderRadius: 24,
  color: "#17324d"
});

const OptionCard = styled(GlassCard, {
  shouldForwardProp: (prop) => prop !== "highlighted"
})<{ highlighted?: boolean }>(({ highlighted }) => ({
  padding: 20,
  animation: highlighted ? `${flash} 900ms ease-in-out 2` : "none",
  borderColor: highlighted ? "rgba(255, 177, 40, 0.85)" : "rgba(111, 165, 207, 0.2)",
  background: highlighted
    ? "linear-gradient(135deg, rgba(255,193,71,0.34) 0%, rgba(255,250,234,0.84) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(247,251,255,0.64) 100%)"
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
      const labelToContent = new Map(options.map((option) => [option.label.toUpperCase(), option.content]));
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

      return pairs.length > 0 ? ["Ghép đúng:", ...pairs.map((pair) => `- ${pair}`)] : ["Ghép đúng: (không có dữ liệu)"];
    }

    if (question.type === "fill_blank") {
      return reveal.fillBlankAnswers.length > 0
        ? ["Đáp án chấp nhận:", ...reveal.fillBlankAnswers.map((answer) => `- ${answer}`)]
        : ["Đáp án chấp nhận: (không có dữ liệu)"];
    }

    return [];
  }, [options, question, reveal]);

  return (
    <ScreenRoot>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 38%, rgba(255,255,255,0.06) 100%)",
          pointerEvents: "none"
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100svh",
          px: { xs: 1.5, sm: 2.5, md: 5, lg: 6 },
          pt: { xs: 9, sm: 10, md: 13, lg: 15 },
          pb: { xs: 12, sm: 14, md: 18, lg: 22 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, sm: 2, md: 2.5 }
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Chip
            label={isConnected ? "Đã kết nối realtime" : "Mất kết nối"}
            color={isConnected ? "success" : "error"}
            sx={{
              fontWeight: 800,
              bgcolor: "rgba(255,255,255,0.82)",
              color: "#17324d",
              border: "1px solid rgba(111, 165, 207, 0.2)",
              backdropFilter: "blur(8px)"
            }}
          />
        </Box>

        <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1240 }, mx: "auto", textAlign: "center" }}>
          <Typography
            component="div"
            sx={{
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3.25rem", lg: "4rem" },
              fontWeight: 900,
              color: "#10416d",
              lineHeight: 1.1,
              textShadow: "0 8px 24px rgba(255,255,255,0.45)"
            }}
          >
            HỆ THỐNG THI HÁN NGỮ
          </Typography>
          <Typography
            component="div"
            sx={{
              mt: { xs: 0.75, md: 1.25 },
              fontSize: { xs: "1.2rem", sm: "1.4rem", md: "1.85rem" },
              color: "#2182ca",
              letterSpacing: 1,
              fontWeight: 800
            }}
          >
            {screenTitle[screen]}
          </Typography>
        </Box>

        {(screen === "question" || screen === "countdown" || screen === "reveal") && question && (
          <Fade in timeout={450}>
            <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1240 }, mx: "auto", display: "flex", flexDirection: "column", gap: { xs: 1.25, md: 2 } }}>
              <GlassCard sx={{ p: { xs: 1.75, sm: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography
                  component="div"
                  sx={{
                    fontWeight: 800,
                    color: "#17324d",
                    textAlign: "center",
                    fontSize: { xs: "1.6rem", sm: "1.9rem", md: "2.2rem" },
                    lineHeight: 1.2
                  }}
                >
                  {question.content}
                </Typography>
              </GlassCard>

              <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1, sm: 1.2, md: 1.8 } }}>
                {options.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    highlighted={screen === "reveal" && reveal?.correctOptionIds.includes(opt.id)}
                    sx={{ p: { xs: 1.4, sm: 1.7, md: 2.5 }, borderRadius: { xs: 3, md: 4 } }}
                  >
                    <Typography
                      component="div"
                      sx={{
                        fontWeight: 800,
                        color: "#17324d",
                        fontSize: { xs: "1.2rem", sm: "1.45rem", md: "1.9rem" },
                        lineHeight: 1.25,
                        textAlign: "center"
                      }}
                    >
                      {opt.label}. {opt.content}
                    </Typography>
                  </OptionCard>
                ))}
              </Box>
            </Box>
          </Fade>
        )}

        {screen === "countdown" && (
          <Box sx={{ mt: { xs: 0.5, md: 1 }, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Box sx={{ position: "relative", display: "inline-flex", animation: `${pulse} 2.4s infinite` }}>
              <CircularProgress
                variant="determinate"
                value={progress}
                size="clamp(170px, 24vw, 220px)"
                thickness={3.2}
                sx={{ color: "#f5aa1c", filter: "drop-shadow(0 12px 32px rgba(245,170,28,0.26))" }}
              />
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Typography component="div" sx={{ fontWeight: 900, color: "#11416f", fontSize: { xs: "2.4rem", sm: "3rem", md: "3.75rem" } }}>
                  {remainingSeconds}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {screen === "reveal" && reveal && (
          <Fade in timeout={500}>
            <GlassCard sx={{ width: "100%", maxWidth: { xs: "100%", md: 1240 }, mx: "auto", p: { xs: 1.75, sm: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
              <Typography component="div" sx={{ fontWeight: 800, color: "#1f73b7", fontSize: { xs: "1.2rem", sm: "1.35rem", md: "1.6rem" } }}>
                Đáp án đã được công bố
              </Typography>
              <Typography sx={{ mt: 1, color: "#23415f", fontSize: { xs: "0.98rem", md: "1.05rem" } }}>
                Số bài đúng: {reveal.stats.correct ?? 0}/{reveal.stats.total ?? 0} ({reveal.stats.correctRate ?? 0}%)
              </Typography>
              {revealDetailText.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 2,
                    background: "rgba(255,190,58,0.14)",
                    border: "1px solid rgba(255,180,43,0.36)"
                  }}
                >
                  <Typography component="div" sx={{ fontWeight: 800, mb: 1, color: "#11416f", fontSize: { xs: "1rem", md: "1.15rem" } }}>
                    Đáp án chi tiết
                  </Typography>
                  {revealDetailText.map((line) => (
                    <Typography key={line} sx={{ opacity: 0.95, color: "#23415f", fontSize: { xs: "0.95rem", md: "1rem" } }}>
                      {line}
                    </Typography>
                  ))}
                </Box>
              )}
            </GlassCard>
          </Fade>
        )}

        {screen === "team_score" && teamScore && (
          <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1080 }, mx: "auto", display: "flex", flexDirection: "column", gap: { xs: 1, md: 1.5 } }}>
            {teamScore.teams.map((team) => (
              <GlassCard key={team.name} sx={{ p: { xs: 1.5, md: 2.2 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                  {team.name} - {team.totalScore} điểm
                </Typography>
              </GlassCard>
            ))}
          </Box>
        )}

        {screen === "leaderboard" && leaderboard && (
          <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1080 }, mx: "auto", display: "flex", flexDirection: "column", gap: { xs: 1, md: 1.5 } }}>
            {leaderboard.rankings.map((item) => (
              <GlassCard key={`${item.rank}-${item.name}`} sx={{ p: { xs: 1.5, md: 2.2 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.25rem" } }}>
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
