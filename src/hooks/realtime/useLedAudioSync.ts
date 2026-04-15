import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

export const useLedAudioSync = (socket: Socket | null, audioUrl: string | null | undefined) => {
  const [audioTrigger, setAudioTrigger] = useState(0);
  const ledAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!socket) return;
    const handlePlayAudio = (): void => setAudioTrigger((prev) => prev + 1);
    socket.on("led:play-audio", handlePlayAudio);
    return () => {
      socket.off("led:play-audio", handlePlayAudio);
    };
  }, [socket]);

  useEffect(() => {
    if (!audioUrl || !ledAudioRef.current || audioTrigger === 0) return;
    ledAudioRef.current.currentTime = 0;
    void ledAudioRef.current.play().catch(() => undefined);
  }, [audioTrigger, audioUrl]);

  return { ledAudioRef };
};
