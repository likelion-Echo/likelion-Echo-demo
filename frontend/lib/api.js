// 배포 시 NEXT_PUBLIC_API_BASE 로 백엔드 주소를 지정한다 (빌드 시점에 값이 박힌다).
const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

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

function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res, path) {
  if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/auth")) {
    logout();
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "요청에 실패했습니다.");
  return data;
}

export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res, path);
}

/** 파일 업로드용. Content-Type은 브라우저가 boundary와 함께 직접 붙인다. */
export async function apiForm(path, formData) {
  const res = await fetch(BASE + path, { method: "POST", headers: authHeader(), body: formData });
  return handle(res, path);
}

/** 인증이 필요한 파일을 받아 <audio src>에 쓸 수 있는 URL로 바꾼다. */
export async function apiBlobUrl(path) {
  const res = await fetch(BASE + path, { headers: authHeader() });
  if (!res.ok) throw new Error("파일을 불러오지 못했습니다.");
  return URL.createObjectURL(await res.blob());
}

export const TYPE_ICON = { diary: "📖", letter: "💌", memo: "📝", voice: "🎤", etc: "📄" };
export const TYPE_LABEL = { diary: "일기", letter: "편지", memo: "메모", voice: "음성", etc: "기타" };
