import http from "./http";

/**
 * 记录一次跳转（后端写 Redis 等）
 * `from` → `to` 为跳转方向（起点页 → 目标页）；`title` 为 **目标页（to）** 博文标题，站外为 `null`，缺省按空字符串。
 * `id`：首次建根（`from === null`）时传 `null`；后续传后端 Long，**以字符串**发送以免超过 JS 安全整数丢精度。
 * @param {{ from?: string | null, to?: string, title?: string | null, id?: string | number | null }} body
 */
export function postGraphEdge(body) {
  const raw = body && typeof body === "object" ? body : {};
  const from =
    "from" in raw ? (raw.from === "" || raw.from === undefined ? null : raw.from) : null;
  const to = raw.to != null && raw.to !== "" ? String(raw.to) : "";
  let title = "";
  if ("title" in raw && raw.title === null) {
    title = null;
  } else if ("title" in raw && raw.title !== undefined && raw.title !== null) {
    title = String(raw.title);
  }
  /** @type {{ from: typeof from, to: string, title: typeof title, id?: string | null }} */
  const payload = { from, to, title };
  if ("id" in raw) {
    if (raw.id === null || raw.id === undefined) {
      payload.id = null;
    } else if (raw.id !== "") {
      payload.id = String(raw.id).trim();
    }
  }
  return http.post("/graph/edge", payload);
}

/**
 * 阅读历史列表（分页参数与后端对齐；支持 page/size）
 * @param {{ page?: number, size?: number } & Record<string, string | number>} params
 */
export function fetchGraphHistoryList(params = {}) {
  const q = new URLSearchParams();
  const page = params.page ?? 1;
  const size = params.size ?? 10;
  q.set("page", String(page));
  q.set("size", String(size));
  Object.keys(params).forEach((k) => {
    if (k === "page" || k === "size") return;
    if (params[k] != null && params[k] !== "") q.set(k, String(params[k]));
  });
  return http.get(`/graph/history?${q.toString()}`);
}

/**
 * 单条阅读历史完整图
 * @param {string|number} id
 */
export function fetchGraphHistoryDetail(id) {
  return http.get(`/graph/history/${encodeURIComponent(id)}`);
}
