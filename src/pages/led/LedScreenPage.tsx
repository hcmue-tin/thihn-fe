import { Box, Fade, Paper, Typography } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { getBackendBaseUrl, resolveMediaUrl } from "../../api";
import { QuestionContentWithBlank } from "../../components/contestant/QuestionContentWithBlank";
import { parseMatchingContent } from "../../components/admin/matchingEditorUtils";
import { useCountdownClock } from "../../hooks/realtime/useCountdownClock";
import { useLedAudioSync } from "../../hooks/realtime/useLedAudioSync";
import { useRealtime } from "../../hooks/useRealtime";
import { fluid, fluidFont } from "../../utils/fluid";

const flash = keyframes`
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.02); filter: brightness(1.08); }
`;

/*
 * LED screen — designed for 1080p and 4K LED walls as the primary target.
 * Every size uses clamp() / vmin / fr units so the whole UI scales smoothly
 * from laptops (preview) up to massive displays. No stepped breakpoints.
 */

const ScreenRoot = styled(Box)({
  height: "100svh",
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
  borderRadius: "1rem",
  color: "#1A3A4A"
});

const OptionCard = styled(GlassCard, {
  shouldForwardProp: (prop) => prop !== "highlighted"
})<{ highlighted?: boolean }>(({ highlighted }) => ({
  padding: "clamp(0.8rem, 1.4vw, 1.6rem)",
  animation: highlighted ? `${flash} 900ms ease-in-out 2` : "none",
  borderColor: highlighted ? "#D4A741" : "rgba(184,217,236,0.3)",
  border: highlighted ? "2px solid #D4A741" : "1px solid rgba(184,217,236,0.3)",
  background: highlighted
    ? "linear-gradient(135deg, rgba(212,167,65,0.2) 0%, rgba(245,217,138,0.4) 100%)"
    : "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(247,251,255,0.72) 100%)"
}));

export const LedScreenPage = () => {
  const [ledBackgroundFallback, setLedBackgroundFallback] = useState<string | null>(null);
  const [ledWaitingBackgroundFallback, setLedWaitingBackgroundFallback] = useState<string | null>(null);
  const [bgLoadState, setBgLoadState] = useState<"idle" | "loaded" | "error">("idle");
  const [leaderboardPageIndex, setLeaderboardPageIndex] = useState(0);
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
    ledWaitingBackgroundUrl,
    reveal,
    ledSolutionVisible,
    teamList,
    teamScore,
    leaderboard,
    answerResults,
    connectSocket
  } = useRealtime();

  // Lock body scrolling on the LED route.
  useEffect(() => {
    document.body.classList.add("app-no-scroll");
    return () => document.body.classList.remove("app-no-scroll");
  }, []);

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
        const data = json.data as { ledBackgroundUrl?: string | null; ledWaitingBackgroundUrl?: string | null; backgroundUrl?: string | null };
        setLedBackgroundFallback(data.ledBackgroundUrl ?? data.backgroundUrl ?? null);
        setLedWaitingBackgroundFallback(data.ledWaitingBackgroundUrl ?? null);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const { remainingSeconds } = useCountdownClock(countdownEndsAt, countdownSeconds);
  const { ledAudioRef } = useLedAudioSync(socket, question?.audioUrl);
  const flattenedTeamContestants = useMemo(() => {
    const rows =
      teamList?.teams.flatMap((team) =>
        team.contestants.map((contestant) => ({
          id: contestant.id,
          name: contestant.name,
          unit: contestant.unit?.trim() || "Chưa có đơn vị",
          teamName: team.name
        }))
      ) ?? [];

    rows.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    return rows;
  }, [teamList]);
  const flattenedTeamScores = useMemo(() => {
    const rows =
      teamScore?.teams.flatMap((team) =>
        (team.contestants ?? []).map((contestant) => ({
          key: `${team.name}-${contestant.contestantId ?? contestant.name}`,
          teamName: team.name,
          contestantName: contestant.name,
          score: contestant.score ?? 0
        }))
      ) ?? [];

    rows.sort((a, b) => a.contestantName.localeCompare(b.contestantName, "vi"));
    return rows;
  }, [teamScore]);
  const leaderboardTopFive = useMemo(() => leaderboard?.rankings?.slice(0, 5) ?? [], [leaderboard]);
  const leaderboardRowsPerPage = 6;
  const leaderboardPages = useMemo(() => {
    const rows = leaderboard?.rankings?.slice(5) ?? [];
    const pages = [];
    for (let index = 0; index < rows.length; index += leaderboardRowsPerPage) {
      pages.push(rows.slice(index, index + leaderboardRowsPerPage));
    }
    return pages;
  }, [leaderboard]);
  const currentLeaderboardPage = leaderboardPages[leaderboardPageIndex] ?? leaderboardPages[0] ?? [];

  useEffect(() => {
    setLeaderboardPageIndex(0);
  }, [leaderboard?.rankings]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleLeaderboardPage = ({ direction }: { direction: "next" | "prev" }) => {
      setLeaderboardPageIndex((prev) => {
        const total = Math.max(leaderboardPages.length, 1);
        return direction === "prev" ? (prev - 1 + total) % total : (prev + 1) % total;
      });
    };
    socket.on("leaderboard:page", handleLeaderboardPage);
    return () => {
      socket.off("leaderboard:page", handleLeaderboardPage);
    };
  }, [leaderboardPages.length, socket]);

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

  const isWaitingScreen = screen === "idle" || screen === "waiting";
  const ledBg = isWaitingScreen
    ? (ledWaitingBackgroundUrl && ledWaitingBackgroundUrl.trim().length > 0 ? ledWaitingBackgroundUrl : null) ??
      ledWaitingBackgroundFallback ??
      (ledBackgroundUrl && ledBackgroundUrl.trim().length > 0 ? ledBackgroundUrl : null) ??
      (backgroundUrl && backgroundUrl.trim().length > 0 ? backgroundUrl : null) ??
      ledBackgroundFallback
    : (ledBackgroundUrl && ledBackgroundUrl.trim().length > 0 ? ledBackgroundUrl : null) ??
      (backgroundUrl && backgroundUrl.trim().length > 0 ? backgroundUrl : null) ??
      ledBackgroundFallback;
  const ledBackgroundImage = ledBg && ledBg.trim().length > 0 ? resolveMediaUrl(ledBg) : "";
  const debugEnabled = new URLSearchParams(window.location.search).get("debugBg") === "1";
  const countdownDisplay =
    screen === "countdown" ? remainingSeconds : (question?.countdownSeconds ?? countdownSeconds ?? 0);

  // Fluid frame: leaves breathing room on desktop, expands to full width
  // on laptops and shrinks gracefully on tablets.
  const frameMaxWidth = "min(98vw, 110rem)";

  return (
    <ScreenRoot>
      {/* Fluid background — logos must NOT be embedded in the image. */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
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
                objectFit: "cover",
                objectPosition: "center center",
                opacity: 0.34,
                filter: "blur(20px) saturate(0.95)",
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
                objectFit: "contain",
                objectPosition: "center center",
                opacity: 1
              }}
            />
          </>
        )}
      </Box>
      {/* Subtle overlay for text contrast. */}
      <Box
        sx={{
          position: "fixed",
          inset: 0,
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
          height: "100svh",
          overflow: "hidden",
          px: fluid(0.75, 1.6, 2.5),
          pt: 0,
          pb: fluid(0.5, 1, 1.2),
          display: "grid",
          gridTemplateRows: "20svh minmax(0, 80svh)",
          "@media (max-width: 900px)": {
            gridTemplateRows: "auto minmax(0, 1fr)"
          }
        }}
      >
        {/* 20% top area: countdown centered */}
        <Box sx={{ height: "100%", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {(screen === "question" || screen === "countdown" || screen === "reveal") && (
            <Box
              sx={{
                width: fluid(7, 16, 14, "vmin"),
                height: fluid(7, 16, 14, "vmin"),
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                border: "2px solid rgba(15,107,109,0.28)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.88) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 16px 34px rgba(15,107,109,0.14)"
              }}
            >
              <Typography
                component="div"
                sx={{
                  fontWeight: 900,
                  color: "#17324d",
                  fontSize: fluidFont.display,
                  lineHeight: 1
                }}
              >
                {countdownDisplay}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ height: "100%", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: fluid(0.5, 1, 1.5) }}>
        {(screen === "question" || screen === "countdown" || screen === "reveal") && (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              maxWidth: frameMaxWidth,
              mx: "auto",
              display: "grid",
              // 2-column layout in 80% area: results + question content.
              gridTemplateColumns: "clamp(18rem, 28vw, 30rem) minmax(0, 1fr)",
              gap: fluid(0.75, 1.5, 2.25),
              alignItems: "stretch",
              "@media (max-width: 900px)": {
                gridTemplateColumns: "1fr",
                overflow: "auto"
              }
            }}
          >
            <GlassCard
              sx={{
                p: fluid(0.75, 1.2, 1.75),
                borderRadius: fluid(0.75, 1.1, 1.4),
                minHeight: 0,
                overflow: "auto"
              }}
            >
              <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: fluidFont.h6 }}>
                Kết quả thí sinh
              </Typography>
              <Box sx={{ mt: fluid(0.5, 0.9, 1.25), display: "grid", gap: fluid(0.3, 0.5, 0.7) }}>
                {screen === "reveal" && answerResults ? (
                  answerResults.results.map((row) => {
                    const contestantName = (row.contestantName || "").trim();
                    const answerSummaryRaw = (row.answerSummary || "").trim();
                    const answerSummary = answerSummaryRaw.length > 0 ? answerSummaryRaw : "-";
                    const isPairAnswer = /\d+\s*[:.]\s*[A-Za-z]/.test(answerSummary);
                    const isShortTokenAnswer = /^([A-Za-z]{1,8}|-)$/.test(answerSummary);
                    // Auto layout rule:
                    // - keep inline only when both name and answer are short
                    // - force new line for matching-style answers (1:A;2:B;...)
                    // - force new line when contestant name is long
                    const hasLongName = contestantName.length > 26;
                    const shouldInlineSummary =
                      answerSummary === "-" || (answerSummary.length > 0 && !isPairAnswer && isShortTokenAnswer && !hasLongName);
                    const isCorrectAnswer = ledSolutionVisible && row.isCorrect === true;
                    const isWrongAnswer = ledSolutionVisible && row.isCorrect === false;

                    return (
                      <Box
                        key={`${row.contestantId}-${row.teamName}`}
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "stretch",
                          gap: fluid(0.35, 0.5, 0.7),
                          px: fluid(0.6, 0.9, 1.2),
                          py: fluid(0.5, 0.75, 1),
                          borderRadius: 2.5,
                          background: isCorrectAnswer
                            ? "rgba(34, 197, 94, 0.2)"
                            : isWrongAnswer
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(255,255,255,0.56)",
                          border: isCorrectAnswer
                            ? "1px solid rgba(22, 163, 74, 0.55)"
                            : isWrongAnswer
                              ? "1px solid rgba(220, 38, 38, 0.55)"
                              : "1px solid rgba(111, 165, 207, 0.18)"
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                          <Typography
                            component="div"
                            sx={{
                              fontWeight: 800,
                              color: "#17324d",
                              textAlign: "left",
                              fontSize: fluidFont.body,
                              minWidth: 0,
                              whiteSpace: shouldInlineSummary ? "nowrap" : "normal",
                              overflow: "hidden",
                              textOverflow: shouldInlineSummary ? "ellipsis" : "unset",
                              overflowWrap: shouldInlineSummary ? "normal" : "anywhere",
                              lineHeight: 1.3
                            }}
                          >
                            {contestantName}
                          </Typography>
                          {shouldInlineSummary && (
                            <Typography
                              component="div"
                              sx={{
                                fontWeight: 700,
                                color: "#334155",
                                fontSize: fluidFont.body,
                                whiteSpace: "nowrap",
                                flexShrink: 0
                              }}
                            >
                              {answerSummary}
                            </Typography>
                          )}
                        </Box>

                        {!shouldInlineSummary && answerSummary.length > 0 && (
                          <Typography
                            component="div"
                            sx={{
                              fontWeight: 700,
                              color: "#334155",
                              fontSize: fluidFont.body,
                              whiteSpace: "normal",
                              textAlign: "left",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              lineHeight: 1.35
                            }}
                          >
                            {answerSummary}
                          </Typography>
                        )}
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ minHeight: "0.75rem" }} />
                )}
              </Box>
            </GlassCard>

            {/* Center: question card + options. */}
            <Box
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: fluid(0.5, 1, 1.5),
                minHeight: 0,
                overflow: "auto"
              }}
            >
              {question && (
                <Fade in timeout={450}>
                  <GlassCard
                    sx={{
                      p: fluid(0.75, 1.2, 1.75),
                      borderRadius: fluid(0.75, 1.2, 1.5),
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: fluid(0.5, 0.9, 1.25)
                    }}
                  >
                    {question.type === "fill_blank" ? (
                      <QuestionContentWithBlank
                        content={question.content}
                        sx={{
                          fontWeight: 800,
                          color: "#1A3A4A",
                          textAlign: "left",
                          fontSize: fluidFont.h4,
                          lineHeight: 1.25,
                          mb: 0
                        }}
                      />
                    ) : (
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#1A3A4A",
                          textAlign: "left",
                          fontSize: fluidFont.h4,
                          lineHeight: 1.25,
                          overflowWrap: "anywhere"
                        }}
                      >
                        {questionTitle}
                      </Typography>
                    )}

                    {question.type === "matching" && (matchingColumns.left.length > 0 || matchingColumns.right.length > 0) && (
                      <Box
                        sx={{
                          display: "grid",
                          gap: fluid(0.6, 1, 1.5),
                          gridTemplateColumns: "repeat(auto-fit, minmax(min(16rem, 100%), 1fr))"
                        }}
                      >
                        <GlassCard sx={{ p: fluid(0.6, 1, 1.3), borderRadius: 3 }}>
                          <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 0.8, fontSize: fluidFont.subtitle }}>
                            Cột trái
                          </Typography>
                          {matchingColumns.left.map((item, idx) => (
                            <Box
                              key={`left-${idx}`}
                              sx={{
                                mb: fluid(0.3, 0.5, 0.7),
                                px: fluid(0.5, 0.8, 1.1),
                                py: fluid(0.4, 0.6, 0.85),
                                borderRadius: 2,
                                border: "1px solid rgba(26,140,142,0.22)",
                                background: "rgba(255,255,255,0.7)"
                              }}
                            >
                              <Typography
                                component="div"
                                sx={{ color: "#17324d", fontWeight: 800, fontSize: fluidFont.subtitle, lineHeight: 1.4 }}
                              >
                                ({idx + 1}) {item}
                              </Typography>
                            </Box>
                          ))}
                        </GlassCard>
                        <GlassCard sx={{ p: fluid(0.6, 1, 1.3), borderRadius: 3 }}>
                          <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", mb: 0.8, fontSize: fluidFont.subtitle }}>
                            Cột phải
                          </Typography>
                          {matchingColumns.right.map((item, idx) => (
                            <Box
                              key={`right-${idx}`}
                              sx={{
                                mb: fluid(0.3, 0.5, 0.7),
                                px: fluid(0.5, 0.8, 1.1),
                                py: fluid(0.4, 0.6, 0.85),
                                borderRadius: 2,
                                border: "1px solid rgba(26,140,142,0.22)",
                                background: "rgba(255,255,255,0.7)"
                              }}
                            >
                              <Typography
                                component="div"
                                sx={{ color: "#17324d", fontWeight: 800, fontSize: fluidFont.subtitle, lineHeight: 1.4 }}
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
                          display: "block",
                          mx: "auto",
                          maxWidth: "100%",
                          maxHeight: fluid(10, 26, 22, "vh"),
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
                        style={{ width: "100%" }}
                      >
                        <source src={resolveMediaUrl(question.audioUrl)} />
                      </audio>
                    )}

                    {options.length > 0 && (
                      <Box
                        sx={{
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: fluid(0.5, 0.9, 1.3),
                          "@media (max-width: 900px)": {
                            gridTemplateColumns: "1fr"
                          }
                        }}
                      >
                        {options.map((opt) => (
                          <OptionCard
                            key={opt.id}
                            highlighted={
                              screen === "reveal" && ledSolutionVisible && !!reveal?.correctOptionIds.includes(opt.id)
                            }
                            sx={{ borderRadius: fluid(0.75, 1.2, 1.5), height: "100%" }}
                          >
                            <Typography
                              component="div"
                              sx={{
                                fontWeight: 800,
                                color: "#17324d",
                                fontSize: fluidFont.title,
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
                              p: fluid(0.75, 1.2, 1.75),
                              borderRadius: fluid(0.75, 1.2, 1.5),
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
                                fontSize: fluidFont.h6
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
                            p: fluid(0.75, 1.2, 1.75),
                            borderRadius: fluid(0.75, 1.2, 1.5),
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
                                fontSize: idx === 0 ? fluidFont.subtitle : fluidFont.body,
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
                          p: fluid(0.75, 1.2, 1.75),
                          borderRadius: 3,
                          border: "2px solid rgba(15,107,109,0.25)",
                          background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,251,255,0.85) 100%)"
                        }}
                      >
                        <Typography
                          component="div"
                          sx={{ fontWeight: 900, color: "#0F6B6D", mb: fluid(0.5, 0.8, 1.1), fontSize: fluidFont.subtitle }}
                        >
                          Dây nối đáp án đúng
                        </Typography>
                        {acceptedAnswerCompact && (
                          <Typography
                            component="div"
                            sx={{
                              fontWeight: 800,
                              color: "#17324d",
                              mb: fluid(0.5, 0.8, 1.1),
                              fontSize: fluidFont.body
                            }}
                          >
                            Đáp án: {acceptedAnswerCompact}
                          </Typography>
                        )}
                        <Box sx={{ display: "grid", gap: fluid(0.4, 0.6, 0.9) }}>
                          {matchingConnections.map((connection) => (
                            <Box
                              key={`${connection.leftKey}-${connection.rightKey}`}
                              sx={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: fluid(0.4, 0.6, 0.9) }}
                            >
                              <Box
                                sx={{
                                  px: fluid(0.4, 0.6, 0.9),
                                  py: fluid(0.4, 0.6, 0.85),
                                  borderRadius: 2,
                                  border: `2px solid ${connection.color}`,
                                  backgroundColor: "rgba(255,255,255,0.9)"
                                }}
                              >
                                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: fluidFont.body }}>
                                  ({connection.leftKey}) {connection.leftText}
                                </Typography>
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", minWidth: fluid(3, 6, 6) }}>
                                <Box sx={{ height: "0.25rem", flex: 1, borderRadius: 999, backgroundColor: connection.color }} />
                                <Box
                                  sx={{
                                    width: 0,
                                    height: 0,
                                    borderTop: "0.4rem solid transparent",
                                    borderBottom: "0.4rem solid transparent",
                                    borderLeft: `0.6rem solid ${connection.color}`
                                  }}
                                />
                              </Box>
                              <Box
                                sx={{
                                  px: fluid(0.4, 0.6, 0.9),
                                  py: fluid(0.4, 0.6, 0.85),
                                  borderRadius: 2,
                                  border: `2px solid ${connection.color}`,
                                  backgroundColor: "rgba(255,255,255,0.9)"
                                }}
                              >
                                <Typography component="div" sx={{ fontWeight: 800, color: "#17324d", fontSize: fluidFont.body }}>
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

          </Box>
        )}

        {screen === "rules" && (
          <GlassCard
            sx={{
              width: "100%",
              maxWidth: "min(90vw, 80rem)",
              mx: "auto",
              p: fluid(1.25, 2.2, 3),
              borderRadius: fluid(0.75, 1.2, 1.5),
              overflow: "auto",
              minHeight: 0
            }}
          >
            <Typography
              component="div"
              sx={{ fontWeight: 900, textAlign: "center", color: "#0F6B6D", fontSize: fluidFont.h3 }}
            >
              Thể lệ cuộc thi
            </Typography>
            <Typography
              component="div"
              sx={{
                mt: fluid(1, 1.5, 2.25),
                whiteSpace: "pre-wrap",
                textAlign: "left",
                color: "#1A3A4A",
                fontSize: fluidFont.subtitle,
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
              maxWidth: "min(96vw, 108rem)",
              mx: "auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <GlassCard
              sx={{
                p: fluid(1, 1.6, 2.25),
                borderRadius: fluid(0.75, 1.2, 1.5),
                minHeight: 0,
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <Typography
                component="div"
                sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: fluidFont.h4, textAlign: "center" }}
              >
                Danh sách đội thi
              </Typography>

              {flattenedTeamContestants.length > 0 ? (
                <Box
                  sx={{
                    mt: fluid(0.75, 1.2, 1.6),
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    columnGap: fluid(1.2, 2.2, 3.2),
                    minHeight: 0,
                    height: "100%",
                    overflow: "hidden"
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "2px",
                      borderRadius: "999px",
                      background: "linear-gradient(180deg, rgba(15,107,109,0.15), rgba(15,107,109,0.55), rgba(15,107,109,0.15))",
                      pointerEvents: "none"
                    }}
                  />
                  {[0, 1].map((colIndex) => {
                    const half = Math.ceil(flattenedTeamContestants.length / 2);
                    const colRows =
                      colIndex === 0
                        ? flattenedTeamContestants.slice(0, half)
                        : flattenedTeamContestants.slice(half);
                    return (
                      <Box
                        key={`team-list-col-${colIndex}`}
                        sx={{
                          minHeight: 0,
                          display: "grid",
                          gap: fluid(0.35, 0.55, 0.8),
                          alignContent: "start",
                          overflow: "auto",
                          pr: colIndex === 0 ? fluid(0.35, 0.75, 1.1) : 0,
                          pl: colIndex === 1 ? fluid(0.35, 0.75, 1.1) : 0
                        }}
                      >
                        {colRows.map((row) => (
                          <Box
                            key={row.id}
                            sx={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                              alignItems: "center",
                              gap: fluid(0.5, 0.9, 1.4),
                              p: fluid(0.5, 0.8, 1.1),
                              borderRadius: 2.5,
                              background: "rgba(255,255,255,0.52)",
                              border: "1px solid rgba(111, 165, 207, 0.18)"
                            }}
                          >
                            <Typography
                              component="div"
                              sx={{ fontWeight: 800, color: "#17324d", fontSize: fluidFont.subtitle, minWidth: 0 }}
                              noWrap
                              title={row.name}
                            >
                              {row.name}
                            </Typography>
                            <Typography
                              component="div"
                              sx={{
                                fontWeight: 700,
                                color: "#2A5A78",
                                fontSize: fluidFont.body,
                                minWidth: 0,
                                textAlign: "right"
                              }}
                              noWrap
                              title={row.unit}
                            >
                              {row.unit}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography component="div" sx={{ mt: fluid(1, 1.5, 2), color: "#4b647c", fontSize: fluidFont.body }}>
                  Chưa có thí sinh trong đội nào
                </Typography>
              )}
            </GlassCard>
          </Box>
        )}

        {screen === "team_score" && (
          <Box
            sx={{
              width: "100%",
              maxWidth: "min(96vw, 108rem)",
              mx: "auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            <GlassCard
              sx={{
                p: fluid(1, 1.6, 2.25),
                borderRadius: fluid(0.75, 1.2, 1.5),
                minHeight: 0,
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <Typography
                component="div"
                sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: fluidFont.h4, textAlign: "center" }}
              >
                {teamScore?.teams && teamScore.teams.length === 1
                  ? `Điểm ${
                      teamScore.teams[0].name.toLowerCase().startsWith("đội")
                        ? teamScore.teams[0].name
                        : `Đội ${teamScore.teams[0].name}`
                    }`
                  : "Điểm theo đội"}
              </Typography>

              {flattenedTeamScores.length > 0 ? (
                <Box
                  sx={{
                    mt: fluid(0.75, 1.2, 1.6),
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    columnGap: fluid(1.2, 2.2, 3.2),
                    minHeight: 0,
                    overflow: "hidden",
                    flex: 1
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "2px",
                      borderRadius: "999px",
                      background: "linear-gradient(180deg, rgba(15,107,109,0.15), rgba(15,107,109,0.55), rgba(15,107,109,0.15))",
                      pointerEvents: "none"
                    }}
                  />
                  {[0, 1].map((colIndex) => {
                    const half = Math.ceil(flattenedTeamScores.length / 2);
                    const colRows =
                      colIndex === 0
                        ? flattenedTeamScores.slice(0, half)
                        : flattenedTeamScores.slice(half);
                    return (
                      <Box
                        key={`team-score-col-${colIndex}`}
                        sx={{
                          minHeight: 0,
                          display: "grid",
                          gap: fluid(0.35, 0.55, 0.8),
                          alignContent: "start",
                          overflow: "auto",
                          pr: colIndex === 0 ? fluid(0.35, 0.75, 1.1) : 0,
                          pl: colIndex === 1 ? fluid(0.35, 0.75, 1.1) : 0
                        }}
                      >
                        {colRows.map((row) => (
                          <Box
                            key={row.key}
                            sx={{
                              p: fluid(0.5, 0.8, 1.1),
                              borderRadius: 2.5,
                              background: "rgba(255,255,255,0.52)",
                              border: "1px solid rgba(111, 165, 207, 0.18)",
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                              alignItems: "center",
                              gap: fluid(0.5, 0.9, 1.4)
                            }}
                          >
                            <Typography
                              component="div"
                              sx={{ fontWeight: 800, color: "#17324d", fontSize: fluidFont.subtitle, minWidth: 0 }}
                              noWrap
                              title={row.contestantName}
                            >
                              {row.contestantName}
                            </Typography>
                            <Typography
                              component="div"
                              sx={{ fontWeight: 800, color: "#11416f", fontSize: fluidFont.body, textAlign: "right", flexShrink: 0 }}
                            >
                              {`${row.score} điểm`}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography component="div" sx={{ mt: fluid(1, 1.5, 2), color: "#4b647c", fontSize: fluidFont.body }}>
                  Chưa có dữ liệu điểm theo đội
                </Typography>
              )}
            </GlassCard>
          </Box>
        )}

        {screen === "leaderboard" && (
          <Box
            sx={{
              width: "100%",
              maxWidth: "min(96vw, 112rem)",
              mx: "auto",
              minHeight: 0,
              display: "grid",
              gridTemplateRows: "minmax(0, 1fr)",
              gap: fluid(0.75, 1.2, 1.8),
              overflow: "hidden"
            }}
          >
            <GlassCard sx={{ minHeight: 0, overflow: "hidden", p: fluid(0.75, 1.2, 1.6), display: "flex", flexDirection: "column", gap: fluid(0.5, 0.8, 1.1) }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
                <Typography component="div" sx={{ fontWeight: 900, color: "#0F6B6D", fontSize: fluidFont.h6 }}>
                  Bảng xếp hạng
                </Typography>
                {leaderboardPages.length > 1 && (
                  <Typography component="div" sx={{ color: "#4A7A8A", fontWeight: 800, fontSize: fluidFont.body }}>
                    {`Trang ${leaderboardPageIndex + 1}/${leaderboardPages.length}`}
                  </Typography>
                )}
              </Box>

              {leaderboardTopFive.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: fluid(0.28, 0.45, 0.65),
                    flexShrink: 0
                  }}
                >
                  {[
                    leaderboardTopFive.filter((item) => item.rank === 1),
                    leaderboardTopFive.filter((item) => item.rank === 2 || item.rank === 3),
                    leaderboardTopFive.filter((item) => item.rank === 4 || item.rank === 5)
                  ].map((row, rowIndex) => (
                    <Box
                      key={`leaderboard-top-row-${rowIndex}`}
                      sx={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        gap: fluid(0.45, 0.7, 0.95)
                      }}
                    >
                  {row.map((item) => {
                    const topStyles: Record<number, { border: string; background: string; badge: string; shadow: string }> = {
                      1: {
                        border: "2px solid #D4A741",
                        background: "linear-gradient(135deg, rgba(245,217,138,0.46), rgba(255,255,255,0.9))",
                        badge: "linear-gradient(135deg, #D4A741, #F5D98A)",
                        shadow: "0 14px 30px rgba(212,167,65,0.22)"
                      },
                      2: {
                        border: "2px solid #94A3B8",
                        background: "linear-gradient(135deg, rgba(203,213,225,0.42), rgba(255,255,255,0.88))",
                        badge: "linear-gradient(135deg, #64748B, #CBD5E1)",
                        shadow: "0 12px 26px rgba(100,116,139,0.18)"
                      },
                      3: {
                        border: "2px solid #B45309",
                        background: "linear-gradient(135deg, rgba(217,119,6,0.3), rgba(255,255,255,0.88))",
                        badge: "linear-gradient(135deg, #B45309, #F59E0B)",
                        shadow: "0 12px 26px rgba(180,83,9,0.16)"
                      },
                      4: {
                        border: "2px solid rgba(26,140,142,0.55)",
                        background: "linear-gradient(135deg, rgba(26,140,142,0.18), rgba(255,255,255,0.84))",
                        badge: "linear-gradient(135deg, #1A8C8E, #0F6B6D)",
                        shadow: "0 10px 22px rgba(26,140,142,0.12)"
                      },
                      5: {
                        border: "2px solid rgba(17,65,111,0.46)",
                        background: "linear-gradient(135deg, rgba(17,65,111,0.16), rgba(255,255,255,0.84))",
                        badge: "linear-gradient(135deg, #11416F, #2A5A78)",
                        shadow: "0 10px 22px rgba(17,65,111,0.12)"
                      }
                    };
                    const style = topStyles[item.rank] ?? topStyles[5];
                    const isFirst = item.rank === 1;

                    return (
                      <Box
                        key={`leaderboard-top-${item.rank}-${item.name}`}
                        sx={{
                          width: isFirst ? "min(36rem, 42%)" : "min(30rem, 32%)",
                          minWidth: 0,
                          display: "grid",
                          gridTemplateColumns: "auto minmax(0, 1fr) auto",
                          alignItems: "center",
                          gap: fluid(0.45, 0.75, 1),
                          px: fluid(0.6, 0.85, 1.05),
                          py: fluid(0.35, 0.55, 0.75),
                          borderRadius: 2.5,
                          background: style.background,
                          border: style.border,
                          boxShadow: style.shadow
                        }}
                      >
                        <Box sx={{ width: fluid(1.9, 2.45, 2.7), height: fluid(1.9, 2.45, 2.7), borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 950, background: style.badge, fontSize: fluidFont.body }}>
                          {item.rank}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography component="div" sx={{ fontWeight: 950, color: "#17324d", fontSize: fluidFont.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
                            {item.name}
                          </Typography>
                          <Typography component="div" sx={{ color: "#2A5A78", fontWeight: 800, fontSize: fluidFont.caption, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.team ?? "Chua co doi"}
                          </Typography>
                        </Box>
                        <Typography component="div" sx={{ fontWeight: 950, color: "#0F6B6D", fontSize: fluidFont.body, whiteSpace: "nowrap" }}>
                          {`${item.totalScore ?? 0} diem`}
                        </Typography>
                      </Box>
                    );
                  })}
                    </Box>
                  ))}
                </Box>
              )}

              <Box sx={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: fluid(0.4, 0.7, 1), overflow: "hidden" }}>
                {currentLeaderboardPage.map((item) => {
                  const topStyles: Record<number, { border: string; background: string; badge: string; shadow: string }> = {
                    1: {
                      border: "2px solid #D4A741",
                      background: "linear-gradient(135deg, rgba(245,217,138,0.42), rgba(255,255,255,0.88))",
                      badge: "linear-gradient(135deg, #D4A741, #F5D98A)",
                      shadow: "0 14px 30px rgba(212,167,65,0.22)"
                    },
                    2: {
                      border: "2px solid #94A3B8",
                      background: "linear-gradient(135deg, rgba(203,213,225,0.42), rgba(255,255,255,0.86))",
                      badge: "linear-gradient(135deg, #64748B, #CBD5E1)",
                      shadow: "0 12px 26px rgba(100,116,139,0.18)"
                    },
                    3: {
                      border: "2px solid #B45309",
                      background: "linear-gradient(135deg, rgba(217,119,6,0.28), rgba(255,255,255,0.86))",
                      badge: "linear-gradient(135deg, #B45309, #F59E0B)",
                      shadow: "0 12px 26px rgba(180,83,9,0.16)"
                    },
                    4: {
                      border: "2px solid rgba(26,140,142,0.55)",
                      background: "linear-gradient(135deg, rgba(26,140,142,0.18), rgba(255,255,255,0.82))",
                      badge: "linear-gradient(135deg, #1A8C8E, #0F6B6D)",
                      shadow: "0 10px 22px rgba(26,140,142,0.12)"
                    },
                    5: {
                      border: "2px solid rgba(17,65,111,0.46)",
                      background: "linear-gradient(135deg, rgba(17,65,111,0.16), rgba(255,255,255,0.82))",
                      badge: "linear-gradient(135deg, #11416F, #2A5A78)",
                      shadow: "0 10px 22px rgba(17,65,111,0.12)"
                    }
                  };
                  const style = topStyles[item.rank];
                  const isTopFive = item.rank <= 5;

                  return (
                    <Box
                      key={`leaderboard-page-${item.rank}-${item.name}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "auto minmax(0, 1fr) auto",
                        alignItems: "center",
                        gap: fluid(0.5, 0.8, 1.1),
                        px: isTopFive ? fluid(0.75, 1.05, 1.35) : fluid(0.6, 0.9, 1.2),
                        py: isTopFive ? fluid(0.6, 0.85, 1.05) : fluid(0.45, 0.7, 0.9),
                        borderRadius: 2.5,
                        background: style?.background ?? "rgba(255,255,255,0.58)",
                        border: style?.border ?? "1px solid rgba(111, 165, 207, 0.18)",
                        boxShadow: style?.shadow ?? "none"
                      }}
                    >
                      <Box sx={{ width: isTopFive ? fluid(2.2, 3, 3.2) : fluid(1.9, 2.6, 2.8), height: isTopFive ? fluid(2.2, 3, 3.2) : fluid(1.9, 2.6, 2.8), borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, background: style?.badge ?? "linear-gradient(135deg, #1A8C8E, #0F6B6D)", fontSize: isTopFive ? fluidFont.subtitle : fluidFont.body }}>
                        {item.rank}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="div" sx={{ fontWeight: isTopFive ? 950 : 850, color: "#17324d", fontSize: isTopFive ? fluidFont.h6 : fluidFont.subtitle, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.name}>
                          {item.name}
                        </Typography>
                        <Typography component="div" sx={{ color: isTopFive ? "#2A5A78" : "#4A7A8A", fontWeight: isTopFive ? 800 : 400, fontSize: fluidFont.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.team ?? "Chua co doi"}
                        </Typography>
                      </Box>
                      <Typography component="div" sx={{ fontWeight: 950, color: isTopFive ? "#0F6B6D" : "#11416f", fontSize: isTopFive ? fluidFont.subtitle : fluidFont.body, whiteSpace: "nowrap" }}>
                        {`${item.totalScore ?? 0} diem`}
                      </Typography>
                    </Box>
                  );
                })}
                {(leaderboard?.rankings?.length ?? 0) === 0 && (
                  <Typography component="div" sx={{ color: "#4b647c", fontSize: fluidFont.body }}>
                    Chưa có dữ liệu bảng xếp hạng
                  </Typography>
                )}
              </Box>
            </GlassCard>
          </Box>
        )}

        {false && screen === "leaderboard" && (
          <Box
            sx={{
              width: "100%",
              maxWidth: "min(90vw, 80rem)",
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              gap: fluid(0.4, 0.8, 1.1),
              overflow: "auto",
              minHeight: 0
            }}
          >
            {leaderboard?.rankings?.map((item) => (
              <GlassCard
                key={`${item.rank}-${item.name}`}
                sx={{
                  p: fluid(0.75, 1.3, 1.8),
                  borderRadius: fluid(0.75, 1.2, 1.5),
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
                <Box sx={{ display: "flex", alignItems: "center", gap: fluid(0.6, 1, 1.4) }}>
                  <Box
                    sx={{
                      width: fluid(2.2, 3.5, 3.5),
                      height: fluid(2.2, 3.5, 3.5),
                      aspectRatio: "1 / 1",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: fluidFont.subtitle,
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
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: fluid(0.5, 0.9, 1.25) }}>
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#1A3A4A",
                          fontSize: fluidFont.h5,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {item.name}
                      </Typography>
                      <Typography
                        component="div"
                        sx={{
                          fontWeight: 800,
                          color: "#11416f",
                          fontSize: fluidFont.subtitle,
                          whiteSpace: "nowrap",
                          flexShrink: 0
                        }}
                      >
                        {`${item.totalScore ?? 0} điểm`}
                      </Typography>
                    </Box>
                    <Typography component="div" sx={{ mt: 0.25, color: "#4A7A8A", fontSize: fluidFont.body }}>
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
screen=${screen} (waiting=${String(isWaitingScreen)})
state=${bgLoadState}
ledBackgroundUrl=${String(ledBackgroundUrl ?? "")}
ledWaitingBackgroundUrl=${String(ledWaitingBackgroundUrl ?? "")}
backgroundUrl=${String(backgroundUrl ?? "")}
fallback=${String(ledBackgroundFallback ?? "")}
waitingFallback=${String(ledWaitingBackgroundFallback ?? "")}
resolved=${ledBackgroundImage}`}
        </Box>
      )}
    </ScreenRoot>
  );
};
