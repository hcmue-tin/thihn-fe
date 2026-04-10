import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  AnswerRevealPayload,
  ContestScreen,
  ContestState,
  LeaderboardPayload,
  QuestionOption,
  QuestionPayload,
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
  reveal: AnswerRevealPayload | null;
  teamScore: TeamScorePayload | null;
  leaderboard: LeaderboardPayload | null;
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
  reveal: null,
  teamScore: null,
  leaderboard: null,
  latestAnswerResult: null,
  connectSocket: () => undefined,
  disconnectSocket: () => undefined,
  emitWithAck: async () => ({ success: false, message: "Socket not connected" })
};

export const SocketContext = createContext<RealtimeStore>(initialStore);

type SocketProviderProps = {
  children: ReactNode;
};

export const SocketProvider = ({ children }: SocketProviderProps) => {
  const [store, setStore] = useState<RealtimeStore>(initialStore);
  const socketRef = useRef<Socket | null>(null);

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

    socket.on("contest:sync-state", ({ fullState }: { fullState: ContestState }) => {
      setStore((prev) => ({
        ...prev,
        fullState,
        screen: fullState.screen,
        countdownEndsAt: fullState.countdownEndAt ? new Date(fullState.countdownEndAt).getTime() : null
      }));
    });

    socket.on("screen:change", ({ screen }: { screen: ContestScreen }) => {
      setStore((prev) => ({
        ...prev,
        screen,
        fullState: prev.fullState
          ? {
              ...prev.fullState,
              screen
            }
          : prev.fullState
      }));
    });

    socket.on(
      "question:show",
      ({ question, options, countdownSeconds }: { question: QuestionPayload; options: QuestionOption[]; countdownSeconds: number }) => {
        setStore((prev) => ({
          ...prev,
          question,
          options,
          countdownSeconds,
          reveal: null
        }));
      }
    );

    socket.on("countdown:start", ({ endsAt, seconds }: { endsAt: number; seconds: number }) => {
      setStore((prev) => ({
        ...prev,
        countdownEndsAt: endsAt,
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

    socket.on("leaderboard:show", (payload: LeaderboardPayload) => {
      setStore((prev) => ({ ...prev, leaderboard: payload }));
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
    const socketBaseUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof import.meta.env.VITE_API_BASE_URL === "string" ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "") : "") ||
      "http://localhost:5126";
    const socket = io(socketBaseUrl, {
      transports: ["websocket"],
      auth: {
        token: auth.token,
        clientType: auth.role === "led" ? "led" : "admin"
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
        socketRef.current.emit(event, payload, (response: { success: boolean; message?: string }) => {
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
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
