import { Box, Fade, Paper, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { getBackendBaseUrl, resolveMediaUrl } from "../../api";
import { QuestionContentWithBlank } from "../../components/contestant/QuestionContentWithBlank";
import { parseMatchingContent } from "../../components/admin/matchingEditorUtils";
import { useCountdownClock } from "../../hooks/realtime/useCountdownClock";
import { useLedAudioSync } from "../../hooks/realtime/useLedAudioSync";
import { useRealtime } from "../../hooks/useRealtime";

const flash = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.02); filter: brightness(1.08); }
`;

const DESKTOP_FRAME_MAX_WIDTH = 1440;


const ScreenRoot = styled(Box)({
  minHeight: "100svh",
  width: "100vw",
  position: "relative",
  overflow: "hidden",
  color: "#17324d",
  marginLeft: "calc(50% - 50vw)",
  isolation: "isolate"
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
  const [ledBackgroundFallback, setLedBackgroundFallback] = useState<string | null>(null);
  const [bgLoadState, setBgLoadState] = useState<"idle" | "loaded" | "error">("idle");
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
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem("adminToken") || localStorage.getItem("accessToken") || localStorage.getItem("contestantToken");
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    void fetch(`${getBackendBaseUrl()}/api/contest-state/rules`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!mounted || !json?.data) return;
        const data = json.data as { ledBackgroundUrl?: string | null; backgroundUrl?: string | null };
        setLedBackgroundFallback(data.ledBackgroundUrl ?? data.backgroundUrl ?? null);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

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

  const ledBg =
    (ledBackgroundUrl && ledBackgroundUrl.trim().length > 0 ? ledBackgroundUrl : null) ??
    (backgroundUrl && backgroundUrl.trim().length > 0 ? backgroundUrl : null) ??
    ledBackgroundFallback;
  const ledBackgroundImage = ledBg && ledBg.trim().length > 0 ? resolveMediaUrl(ledBg) : "";
  const debugEnabled = new URLSearchParams(window.location.search).get("debugBg") === "1";
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
          zIndex: 0,
          backgroundColor: "#EAF3F8",
          overflow: "hidden"
        }}
      >
        {ledBackgroundImage && (
          <>
            <Box
              component="img"
              src={ledBackgroundImage}
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
              src={ledBackgroundImage}
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
      {/* Overlay gradient tinh chỉnh */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 0,
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
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: "12vh", sm: "13vh", md: "14vh", lg: "15vh" },
          pb: { xs: 4, sm: 6, md: 8, lg: 10 },
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, md: 2 }
        }}
      >
        {(screen === "question" || screen === "countdown" || screen === "reveal") && (
          <Box
            sx={{
              width: "100%",
              maxWidth: DESKTOP_FRAME_MAX_WIDTH,
              mx: "auto",
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                lg: "300px minmax(0, 1fr) 220px"
              },
              gap: { xs: 1.5, md: 2.5 },
              alignItems: "stretch"
            }}
          >
            <GlassCard sx={{ p: { xs: 1.2, md: 1.8 }, borderRadius: { xs: 3, md: 4 }, minHeight: { lg: "50vh" } }}>
              <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: { xs: "1rem", md: "1.15rem" } }}>
                Kết quả thí sinh
              </Typography>
              <Box sx={{ mt: 1.5, display: "grid", gap: 0.8 }}>
                {screen === "reveal" && answerResults ? (
                  answerResults.results.map((row) => (
                    <Box
                      key={`${row.contestantId}-${row.teamName}`}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 1,
                        px: 1.5,
                        py: 1.2,
                        borderRadius: 2.5,
                        background: "rgba(255,255,255,0.56)",
                        border: "1px solid rgba(111, 165, 207, 0.18)"
                      }}
                    >
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#17324d",
                          textAlign: "left",
                          minWidth: 0,
                          fontSize: { xs: "0.95rem", md: "1.05rem" },
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {row.contestantName}
                      </Typography>
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#334155",
                          fontSize: { xs: "0.9rem", md: "1rem" },
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          maxWidth: "55%",
                          overflow: "hidden",
                          textOverflow: "ellipsis"
                        }}
                      >
                        {row.answerSummary || ""}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box sx={{ minHeight: 12 }} />
                )}
              </Box>
            </GlassCard>

            {/* Cột giữa: Câu hỏi và đáp án trong cùng 1 cụm */}
            <Box sx={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", gap: { xs: 1.2, md: 1.8 } }}>
              {question && (
                <Fade in timeout={450}>
                  <GlassCard sx={{ p: { xs: 1.2, sm: 1.5, md: 2 }, borderRadius: { xs: 3, md: 4 }, minWidth: 0, minHeight: { lg: "50vh" } }}>
                      {question.type === "fill_blank" ? (
                        <QuestionContentWithBlank
                          content={question.content}
                          sx={{
                            fontWeight: 800,
                            color: "#1A3A4A",
                            textAlign: "center",
                            fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.95rem" },
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
                            fontSize: { xs: "1.3rem", sm: "1.5rem", md: "1.95rem" },
                            lineHeight: 1.2,
                            overflowWrap: "anywhere"
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
                      {question.imageUrl && (
                        <Box
                          component="img"
                          key={`${question.id}-${question.imageUrl}`}
                          src={resolveMediaUrl(question.imageUrl)}
                          alt="Hình minh họa câu hỏi"
                          sx={{
                            mt: 2,
                            display: "block",
                            mx: "auto",
                            maxWidth: "100%",
                            maxHeight: 320,
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
                          style={{ marginTop: 16, width: "100%" }}
                        >
                          <source src={resolveMediaUrl(question.audioUrl)} />
                        </audio>
                      )}
                    {options.length > 0 && (
                      <Box
                        sx={{
                          mt: 1.8,
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
                          gap: { xs: 1, sm: 1.2, md: 1.5 }
                        }}
                      >
                        {options.map((opt) => (
                          <OptionCard
                            key={opt.id}
                            highlighted={
                              screen === "reveal" && ledSolutionVisible && !!reveal?.correctOptionIds.includes(opt.id)
                            }
                            sx={{ p: { xs: 1.2, sm: 1.4, md: 1.8 }, borderRadius: { xs: 3, md: 4 }, height: "100%" }}
                          >
                            <Typography
                              component="div"
                              sx={{
                                fontWeight: 800,
                                color: "#17324d",
                                fontSize: { xs: "1rem", sm: "1.15rem", md: "1.45rem" },
                                lineHeight: 1.25,
                                textAlign: "center",
                                overflowWrap: "anywhere"
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
                              background: "linear-gradient(135deg, rgba(212,167,65,0.12), rgba(255,255,255,0.88))",
                              gridColumn: "1 / -1"
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

                    {screen === "reveal" &&
                      ledSolutionVisible &&
                      question?.type !== "matching" &&
                      question?.type !== "ordering" &&
                      revealDetailText.length > 0 && (
                      <GlassCard
                        sx={{
                          mt: 2,
                          p: { xs: 1.3, sm: 1.6, md: 2 },
                          borderRadius: { xs: 3, md: 4 },
                          border: "2px solid rgba(212,167,65,0.55)",
                          background: "linear-gradient(135deg, rgba(212,167,65,0.12), rgba(255,255,255,0.88))",
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
                              fontSize: { xs: idx === 0 ? "0.95rem" : "0.88rem", md: idx === 0 ? "1.1rem" : "0.98rem" },
                              lineHeight: 1.45,
                              mt: idx === 0 ? 0 : 0.6
                            }}
                          >
                            {line}
                          </Typography>
                        ))}
                      </GlassCard>
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
                        <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 1.2, fontSize: { xs: "0.9rem", md: "1rem" } }}>
                          Dây nối đáp án đúng
                        </Typography>
                        {acceptedAnswerCompact && (
                          <Typography
                            component="div"
                            sx={{ fontWeight: 800, color: "#17324d", mb: 1.2, fontSize: { xs: "0.86rem", md: "0.95rem" } }}
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
                                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "0.85rem", md: "0.95rem" } }}>
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
                                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: { xs: "0.85rem", md: "0.95rem" } }}>
                                  {connection.rightKey}. {connection.rightText}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </GlassCard>
                    )}
                  </GlassCard>
                </Fade>
              )}


            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                alignItems: "center",
                textAlign: "center",
                pt: { lg: 5 }
              }}
            >
              <Box
                sx={{
                  width: { xs: 124, md: 156, lg: 210 },
                  height: { xs: 124, md: 156, lg: 210 },
                  borderRadius: "50%",
                  border: "2px solid rgba(15,107,109,0.28)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 16px 34px rgba(15,107,109,0.14)",
                  transform: { lg: "translateX(150px)" }
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    fontWeight: 900,
                    color: "#17324d",
                    fontSize: { xs: "2.2rem", md: "3rem", lg: "4.2rem" },
                    lineHeight: 1
                  }}
                >
                  {screen === "countdown" ? remainingSeconds : "—"}
                </Typography>
              </Box>
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
          {`LED BG DEBUG
state=${bgLoadState}
ledBackgroundUrl=${String(ledBackgroundUrl ?? "")}
backgroundUrl=${String(backgroundUrl ?? "")}
fallback=${String(ledBackgroundFallback ?? "")}
resolved=${ledBackgroundImage}`}
        </Box>
      )}
    </ScreenRoot>
  );
};
