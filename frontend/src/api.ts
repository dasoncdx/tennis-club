const BASE = "/api";

function token(): string {
  return localStorage.getItem("token") || "";
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const t = token();
  if (t) h["token"] = t;
  return h;
}

async function get(path: string) {
  const res = await fetch(BASE + path, { headers: headers() });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "请求失败"); }
  return res.json();
}

async function post(path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: "POST", headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "请求失败"); }
  return res.json();
}

async function del(path: string) {
  const res = await fetch(BASE + path, { method: "DELETE", headers: headers() });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "请求失败"); }
  return res.json();
}

async function put(path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: "PUT", headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { localStorage.clear(); window.location.reload(); }
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || "请求失败"); }
  return res.json();
}

// Auth
export const authApi = {
  login: (phone: string, password: string) => post("/auth/login", { phone, password }),
  register: (data: unknown) => post("/auth/register", data),
  me: () => get("/auth/me"),
};

// Students
export const studentApi = {
  list: (keyword = "") => get(`/students?keyword=${encodeURIComponent(keyword)}`),
  get: (id: number) => get(`/students/${id}`),
  update: (id: number, data: unknown) => put(`/students/${id}`, data),
  delete: (id: number) => del(`/students/${id}`),
  dormant: (days = 14) => get(`/students/dormant?days=${days}`),
  coaches: () => get("/students/coaches"),
  dashboard: () => get("/students/dashboard"),
  coachStudents: () => get("/students/my"),
};

// Courses & Bookings
export const courseApi = {
  listPackages: (studentId = 0) => get(`/courses/packages?student_id=${studentId}`),
  createPackage: (data: unknown) => post("/courses/packages", data),
  listBookings: (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return get(`/courses/bookings?${qs}`);
  },
  createBooking: (data: unknown) => post("/courses/bookings", data),
  updateBooking: (id: number, data: unknown) => put(`/courses/bookings/${id}`, data),
  confirmBooking: (id: number, courtInfo: string) => post(`/courses/bookings/${id}/confirm?court_info=${encodeURIComponent(courtInfo)}`),
  createRecord: (data: unknown) => post("/courses/records", data),
  listRecords: (studentId = 0) => get(`/courses/records?student_id=${studentId}`),
};
