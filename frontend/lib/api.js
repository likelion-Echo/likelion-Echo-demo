const BASE = "http://localhost:8000";

export function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("echo_token") : null;
}

export function setAuth({ token, name }) {
  localStorage.setItem("echo_token", token);
  localStorage.setItem("echo_name", name);
}

export function logout() {
  localStorage.removeItem("echo_token");
  localStorage.removeItem("echo_name");
  window.location.href = "/login";
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth")) {
    logout();
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "요청에 실패했습니다.");
  return data;
}

export const TYPE_ICON = { diary: "📖", letter: "💌", memo: "📝", etc: "📄" };
export const TYPE_LABEL = { diary: "일기", letter: "편지", memo: "메모", etc: "기타" };
