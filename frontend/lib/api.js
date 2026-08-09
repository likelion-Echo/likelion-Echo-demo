// 백엔드 주소는 "지금 이 페이지를 연 주소"에서 호스트만 빌려 쓴다.
// 이 코드는 접속한 사람의 브라우저에서 돌기 때문에, localhost로 박아두면
// 친구가 내 IP로 들어와도 친구 자기 PC의 8000번을 찾게 된다.
// 이렇게 두면 192.168.0.71:3000 으로 들어온 사람은 자동으로 192.168.0.71:8000 을 본다.
const API_PORT = process.env.NEXT_PUBLIC_API_PORT || "8000";

function base() {
  // 배포처럼 백엔드가 다른 도메인에 있으면 이 값으로 덮어쓴다.
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE;
  if (typeof window === "undefined") return `http://localhost:${API_PORT}`;
  return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
}

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
  const res = await fetch(base() + path, {
    method,
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(res, path);
}

/** 파일 업로드용. Content-Type은 브라우저가 boundary와 함께 직접 붙인다. */
export async function apiForm(path, formData) {
  const res = await fetch(base() + path, { method: "POST", headers: authHeader(), body: formData });
  return handle(res, path);
}

/** 인증이 필요한 파일을 받아 <audio src>에 쓸 수 있는 URL로 바꾼다. */
export async function apiBlobUrl(path) {
  const res = await fetch(base() + path, { headers: authHeader() });
  if (!res.ok) throw new Error("파일을 불러오지 못했습니다.");
  return URL.createObjectURL(await res.blob());
}

// 타입 아이콘은 app/icons.js의 TypeIcon 컴포넌트가 담당한다 (DESIGN.md §7 — UI 크롬에 이모지 금지).
export const TYPE_LABEL = { diary: "일기", letter: "편지", memo: "메모", voice: "음성", etc: "기타" };
