import { Box, Chip, CircularProgress, Fade, Paper, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "../../api";
import ledBackground from "../../assets/Led.png";
import { useRealtime } from "../../hooks/useRealtime";
import type { ContestScreen } from "../../types/realtime";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(212, 167, 65, 0.4); }
  70% { box-shadow: 0 0 0 30px rgba(212, 167, 65, 0); }
  100% { box-shadow: 0 0 0 0 rgba(212, 167, 65, 0); }
`;

const flash = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.02); filter: brightness(1.08); }
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const correctBlink = keyframes`
  0%, 100% { background: rgba(21,128,61,0.05); border-color: rgba(21,128,61,0.3); }
  50% { background: rgba(21,128,61,0.25); border-color: rgba(21,128,61,0.8); box-shadow: 0 0 16px rgba(21,128,61,0.4); transform: scale(1.02); }
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
  background: "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(247,251,255,0.72) 100%)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(26,140,142,0.15)",
  boxShadow: "0 16px 48px rgba(26,140,142,0.1)",
  borderRadius: 20,
  color: "#1A3A4A"
});

const OptionCard = styled(GlassCard, {
  shouldForwardProp: (prop) => prop !== "highlighted"
})<{ highlighted?: boolean }>(({ highlighted }) => ({
  padding: 20,
  animation: highlighted ? `${flash} 900ms ease-in-out 2` : "none",
  borderColor: highlighted ? "#D4A741" : "rgba(184,217,236,0.3)",
  border: highlighted ? "2px solid #D4A741" : "1px solid rgba(184,217,236,0.3)",
  background: highlighted
    ? "linear-gradient(135deg, rgba(212,167,65,0.2) 0%, rgba(245,217,138,0.4) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(247,251,255,0.72) 100%)"
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
  const {
    screen,
    question,
    options,
    countdownEndsAt,
    countdownSeconds,
    rulesContent,
    reveal,
    teamList,
    teamScore,
    leaderboard,
    answerResults,
    isConnected,
    connectSocket
  } =
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
    if (reveal.fillBlankAnswers.length > 0) {
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
            label={isConnected ? "Đã kết nối" : "Mất kết nối"}
            color={isConnected ? "success" : "error"}
            sx={{
              fontWeight: 800,
              bgcolor: "rgba(255,255,255,0.88)",
              color: isConnected ? "#15803D" : "#DC2626",
              border: isConnected ? "1px solid rgba(21,128,61,0.2)" : "1px solid rgba(220,38,38,0.2)",
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
              color: "#0F6B6D",
              lineHeight: 1.1,
              textShadow: "0 4px 16px rgba(26,140,142,0.15)"
            }}
          >
            HỆ THỐNG THI HÁN NGỮ
          </Typography>
          <Typography
            component="div"
            sx={{
              mt: { xs: 0.75, md: 1.25 },
              fontSize: { xs: "1.2rem", sm: "1.4rem", md: "1.85rem" },
              color: "#1A8C8E",
              letterSpacing: 1,
              fontWeight: 800
            }}
          >
            {screenTitle[screen]}
          </Typography>
        </Box>

        {(screen === "question" || screen === "countdown" || screen === "reveal") && (
          <Box sx={{ width: "100%", maxWidth: { xs: "100%", lg: 1536 }, mx: "auto", display: "flex", flexDirection: { xs: "column", lg: "row" }, gap: { xs: 2, lg: 3 }, alignItems: "flex-start" }}>
            {/* Cột trái: Kết quả từng thí sinh */}
            {screen === "reveal" && answerResults && (
              <Fade in timeout={420}>
                <GlassCard
                  sx={{
                    width: { lg: "40%", xl: "35%" },
                    flexShrink: 0,
                    p: { xs: 1.75, md: 2.5 },
                    borderRadius: { xs: 3, md: 4 }
                  }}
                >
                  <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: { xs: "1.05rem", md: "1.25rem" } }}>
                    Kết quả thí sinh
                  </Typography>
                  <Box sx={{ mt: 1.75, display: "grid", gap: 1 }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1.4fr 1fr 0.8fr 0.6fr", md: "1.6fr 1.2fr 0.8fr 0.6fr" },
                        gap: 1,
                        px: 1.5,
                        color: "#4b647c",
                        fontWeight: 800,
                        fontSize: { xs: "0.82rem", md: "0.92rem" }
                      }}
                    >
                      <Box>Thí sinh</Box>
                      <Box>Đội</Box>
                      <Box>Kết quả</Box>
                      <Box>Điểm</Box>
                    </Box>
                    {answerResults.results.slice(0, 10).map((row) => (
                      <Box
                        key={`${row.contestantId}-${row.teamName}`}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1.4fr 1fr 0.8fr 0.6fr", md: "1.6fr 1.2fr 0.8fr 0.6fr" },
                          gap: 1,
                          alignItems: "center",
                          p: 1.5,
                          borderRadius: 2.5,
                          background: "rgba(255,255,255,0.56)",
                          border: "1px solid rgba(111, 165, 207, 0.18)",
                          ...(row.isCorrect && {
                            animation: `${correctBlink} 1.5s infinite ease-in-out`
                          })
                        }}
                      >
                        <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.contestantName}
                        </Typography>
                        <Typography component="div" sx={{ color: "#4b647c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.teamName}
                        </Typography>
                        <Typography component="div" sx={{ fontWeight: 900, color: row.isCorrect ? "#15803d" : "#b91c1c" }}>
                          {row.isCorrect ? "✅ Đúng" : "❌ Sai"}
                        </Typography>
                        <Typography component="div" sx={{ fontWeight: 800, color: "#17324d" }}>
                          {row.scoreEarned}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </GlassCard>
              </Fade>
            )}

            {/* Cột phải: Câu hỏi, tuỳ chọn, banner đáp án */}
            <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: { xs: 1.5, md: 2 } }}>
              {question && (
                <Fade in timeout={450}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 1.25, md: 2 } }}>
                    <GlassCard sx={{ p: { xs: 1.75, sm: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#1A3A4A",
                          textAlign: "center",
                          fontSize: { xs: "1.6rem", sm: "1.9rem", md: "2.4rem" },
                          lineHeight: 1.2
                        }}
                      >
                        {question.content}
                      </Typography>
                      {question.imageUrl && (
                        <Box
                          component="img"
                          key={`${question.id}-${question.imageUrl}`}
                          src={resolveMediaUrl(question.imageUrl)}
                          alt="Hình minh họa câu hỏi"
                          sx={{
                            mt: 2.5,
                            display: "block",
                            mx: "auto",
                            maxWidth: "100%",
                            maxHeight: 400,
                            borderRadius: 3,
                            objectFit: "contain",
                            boxShadow: "0 18px 36px rgba(15, 23, 42, 0.16)"
                          }}
                          onError={(event) => {
                            const target = event.currentTarget;
                            target.style.display = "none";
                          }}
                        />
                      )}
                      {question.audioUrl && (
                        <Box
                          component="audio"
                          key={`${question.id}-${question.audioUrl}`}
                          controls
                          autoPlay
                          src={resolveMediaUrl(question.audioUrl)}
                          sx={{ mt: 2.5, width: "100%" }}
                        />
                      )}
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
                      sx={{ color: "#D4A741", filter: "drop-shadow(0 12px 32px rgba(212,167,65,0.22))" }}
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
                      <Typography component="div" sx={{ fontWeight: 900, color: "#1A3A4A", fontSize: { xs: "2.4rem", sm: "3rem", md: "3.75rem" } }}>
                        {remainingSeconds}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {screen === "reveal" && reveal && (
                <Fade in timeout={500}>
                  <GlassCard sx={{ p: { xs: 1.75, sm: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
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
            </Box>
          </Box>
        )}

        {screen === "rules" && (
          <GlassCard sx={{ width: "100%", maxWidth: { xs: "100%", md: 1080 }, mx: "auto", p: { xs: 2, md: 4 }, borderRadius: { xs: 3, md: 4 } }}>
            <Typography component="div" sx={{ fontWeight: 900, textAlign: "center", color: "#0F6B6D", fontSize: { xs: "1.4rem", md: "2rem" } }}>
              Thể lệ cuộc thi
            </Typography>
            <Typography
              component="div"
              sx={{
                mt: 2.5,
                whiteSpace: "pre-wrap",
                textAlign: "left",
                color: "#1A3A4A",
                fontSize: { xs: "1rem", md: "1.2rem" },
                lineHeight: 1.8
              }}
            >
              {rulesContent?.trim() || "Chưa cấu hình thể lệ cuộc thi"}
            </Typography>
          </GlassCard>
        )}

        {screen === "team_list" && teamList && (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 1240 },
              mx: "auto",
              display: "grid",
              gap: { xs: 1.5, md: 2 },
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }
            }}
          >
            {teamList.teams.map((team) => (
              <GlassCard key={team.id} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: { xs: "1.15rem", md: "1.5rem" } }}>
                  {team.name}
                </Typography>
                <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
                  {team.contestants.length > 0 ? (
                    team.contestants.map((contestant) => (
                      <Box key={contestant.id} sx={{ p: 1.5, borderRadius: 2.5, background: "rgba(255,255,255,0.52)", border: "1px solid rgba(111, 165, 207, 0.18)" }}>
                        <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.1rem" } }}>
                          {contestant.name}
                        </Typography>
                        <Typography component="div" sx={{ mt: 0.35, color: "#4b647c", fontSize: { xs: "0.92rem", md: "1rem" } }}>
                          {contestant.unit || contestant.code}
                        </Typography>
                      </Box>
                    ))
                  ) : (
                    <Typography component="div" sx={{ color: "#4b647c" }}>
                      Chưa có thí sinh trong đội này
                    </Typography>
                  )}
                </Box>
              </GlassCard>
            ))}
          </Box>
        )}

        {screen === "team_score" && teamScore && (
          <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1080 }, mx: "auto", display: "flex", flexDirection: "column", gap: { xs: 1, md: 1.5 } }}>
            {teamScore.teams.map((team) => (
              <GlassCard key={team.name} sx={{ p: { xs: 1.5, md: 2.2 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.25rem" } }}>
                  {team.name} - {team.totalScore} điểm
                </Typography>
                {team.contestants && team.contestants.length > 0 && (
                  <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
                    {team.contestants.map((contestant) => (
                      <Box
                        key={`${team.name}-${contestant.contestantId ?? contestant.name}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 1,
                          p: 1.25,
                          borderRadius: 2.5,
                          background: "rgba(255,255,255,0.52)",
                          border: "1px solid rgba(111, 165, 207, 0.18)"
                        }}
                      >
                        <Typography component="div" sx={{ fontWeight: 700, color: "#17324d" }}>
                          {contestant.name}
                        </Typography>
                        <Typography component="div" sx={{ fontWeight: 800, color: "#11416f" }}>
                          {contestant.score} điểm
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </GlassCard>
            ))}
          </Box>
        )}

        {screen === "leaderboard" && leaderboard && (
          <Box sx={{ width: "100%", maxWidth: { xs: "100%", md: 1080 }, mx: "auto", display: "flex", flexDirection: "column", gap: { xs: 1, md: 1.5 } }}>
            {leaderboard.rankings.map((item) => (
              <GlassCard
                key={`${item.rank}-${item.name}`}
                sx={{
                  p: { xs: 1.5, md: 2.2 },
                  borderRadius: { xs: 3, md: 4 },
                  border: item.rank === 1 ? "2px solid #D4A741" : item.rank === 2 ? "2px solid #94A3B8" : item.rank === 3 ? "2px solid #B45309" : undefined,
                  background: item.rank === 1 ? "linear-gradient(135deg, rgba(245,217,138,0.2), rgba(255,255,255,0.88))" : undefined
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                      flexShrink: 0,
                      color: "#FFFFFF",
                      background:
                        item.rank === 1 ? "linear-gradient(135deg, #D4A741, #F5D98A)" :
                        item.rank === 2 ? "linear-gradient(135deg, #94A3B8, #CBD5E1)" :
                        item.rank === 3 ? "linear-gradient(135deg, #B45309, #D97706)" :
                        "linear-gradient(135deg, #1A8C8E, #0F6B6D)"
                    }}
                  >
                    {item.rank}
                  </Box>
                  <Box>
                    <Typography
                      component="div"
                      sx={{
                        fontWeight: 800,
                        color: "#1A3A4A",
                        fontSize: { xs: "1rem", md: "1.25rem" }
                      }}
                    >
                      {item.name} - {item.totalScore} điểm
                    </Typography>
                    <Typography component="div" sx={{ mt: 0.25, color: "#4A7A8A", fontSize: { xs: "0.92rem", md: "1rem" } }}>
                      Đội: {item.team || "Chưa có đội"}
                    </Typography>
                  </Box>
                </Box>
              </GlassCard>
            ))}
          </Box>
        )}
      </Box>
    </ScreenRoot>
  );
};
