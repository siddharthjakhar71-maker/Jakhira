import { useSyncExternalStore } from "react";
import { fileToBase64, validateProfileImageFile } from "@/lib/profile/profile-image";

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
  resetUserState: () => void;
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

function setState(updater: Partial<UserStoreState> | ((current: UserStoreState) => Partial<UserStoreState>)) {
  const patch = typeof updater === "function" ? updater(state) : updater;
  state = { ...state, ...patch };
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
    state = { ...state, hasInitialized: true };
    emitChange();
  },
  initializeUser: ({ name, avatar }) => {
    setState({
      name: name?.trim() || defaultState.name,
      avatar: avatar?.trim() || "",
      hasInitialized: true,
    });
  },
  resetUserState: () => {
    setState({
      name: defaultState.name,
      avatar: "",
      hasInitialized: true,
    });
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
