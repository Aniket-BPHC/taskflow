import { create } from "zustand";

// sessionStorage is per-tab so two accounts can be open simultaneously.
// On first load, fall back to localStorage (persists single-account sessions
// across browser restarts). We NEVER write localStorage after the initial
// login — only sessionStorage — so a second tab logging in as a different
// user cannot corrupt the first tab's token.
const getInitialToken = () =>
  sessionStorage.getItem("tf_token") || localStorage.getItem("tf_token") || null;

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getInitialToken(),

  setAuth: (user, token) => {
    sessionStorage.setItem("tf_token", token);
    // Only write localStorage if this is a fresh login (token changed),
    // not when the hydrator re-confirms the same token on refresh.
    if (token !== get().token || !localStorage.getItem("tf_token")) {
      localStorage.setItem("tf_token", token);
    }
    set({ user, token });
  },

  logout: () => {
    sessionStorage.removeItem("tf_token");
    localStorage.removeItem("tf_token");
    set({ user: null, token: null });
  },
}));
