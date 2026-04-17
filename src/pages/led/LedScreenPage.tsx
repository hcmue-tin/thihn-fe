import { Box, Fade, Paper, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "../../api";
import { QuestionContentWithBlank } from "../../components/contestant/QuestionContentWithBlank";
import { parseMatchingContent } from "../../components/admin/matchingEditorUtils";
import { useCountdownClock } from "../../hooks/realtime/useCountdownClock";
import { useLedAudioSync } from "../../hooks/realtime/useLedAudioSync";
import { useRealtime } from "../../hooks/useRealtime";

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
  marginLeft: "calc(50% - 50vw)"
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

export const LedScreenPage = () => {
  const DESIGN_WIDTH = 1920;
  const DESIGN_HEIGHT = 1080;
  const {
    socket,
    screen,
    question,
    options,
    countdownEndsAt,
    countdownSeconds,
    rulesContent,
    backgroundUrl,
    ledBackgroundUrl,
    reveal,
    ledSolutionVisible,
    teamList,
    teamScore,
    leaderboard,
    answerResults,
    connectSocket
  } =
    useRealtime();
  useEffect(() => {
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken");
    if (token) {
      connectSocket({ token, role: "led" });
    }
  }, [connectSocket]);

  const { remainingSeconds } = useCountdownClock(countdownEndsAt, countdownSeconds);
  const { ledAudioRef } = useLedAudioSync(socket, question?.audioUrl);

  const revealDetailText = useMemo(() => {
    if (!question || !reveal) return [];
    if (reveal.fillBlankAnswers.length > 0) {
      if (question.type === "matching" || question.type === "ordering") return [];
      return [`Đáp án chấp nhận: ${reveal.fillBlankAnswers.join(" | ")}`];
    }

    return [];
  }, [question, reveal]);
  const acceptedAnswerCompact = useMemo(() => {
    if (!question || !reveal || reveal.fillBlankAnswers.length === 0) return "";
    const raw = reveal.fillBlankAnswers[0] ?? "";
    if (question.type === "matching") {
      return raw
        .split(";")
        .map((pair) => pair.trim().replace(/\./g, ":"))
        .filter(Boolean)
        .join(";");
    }
    if (question.type === "ordering") {
      return reveal.fillBlankAnswers
        .map((item) => item.trim())
        .filter(Boolean)
        .join(" | ");
    }
    return "";
  }, [question, reveal]);
  const questionTitle = useMemo(() => {
    if (!question) return "";
    if (question.type !== "matching") return question.content;
    const parsed = parseMatchingContent(question.content);
    return parsed.stem || question.content;
  }, [question]);
  const matchingColumns = useMemo(() => {
    if (!question || question.type !== "matching") {
      return { left: [] as string[], right: [] as string[] };
    }
    const parsed = parseMatchingContent(question.content);
    return { left: parsed.left, right: parsed.right };
  }, [question]);
  const matchingConnections = useMemo(() => {
    if (question?.type !== "matching" || !reveal || reveal.fillBlankAnswers.length === 0) {
      return [];
    }
    const palette = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];
    const raw = reveal.fillBlankAnswers[0] ?? "";
    return raw
      .split(";")
      .map((pair) => pair.trim().replace(/\./g, ":"))
      .filter(Boolean)
      .map((pair) => {
        const [leftRaw, rightRaw] = pair.split(":").map((x) => x.trim());
        const leftIdx = Number(leftRaw) - 1;
        const rightIdx = rightRaw.toUpperCase().charCodeAt(0) - 65;
        return {
          leftKey: leftRaw,
          rightKey: rightRaw.toUpperCase(),
          leftText: matchingColumns.left[leftIdx] ?? "",
          rightText: matchingColumns.right[rightIdx] ?? ""
        };
      })
      .map((item, idx) => ({ ...item, color: palette[idx % palette.length] }));
  }, [matchingColumns.left, matchingColumns.right, question?.type, reveal]);

  const ledBg = ledBackgroundUrl && ledBackgroundUrl.trim().length > 0 ? ledBackgroundUrl : backgroundUrl;
  const ledBackgroundImage = ledBg && ledBg.trim().length > 0 ? resolveMediaUrl(ledBg) : "";
  const [viewport, setViewport] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const contentScale = useMemo(() => {
    const sw = viewport.width / DESIGN_WIDTH;
    const sh = viewport.height / DESIGN_HEIGHT;
    return Math.max(0.55, Math.min(sw, sh));
  }, [viewport.height, viewport.width]);

  return (
    <ScreenRoot>
      {/* Nền cố định (fixed) toàn màn hình */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -2,
          backgroundColor: "#EAF3F8",
          backgroundImage: ledBackgroundImage
            ? `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.08) 100%), url("${ledBackgroundImage}")`
            : "none",
          backgroundSize: "contain",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat"
        }}
      />
      {/* Overlay gradient tinh chỉnh */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
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
          width: "100%",
          overflow: "hidden"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: `${DESIGN_WIDTH}px`,
            height: `${DESIGN_HEIGHT}px`,
            transform: `translateX(-50%) scale(${contentScale})`,
            transformOrigin: "top center"
          }}
        >
          <Box
            sx={{
              width: "100%",
              height: "100%",
              px: 24 / 8,
              pt: "17vh",
              pb: 22 / 8,
              display: "flex",
              flexDirection: "column",
              gap: 2.5 / 8
            }}
          >
        {(screen === "question" || screen === "countdown" || screen === "reveal") && (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", lg: 1536 },
              mx: "auto",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "minmax(280px, 0.72fr) minmax(620px, 1.6fr) minmax(200px, 0.55fr)" },
              gap: { xs: 2, lg: 3 },
              alignItems: "stretch"
            }}
          >
            <GlassCard sx={{ p: { xs: 1.75, md: 2.5 }, borderRadius: { xs: 3, md: 4 }, minHeight: { lg: "70vh" } }}>
              <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: { xs: "1.05rem", md: "1.25rem" } }}>
                Kết quả thí sinh
              </Typography>
              <Box sx={{ mt: 1.75, display: "grid", gap: 1 }}>
                {screen === "reveal" && answerResults ? (
                  answerResults.results.map((row) => (
                    <Box
                      key={`${row.contestantId}-${row.teamName}`}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1.25,
                        p: 1.25,
                        borderRadius: 2.5,
                        background: "rgba(255,255,255,0.56)",
                        border: "1px solid rgba(111, 165, 207, 0.18)"
                      }}
                    >
                      <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", textAlign: "left", minWidth: 0 }}>
                        {row.contestantName}
                      </Typography>
                      <Typography
                        component="div"
                        sx={{ fontWeight: 800, color: "#334155", fontSize: "0.95rem", whiteSpace: "nowrap", flexShrink: 0 }}
                      >
                        {row.answerSummary || ""}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography component="div" sx={{ color: "#64748B", fontWeight: 700 }}>
                    Danh sách thí sinh và câu trả lời sẽ hiển thị ở bước 1.
                  </Typography>
                )}
              </Box>
            </GlassCard>

            {/* Cột phải: Câu hỏi, tuỳ chọn, banner đáp án */}
            <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: { xs: 1.5, md: 2 } }}>
              {question && (
                <Fade in timeout={450}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", lg: "row" },
                      gap: { xs: 1.25, md: 2 },
                      alignItems: "stretch"
                    }}
                  >
                    <GlassCard sx={{ p: { xs: 1.75, sm: 2, md: 3 }, borderRadius: { xs: 3, md: 4 }, flex: 1, minWidth: 0, minHeight: { lg: "70vh" } }}>
                      {question.type === "fill_blank" ? (
                        <QuestionContentWithBlank
                          content={question.content}
                          sx={{
                            fontWeight: 800,
                            color: "#1A3A4A",
                            textAlign: "center",
                            fontSize: { xs: "1.6rem", sm: "1.9rem", md: "2.4rem" },
                            lineHeight: 1.2,
                            mb: 0
                          }}
                        />
                      ) : (
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
                          {questionTitle}
                        </Typography>
                      )}
                      {question.type === "matching" && (matchingColumns.left.length > 0 || matchingColumns.right.length > 0) && (
                        <Box
                          sx={{
                            mt: 2,
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                            gap: { xs: 1.25, md: 2 }
                          }}
                        >
                          <GlassCard sx={{ p: { xs: 1.25, md: 1.6 }, borderRadius: 3 }}>
                            <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 0.8 }}>
                              Cột trái
                            </Typography>
                            {matchingColumns.left.map((item, idx) => (
                              <Box
                                key={`left-${idx}`}
                                sx={{
                                  mb: 0.7,
                                  px: 1.2,
                                  py: 0.8,
                                  borderRadius: 2,
                                  border: "1px solid rgba(26,140,142,0.22)",
                                  background: "rgba(255,255,255,0.7)"
                                }}
                              >
                                <Typography
                                  component="div"
                                  sx={{ color: "#17324d", fontWeight: 800, fontSize: { xs: "1rem", md: "1.1rem" }, lineHeight: 1.4 }}
                                >
                                  ({idx + 1}) {item}
                                </Typography>
                              </Box>
                            ))}
                          </GlassCard>
                          <GlassCard sx={{ p: { xs: 1.25, md: 1.6 }, borderRadius: 3 }}>
                            <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 0.8 }}>
                              Cột phải
                            </Typography>
                            {matchingColumns.right.map((item, idx) => (
                              <Box
                                key={`right-${idx}`}
                                sx={{
                                  mb: 0.7,
                                  px: 1.2,
                                  py: 0.8,
                                  borderRadius: 2,
                                  border: "1px solid rgba(26,140,142,0.22)",
                                  background: "rgba(255,255,255,0.7)"
                                }}
                              >
                                <Typography
                                  component="div"
                                  sx={{ color: "#17324d", fontWeight: 800, fontSize: { xs: "1rem", md: "1.1rem" }, lineHeight: 1.4 }}
                                >
                                  {String.fromCharCode(65 + idx)}. {item}
                                </Typography>
                              </Box>
                            ))}
                          </GlassCard>
                        </Box>
                      )}
                      {question.type === "matching" && screen === "reveal" && ledSolutionVisible && matchingConnections.length > 0 && (
                        <GlassCard
                          sx={{
                            mt: 2,
                            p: { xs: 1.25, md: 1.8 },
                            borderRadius: 3,
                            border: "2px solid rgba(15,107,109,0.25)",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.85) 100%)"
                          }}
                        >
                          <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 1.2 }}>
                            Dây nối đáp án đúng
                          </Typography>
                          {acceptedAnswerCompact && (
                            <Typography
                              component="div"
                              sx={{ fontWeight: 800, color: "#17324d", mb: 1.2, fontSize: { xs: "0.95rem", md: "1.05rem" } }}
                            >
                              Đáp án: {acceptedAnswerCompact}
                            </Typography>
                          )}
                          <Box sx={{ display: "grid", gap: 1 }}>
                            {matchingConnections.map((connection) => (
                              <Box
                                key={`${connection.leftKey}-${connection.rightKey}`}
                                sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 1 }}
                              >
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: 2,
                                    border: `2px solid ${connection.color}`,
                                    backgroundColor: "rgba(255,255,255,0.9)"
                                  }}
                                >
                                  <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "0.95rem", md: "1.05rem" } }}>
                                    ({connection.leftKey}) {connection.leftText}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", minWidth: { xs: 64, md: 92 } }}>
                                  <Box sx={{ height: 4, flex: 1, borderRadius: 999, backgroundColor: connection.color }} />
                                  <Box sx={{ width: 0, height: 0, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: `10px solid ${connection.color}` }} />
                                </Box>
                                <Box
                                  sx={{
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: 2,
                                    border: `2px solid ${connection.color}`,
                                    backgroundColor: "rgba(255,255,255,0.9)"
                                  }}
                                >
                                  <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "0.95rem", md: "1.05rem" } }}>
                                    {connection.rightKey}. {connection.rightText}
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </GlassCard>
                      )}
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
                        <audio
                          ref={ledAudioRef}
                          key={`${question.id}-${question.audioUrl}`}
                          controls
                          crossOrigin="anonymous"
                          style={{ marginTop: 20, width: "100%" }}
                        >
                          <source src={resolveMediaUrl(question.audioUrl)} />
                        </audio>
                      )}
                    </GlassCard>

                    {screen === "reveal" &&
                      ledSolutionVisible &&
                      question?.type !== "matching" &&
                      question?.type !== "ordering" &&
                      revealDetailText.length > 0 && (
                      <GlassCard
                        sx={{
                          p: { xs: 1.5, sm: 1.75, md: 2.25 },
                          borderRadius: { xs: 3, md: 4 },
                          border: "2px solid rgba(212,167,65,0.55)",
                          background: "linear-gradient(135deg, rgba(212,167,65,0.12), rgba(255,255,255,0.88))",
                          flex: 1,
                          minWidth: 0
                        }}
                      >
                        {revealDetailText.map((line, idx) => (
                          <Typography
                            key={`${line}-${idx}`}
                            component="div"
                            sx={{
                              fontWeight: idx === 0 ? 900 : 700,
                              color: idx === 0 ? "#8A5A00" : "#17324d",
                              fontSize: { xs: idx === 0 ? "1.05rem" : "0.95rem", md: idx === 0 ? "1.25rem" : "1.05rem" },
                              lineHeight: 1.45,
                              mt: idx === 0 ? 0 : 0.6
                            }}
                          >
                            {line}
                          </Typography>
                        ))}
                      </GlassCard>
                    )}

                    {options.length > 0 && (
                      <Box
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: { xs: 1, sm: 1.2, md: 1.8 }
                        }}
                      >
                        {options.map((opt) => (
                          <OptionCard
                            key={opt.id}
                            highlighted={
                              screen === "reveal" && ledSolutionVisible && !!reveal?.correctOptionIds.includes(opt.id)
                            }
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
                        {screen === "reveal" && ledSolutionVisible && question?.type === "ordering" && acceptedAnswerCompact && (
                          <GlassCard
                            sx={{
                              p: { xs: 1.2, sm: 1.5, md: 1.8 },
                              borderRadius: { xs: 3, md: 4 },
                              border: "2px solid rgba(212,167,65,0.55)",
                              background: "linear-gradient(135deg, rgba(212,167,65,0.12), rgba(255,255,255,0.88))"
                            }}
                          >
                            <Typography
                              component="div"
                              sx={{
                                fontWeight: 900,
                                color: "#8A5A00",
                                textAlign: "center",
                                fontSize: { xs: "1rem", md: "1.15rem" }
                              }}
                            >
                              Đáp án chấp nhận: {acceptedAnswerCompact}
                            </Typography>
                          </GlassCard>
                        )}
                      </Box>
                    )}
                  </Box>
                </Fade>
              )}


            </Box>

            <GlassCard
              sx={{
                p: { xs: 1.6, md: 2.2 },
                borderRadius: { xs: 3, md: 4 },
                minHeight: { lg: "70vh" },
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center"
              }}
            >
              <Typography component="div" sx={{ fontWeight: 900, color: "#8A5A00", mb: 1, fontSize: { xs: "1.05rem", md: "1.2rem" } }}>
                Số đếm
              </Typography>
              <Typography
                component="div"
                sx={{
                  fontWeight: 900,
                  color: "#17324d",
                  fontSize: { xs: "3rem", md: "4.6rem", lg: "5.4rem" },
                  lineHeight: 1
                }}
              >
                {screen === "countdown" ? remainingSeconds : "—"}
              </Typography>
            </GlassCard>
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
              gridTemplateColumns: "1fr"
            }}
          >
            {teamList.teams.map((team) => (
              <GlassCard key={team.id} sx={{ p: { xs: 2, md: 3 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: { xs: "1.15rem", md: "1.5rem" }, textAlign: "center" }}>
                  {team.name.toLowerCase().startsWith('đội') ? team.name : `Đội ${team.name}`}
                </Typography>
                <Box sx={{ mt: 1.5, display: "grid", gap: 1 }}>
                  {team.contestants.length > 0 ? (
                    team.contestants.map((contestant) => (
                      <Box key={contestant.id} sx={{ p: 1.5, borderRadius: 2.5, background: "rgba(255,255,255,0.52)", border: "1px solid rgba(111, 165, 207, 0.18)" }}>
                        <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.1rem" } }}>
                          {contestant.name}
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

        {screen === "team_score" && (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 1080 },
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, md: 1.5 }
            }}
          >
            {teamScore?.teams?.map((team) => (
              <GlassCard key={team.name} sx={{ p: { xs: 1.5, md: 2.2 }, borderRadius: { xs: 3, md: 4 } }}>
                <Typography
                  component="div"
                  sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "1rem", md: "1.25rem" }, textAlign: "center" }}
                >
                  {team.name.toLowerCase().startsWith("đội") ? team.name : `Đội ${team.name}`}
                  {team.totalScore && team.totalScore > 0 ? ` - ${team.totalScore} điểm` : ""}
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
                          {contestant.score && contestant.score > 0 ? `${contestant.score} điểm` : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </GlassCard>
            ))}
          </Box>
        )}

        {screen === "leaderboard" && (
          <Box
            sx={{
              width: "100%",
              maxWidth: { xs: "100%", md: 1080 },
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, md: 1.5 }
            }}
          >
            {leaderboard?.rankings?.map((item) => (
              <GlassCard
                key={`${item.rank}-${item.name}`}
                sx={{
                  p: { xs: 1.5, md: 2.2 },
                  borderRadius: { xs: 3, md: 4 },
                  border:
                    item.rank === 1
                      ? "2px solid #D4A741"
                      : item.rank === 2
                        ? "2px solid #94A3B8"
                        : item.rank === 3
                          ? "2px solid #B45309"
                          : undefined,
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
                        item.rank === 1
                          ? "linear-gradient(135deg, #D4A741, #F5D98A)"
                          : item.rank === 2
                            ? "linear-gradient(135deg, #94A3B8, #CBD5E1)"
                            : item.rank === 3
                              ? "linear-gradient(135deg, #B45309, #D97706)"
                              : "linear-gradient(135deg, #1A8C8E, #0F6B6D)"
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
                      {item.name}
                      {item.totalScore && item.totalScore > 0 ? ` - ${item.totalScore} điểm` : ""}
                    </Typography>
                    <Typography component="div" sx={{ mt: 0.25, color: "#4A7A8A", fontSize: { xs: "0.92rem", md: "1rem" } }}>
                      {item.team ? (item.team.toLowerCase().startsWith("đội") ? item.team : `Đội ${item.team}`) : "Chưa có đội"}
                    </Typography>
                  </Box>
                </Box>
              </GlassCard>
            ))}
          </Box>
        )}
          </Box>
        </Box>
      </Box>
    </ScreenRoot>
  );
};
