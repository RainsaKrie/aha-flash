"use client";

import { create } from "zustand";
import type { Message } from "@/types/chat";
import type { UISchema } from "@/types/schema";
import type { UserState } from "@/types/state";

interface AppStore {
  userId: string | null;
  userState: UserState | null;
  messages: Message[];
  currentSchema: UISchema | null;
  isLoading: boolean;
  errorMessage: string | null;
  setUserId: (userId: string) => void;
  setUserState: (userState: UserState) => void;
  addMessage: (message: Message) => void;
  setCurrentSchema: (schema: UISchema | null) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  userId: null,
  userState: null,
  messages: [],
  currentSchema: null,
  isLoading: false,
  errorMessage: null,
  setUserId: (userId) => set({ userId }),
  setUserState: (userState) => set({ userState, userId: userState.user_id }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setCurrentSchema: (currentSchema) => set({ currentSchema }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (errorMessage) => set({ errorMessage }),
}));
