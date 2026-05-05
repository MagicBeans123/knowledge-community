import { ElMessage } from "element-plus";
import { fetchGraphHistoryDetail } from "../api/graph";
import { useReadingGraphStore } from "../stores/readingGraph";
import { canonicalPageUrl, internalBlogRouterPath } from "./readingGraph";
import { markReadingGraphHistoryNavigation } from "./readingGraphSession";

/**
 * 加载阅读历史详情、恢复侧栏轨迹图（hydrate）、跳转到会话根博客（与从列表点进博客同级路由）
 * @param {import("vue-router").Router} router
 * @param {string|number|null|undefined} historyId
 * @param {{ replace?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function openReadingHistoryAsBlog(router, historyId, opts = {}) {
  const replace = Boolean(opts.replace);
  const hid = String(historyId ?? "").trim();
  if (!hid) {
    ElMessage.warning("缺少历史 id");
    return false;
  }
  try {
    const data = await fetchGraphHistoryDetail(hid);
    const d = data && typeof data === "object" ? data : {};
    let path = "";
    const rid = d.rootBlogId ?? d.rootId;
    if (rid != null && rid !== "") {
      path = `/community/blog/${encodeURIComponent(String(rid))}`;
    } else if (d.rootUrl) {
      path = internalBlogRouterPath(canonicalPageUrl(d.rootUrl));
    }
    if (!path || !String(path).includes("/community/blog/")) {
      ElMessage.warning("无法解析根博客");
      return false;
    }
    useReadingGraphStore().hydrateFromServer(d);
    markReadingGraphHistoryNavigation();
    if (replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
    return true;
  } catch (e) {
    ElMessage.error(e?.message || "加载失败");
    return false;
  }
}
