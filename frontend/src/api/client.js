import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${apiBase}/api/v1`,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("tf_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("tf_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

// ── Workspaces ────────────────────────────────────────────────────────────────
export const workspacesApi = {
  list: () => api.get("/workspaces/").then((r) => r.data),
  create: (data) => api.post("/workspaces/", data).then((r) => r.data),
  get: (id) => api.get(`/workspaces/${id}`).then((r) => r.data),
  invite: (id, data) => api.post(`/workspaces/${id}/members`, data).then((r) => r.data),
  removeMember: (wsId, userId) => api.delete(`/workspaces/${wsId}/members/${userId}`),
};

// ── Projects ──────────────────────────────────────────────────────────────────
export const projectsApi = {
  list: (wsId) => api.get(`/workspaces/${wsId}/projects/`).then((r) => r.data),
  create: (wsId, data) => api.post(`/workspaces/${wsId}/projects/`, data).then((r) => r.data),
  update: (wsId, projId, data) => api.patch(`/workspaces/${wsId}/projects/${projId}`, data).then((r) => r.data),
  delete: (wsId, projId) => api.delete(`/workspaces/${wsId}/projects/${projId}`),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list: (projId, params) => api.get(`/projects/${projId}/tasks/`, { params }).then((r) => r.data),
  create: (projId, data) => api.post(`/projects/${projId}/tasks/`, data).then((r) => r.data),
  get: (projId, taskId) => api.get(`/projects/${projId}/tasks/${taskId}`).then((r) => r.data),
  update: (projId, taskId, data) => api.patch(`/projects/${projId}/tasks/${taskId}`, data).then((r) => r.data),
  delete: (projId, taskId) => api.delete(`/projects/${projId}/tasks/${taskId}`),
};

// ── Comments ──────────────────────────────────────────────────────────────────
export const commentsApi = {
  list: (taskId) => api.get(`/tasks/${taskId}/comments/`).then((r) => r.data),
  add: (taskId, data) => api.post(`/tasks/${taskId}/comments/`, data).then((r) => r.data),
  edit: (taskId, commentId, data) => api.patch(`/tasks/${taskId}/comments/${commentId}`, data).then((r) => r.data),
  delete: (taskId, commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
};
