import { useContext } from "react";
import { SocketContext } from "../contexts/SocketProvider";

export const useRealtime = () => useContext(SocketContext);
