import { useSyncExternalStore } from "react";
import { fileToBase64, validateProfileImageFile } from "@/lib/profile/profile-image";

const USER_STORAGE_KEY = "jakhira:user-store";

type UserStoreState = {
  name: string;
  avatar: string;
  hasInitialized: boolean;
};

type UserStoreActions = {
  setUserName: (name: string) => void;
  setAvatar: (file: File) => Promise<string>;
  removeAvatar: () => void;
  initializeAvatar: () => void;
  initializeUser: (user: { name?: string | null; avatar?: string | null }) => void;
};

type UserStore = UserStoreState & UserStoreActions;

type Listener = () => void;

const defaultState: UserStoreState = {
  name: "Siddharth Jakhar",
  avatar: "",
  hasInitialized: false,
};

const listeners = new Set<Listener>();
let state: UserStoreState = defaultState;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function persistState(nextState: UserStoreState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    USER_STORAGE_KEY,
    JSON.stringify({
      name: nextState.name,
      avatar: nextState.avatar,
    }),
  );
}

function setState(updater: Partial<UserStoreState> | ((current: UserStoreState) => Partial<UserStoreState>)) {
  const patch = typeof updater === "function" ? updater(state) : updater;
  state = { ...state, ...patch };
  persistState(state);
  emitChange();
}

const actions: UserStoreActions = {
  setUserName: (name) => {
    setState({ name: name.trim() || defaultState.name });
  },
  setAvatar: async (file) => {
    validateProfileImageFile(file);
    const avatar = await fileToBase64(file);
    setState({ avatar });
    return avatar;
  },
  removeAvatar: () => {
    setState({ avatar: "" });
  },
  initializeAvatar: () => {
    if (typeof window === "undefined") {
      state = { ...state, hasInitialized: true };
      return;
    }

    const storedValue = window.localStorage.getItem(USER_STORAGE_KEY);

    if (!storedValue) {
      state = { ...state, hasInitialized: true };
      emitChange();
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as Partial<Pick<UserStoreState, "name" | "avatar">>;
      state = {
        ...state,
        name: parsed.name?.trim() || state.name,
        avatar: parsed.avatar?.trim() || "",
        hasInitialized: true,
      };
      emitChange();
    } catch {
      state = { ...state, hasInitialized: true };
      emitChange();
    }
  },
  initializeUser: ({ name, avatar }) => {
    const hasPersistedAvatar = state.avatar.trim().length > 0;

    setState((current) => ({
      name: name?.trim() || current.name || defaultState.name,
      avatar: hasPersistedAvatar ? current.avatar : avatar?.trim() || "",
      hasInitialized: true,
    }));
  },
};

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): UserStore {
  return {
    ...state,
    ...actions,
  };
}

export function useUserStore<T>(selector: (store: UserStore) => T): T {
  return useSyncExternalStore(subscribe, () => selector(getSnapshot()), () => selector(getSnapshot()));
}

export const userStore = {
  getState: getSnapshot,
};
