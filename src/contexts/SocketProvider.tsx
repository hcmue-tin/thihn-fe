import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  AnswerRevealPayload,
  AnswerResultsPayload,
  ContestScreen,
  ContestState,
  LeaderboardPayload,
  QuestionOption,
  QuestionPayload,
  TeamListPayload,
  TeamScorePayload
} from "../types/realtime";

type RealtimeStore = {
  isConnected: boolean;
  socket: Socket | null;
  role: "admin" | "contestant" | "led" | null;
  screen: ContestScreen;
  fullState: ContestState | null;
  question: QuestionPayload | null;
  options: QuestionOption[];
  countdownEndsAt: number | null;
  countdownSeconds: number;
  rulesContent: string | null;
  backgroundUrl: string | null;
  ledBackgroundUrl: string | null;
  ledWaitingBackgroundUrl: string | null;
  contestantBackgroundUrl: string | null;
  questionShowSeq: number;
  ledSolutionVisible: boolean;
  reveal: AnswerRevealPayload | null;
  teamList: TeamListPayload | null;
  teamScore: TeamScorePayload | null;
  leaderboard: LeaderboardPayload | null;
  answerResults: AnswerResultsPayload | null;
  latestAnswerResult: { questionId: number; isCorrect: boolean; scoreEarned: number; totalScore: number } | null;
  connectSocket: (auth: { token: string; role: "admin" | "contestant" | "led" }) => void;
  disconnectSocket: () => void;
  emitWithAck: <T extends object>(event: string, payload: T) => Promise<{ success: boolean; message?: string }>;
};

const initialStore: RealtimeStore = {
  isConnected: false,
  socket: null,
  role: null,
  screen: "idle",
  fullState: null,
  question: null,
  options: [],
  countdownEndsAt: null,
  countdownSeconds: 0,
  rulesContent: null,
  backgroundUrl: null,
  ledBackgroundUrl: null,
  ledWaitingBackgroundUrl: null,
  contestantBackgroundUrl: null,
  questionShowSeq: 0,
  ledSolutionVisible: false,
  reveal: null,
  teamList: null,
  teamScore: null,
  leaderboard: null,
  answerResults: null,
  latestAnswerResult: null,
  connectSocket: () => undefined,
  disconnectSocket: () => undefined,
  emitWithAck: async () => ({ success: false, message: "Socket not connected" })
};

export const SocketContext = createContext<RealtimeStore>(initialStore);

const toLocalCountdownEnd = (serverEndsAt: number, serverNow?: number): number => {
  if (!serverNow) return serverEndsAt;
  return Date.now() + Math.max(0, serverEndsAt - serverNow);
};

type SocketProviderProps = {
  children: ReactNode;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [store, setStore] = useState<RealtimeStore>(initialStore);
  const socketRef = useRef<Socket | null>(null);
  const applyVisualData = (
    source: {
      rulesContent?: string | null;
      backgroundUrl?: string | null;
      ledBackgroundUrl?: string | null;
      ledWaitingBackgroundUrl?: string | null;
      contestantBackgroundUrl?: string | null;
    },
    prev: RealtimeStore
  ) => ({
    rulesContent: source.rulesContent ?? prev.rulesContent,
    backgroundUrl: source.backgroundUrl ?? prev.backgroundUrl,
    ledBackgroundUrl: source.ledBackgroundUrl ?? source.backgroundUrl ?? prev.ledBackgroundUrl,
    ledWaitingBackgroundUrl: source.ledWaitingBackgroundUrl !== undefined ? source.ledWaitingBackgroundUrl : prev.ledWaitingBackgroundUrl,
    contestantBackgroundUrl: source.contestantBackgroundUrl ?? source.backgroundUrl ?? prev.contestantBackgroundUrl
  });

  const disconnectSocket = useCallback((): void => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStore((prev) => ({ ...prev, isConnected: false, socket: null, role: null }));
  }, []);

  const bindSocketEvents = useCallback((socket: Socket): void => {
    socket.on("connect", () => {
      setStore((prev) => ({ ...prev, isConnected: true, socket }));
    });

    socket.on("disconnect", () => {
      setStore((prev) => ({ ...prev, isConnected: false }));
    });

    socket.on("connect_error", (error) => {
      setStore((prev) => ({ ...prev, isConnected: false }));
      const message = error instanceof Error ? error.message : "";
      if (message === "Invalid auth token" || message === "Missing auth token") {
        window.dispatchEvent(new CustomEvent("app:unauthorized"));
      }
    });

    socket.on("contest:sync-state", ({ fullState, serverNow }: { fullState: ContestState; serverNow?: number }) => {
      const serverEndsAt = fullState.countdownEndAt ? new Date(fullState.countdownEndAt).getTime() : null;
      setStore((prev) => ({
        ...prev,
        fullState,
        screen: fullState.screen,
        countdownEndsAt: serverEndsAt ? toLocalCountdownEnd(serverEndsAt, serverNow) : null,
        latestAnswerResult: fullState.screen === "idle" ? null : prev.latestAnswerResult,
        ...applyVisualData(fullState, prev)
      }));
    });

    socket.on(
      "screen:change",
      ({
        screen,
        data
      }: {
        screen: ContestScreen;
        data?: {
          rulesContent?: string | null;
          backgroundUrl?: string | null;
          ledBackgroundUrl?: string | null;
          contestantBackgroundUrl?: string | null;
        };
      }) => {
        setStore((prev) => ({
          ...prev,
          screen,
          latestAnswerResult: screen === "idle" ? null : prev.latestAnswerResult,
          ...applyVisualData(data ?? {}, prev),
          fullState: prev.fullState
            ? {
                ...prev.fullState,
                screen,
                rulesContent: data?.rulesContent ?? prev.fullState.rulesContent,
                backgroundUrl: data?.backgroundUrl ?? prev.fullState.backgroundUrl,
                ledBackgroundUrl: data?.ledBackgroundUrl ?? data?.backgroundUrl ?? prev.fullState.ledBackgroundUrl,
                ledWaitingBackgroundUrl: data?.ledWaitingBackgroundUrl !== undefined ? data.ledWaitingBackgroundUrl : prev.fullState.ledWaitingBackgroundUrl,
                contestantBackgroundUrl: data?.contestantBackgroundUrl ?? data?.backgroundUrl ?? prev.fullState.contestantBackgroundUrl
              }
            : prev.fullState
        }));
      }
    );

    socket.on(
      "question:show",
      ({
        question,
        options,
        countdownSeconds
      }: {
        question: QuestionPayload;
        options: QuestionOption[];
        countdownSeconds: number;
        shownAt?: number;
      }) => {
        setStore((prev) => ({
          ...prev,
          question,
          options,
          countdownSeconds,
          reveal: null,
          answerResults: null,
          latestAnswerResult: null,
          questionShowSeq: prev.questionShowSeq + 1,
          ledSolutionVisible: false
        }));
      }
    );

    socket.on("led:show-solution", () => {
      setStore((prev) => ({ ...prev, ledSolutionVisible: true }));
    });

    socket.on("led:hide-solution", () => {
      setStore((prev) => ({ ...prev, ledSolutionVisible: false }));
    });

    socket.on("countdown:start", ({ endsAt, seconds, serverNow }: { endsAt: number; seconds: number; serverNow?: number }) => {
      setStore((prev) => ({
        ...prev,
        countdownEndsAt: toLocalCountdownEnd(endsAt, serverNow),
        countdownSeconds: seconds
      }));
    });

    socket.on("countdown:end", () => {
      setStore((prev) => ({
        ...prev,
        countdownEndsAt: null
      }));
    });

    socket.on("answer:reveal", (payload: AnswerRevealPayload) => {
      setStore((prev) => ({ ...prev, reveal: payload }));
    });

    socket.on("team-score:show", (payload: TeamScorePayload) => {
      setStore((prev) => ({ ...prev, teamScore: payload }));
    });

    socket.on("team-list:show", (payload: TeamListPayload) => {
      setStore((prev) => ({ ...prev, teamList: payload }));
    });

    socket.on("leaderboard:show", (payload: LeaderboardPayload) => {
      setStore((prev) => ({ ...prev, leaderboard: payload }));
    });

    socket.on("answer-results:show", (payload: AnswerResultsPayload) => {
      setStore((prev) => ({ ...prev, answerResults: payload }));
    });

    socket.on(
      "contestant:answer-result",
      (payload: { questionId: number; isCorrect: boolean; scoreEarned: number; totalScore: number }) => {
        setStore((prev) => ({ ...prev, latestAnswerResult: payload }));
      }
    );
  }, []);

  const connectSocket = useCallback((auth: { token: string; role: "admin" | "contestant" | "led" }): void => {
    disconnectSocket();
    const socketBaseUrl = (() => {
      if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL as string;
      const apiBase = typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL : "";
      const derived = apiBase.replace(/\/api\/?$/, "");
      if (derived && !derived.startsWith("/")) return derived;
      return window.location.origin;
    })();
    const socket = io(socketBaseUrl, {
      // NAS/reverse-proxy setups may not support websocket upgrade reliably.
      // Keep websocket first, but allow polling fallback.
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
      timeout: 8000,
      auth: {
        token: auth.token,
        clientType: auth.role === "led" ? "led" : undefined
      }
    });
    socketRef.current = socket;
    setStore((prev) => ({ ...prev, role: auth.role }));
    bindSocketEvents(socket);
  }, [bindSocketEvents, disconnectSocket]);

  const emitWithAck = useCallback(
    <T extends object>(event: string, payload: T): Promise<{ success: boolean; message?: string }> =>
      new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, message: "Socket not connected" });
          return;
        }
        let settled = false;
        const timeoutId = window.setTimeout(() => {
          settled = true;
          resolve({ success: false, message: "Mất kết nối máy chủ, vui lòng chờ kết nối lại rồi thử lại" });
        }, 8000);
        socketRef.current.emit(event, payload, (response: { success: boolean; message?: string }) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(response);
        });
      }),
    []
  );

  useEffect(() => () => disconnectSocket(), []);

  const value = useMemo(
    () => ({ ...store, connectSocket, disconnectSocket, emitWithAck }),
    [store]
  );
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
