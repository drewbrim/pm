"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import type { BoardData } from "@/lib/kanban";

type BoardSyncChannel = { apply: ((board: BoardData) => void) | null };

export const BoardSyncContext = createContext<BoardSyncChannel>({ apply: null });

export const useBoardSync = () => useContext(BoardSyncContext);

export const BoardSyncProvider = ({ children }: { children: ReactNode }) => {
  const channel = useRef<BoardSyncChannel>({ apply: null });
  return (
    <BoardSyncContext.Provider value={channel.current}>
      {children}
    </BoardSyncContext.Provider>
  );
};
