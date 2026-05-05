/**
 * 阅读轨迹辅助（保持简单）：
 * - 「从文内 Markdown 链到下一篇」打标，博文页据此不再重复 POST from:null；
 * - popstate → 后退/前进在博文之间，不切新根；
 * - 侧栏轨迹图结点点击：`markReadingGraphPanelNavigation`，避免 fetchBlog 误判为「换篇」而 reset；
 * - 阅读轨迹点进根博客：`markReadingGraphHistoryNavigation`，已 hydrate，不得 reset； */

const KEY_FROM_MARKDOWN = "kc_graph_from_markdown";
/** 左侧轨迹图结点点击跳转：保持已有 nodes/edges，不得 reset */
const KEY_FROM_PANEL = "kc_graph_from_panel";
/** 阅读轨迹列表/旧链接直接进入根博客：已 hydrate 整张图，不得 reset */
const KEY_FROM_HISTORY = "kc_graph_from_history";
const KEY_POP_PENDING = "kc_graph_pop_pending";
const KEY_VIA_POP = "kc_graph_via_pop";
const KEY_NAV_FROM_NAME = "kc_graph_nav_from_name";
const KEY_NAV_FROM_BLOG_ID = "kc_graph_nav_from_blog_id";

let popInstalled = false;

if (typeof window !== "undefined" && !popInstalled) {
  popInstalled = true;
  window.addEventListener(
    "popstate",
    () => {
      sessionStorage.setItem(KEY_POP_PENDING, "1");
    },
    { passive: true }
  );
}

export function syncReadingGraphPopNavigationFlag() {
  if (typeof window === "undefined") return;
  const pending = sessionStorage.getItem(KEY_POP_PENDING) === "1";
  sessionStorage.removeItem(KEY_POP_PENDING);
  if (pending) sessionStorage.setItem(KEY_VIA_POP, "1");
}

export function stashReadingGraphNavigationFrom(routeLike) {
  if (typeof window === "undefined") return;
  const from = routeLike || {};
  sessionStorage.setItem(KEY_NAV_FROM_NAME, from.name ? String(from.name) : "");
  const id = from.params?.id;
  sessionStorage.setItem(KEY_NAV_FROM_BLOG_ID, id != null ? String(id) : "");
}

export function readStaleReadingGraphNavigationFrom() {
  if (typeof window === "undefined") {
    return { name: "", blogId: "" };
  }
  return {
    name: sessionStorage.getItem(KEY_NAV_FROM_NAME) || "",
    blogId: sessionStorage.getItem(KEY_NAV_FROM_BLOG_ID) || ""
  };
}

/** 从文内 Markdown 点进下一篇前调用 */
export function markReadingGraphMarkdownNavigation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_POP_PENDING);
  sessionStorage.removeItem(KEY_VIA_POP);
  sessionStorage.setItem(KEY_FROM_MARKDOWN, "1");
}

export function consumeReadingGraphMarkdownNavigation() {
  if (typeof window === "undefined") return false;
  const ok = sessionStorage.getItem(KEY_FROM_MARKDOWN) === "1";
  sessionStorage.removeItem(KEY_FROM_MARKDOWN);
  return ok;
}

/** 侧栏轨迹图内点击「跳到已访问过的博文」前调用 */
export function markReadingGraphPanelNavigation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_POP_PENDING);
  sessionStorage.removeItem(KEY_VIA_POP);
  sessionStorage.setItem(KEY_FROM_PANEL, "1");
}

export function consumeReadingGraphPanelNavigation() {
  if (typeof window === "undefined") return false;
  const ok = sessionStorage.getItem(KEY_FROM_PANEL) === "1";
  sessionStorage.removeItem(KEY_FROM_PANEL);
  return ok;
}

/** 在阅读轨迹跳转根博客页面前调用（与侧栏同属「已有图」） */
export function markReadingGraphHistoryNavigation() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY_POP_PENDING);
  sessionStorage.removeItem(KEY_VIA_POP);
  sessionStorage.setItem(KEY_FROM_HISTORY, "1");
}

export function consumeReadingGraphHistoryNavigation() {
  if (typeof window === "undefined") return false;
  const ok = sessionStorage.getItem(KEY_FROM_HISTORY) === "1";
  sessionStorage.removeItem(KEY_FROM_HISTORY);
  return ok;
}

/** 若为 true：本次是因浏览器后退/前进触发的路由 */
export function consumeReadingGraphPopNavigation() {
  if (typeof window === "undefined") return false;
  const ok = sessionStorage.getItem(KEY_VIA_POP) === "1";
  sessionStorage.removeItem(KEY_VIA_POP);
  return ok;
}
