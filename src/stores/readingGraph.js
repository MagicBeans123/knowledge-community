import { defineStore } from "pinia";
import { canonicalPageUrl, isInternalBlogDetailUrl } from "../utils/readingGraph";

function normUrl(u) {
  if (u == null || u === "") return "";
  return canonicalPageUrl(u);
}

/** 有向边：保留调用顺序 u→v（仅做 URL 规范化） */
function normalizeDirectedEndpoints(a, b) {
  const u = normUrl(a);
  const v = normUrl(b);
  if (!u || !v) return null;
  return { u, v };
}

function directedEdgeKey(u, v) {
  return `${u}\n${v}`;
}

/**
 * 当前标签内打开的博文轨迹；离开博文页路由会清空。历史详情 hydrateFromServer 会整体覆盖。
 * 边为有向简单图：有序对 (u→v) 至多一条，允许自环。
 */
export const useReadingGraphStore = defineStore("readingGraph", {
  state: () => ({
    /** @type {Record<string, { url: string, title: string, external?: boolean }>} */
    nodeMap: {},
    /** @type {{ u: string, v: string, title: string }[]} u→v 为跳转方向 */
    edges: []
  }),
  getters: {
    nodes: (s) => Object.values(s.nodeMap)
  },
  actions: {
    reset() {
      this.nodeMap = {};
      this.edges = [];
    },
    /**
     * @param {string} url
     * @param {string} [title]
     * @param {{ external?: boolean }} [opts] external=true 表示非博客详情等「仅圆圈」结点；有站内博客标题时可清除
     */
    upsertNode(url, title = "", opts = {}) {
      const k = normUrl(url);
      if (!k) return;
      const prev = this.nodeMap[k] || {};
      const merged = (title && String(title).trim()) || prev.title || "";
      let external = prev.external === true;
      if (opts && opts.external === true) external = true;
      if (opts && opts.external === false) external = false;
      if (merged && isInternalBlogDetailUrl(k)) external = false;
      this.nodeMap[k] = {
        url: k,
        title: merged,
        external
      };
    },
    /** 是否已存在同向边 u→v（含自环） */
    hasDirectedEdge(a, b) {
      const p = normalizeDirectedEndpoints(a, b);
      if (!p) return false;
      const k = directedEdgeKey(p.u, p.v);
      return this.edges.some((e) => directedEdgeKey(e.u, e.v) === k);
    },
    /**
     * 添加有向边 u→v；同向已存在则不变。
     * @returns {boolean} 是否新插入了一条边
     */
    addDirectedEdge(a, b, edgeTitle = "") {
      const p = normalizeDirectedEndpoints(a, b);
      if (!p) return false;
      if (this.hasDirectedEdge(p.u, p.v)) return false;
      this.upsertNode(p.u, "");
      this.upsertNode(p.v, "");
      this.edges.push({ u: p.u, v: p.v, title: edgeTitle || "" });
      return true;
    },
    /**
     * 兼容旧调用：仅记录「到达 to」而无起点时，只 upsert 结点、不增加边。
     * @returns {boolean} 是否新插入了一条边（from 有效时）
     */
    addLocalEdge(from, to, edgeTitle = "") {
      const t = normUrl(to);
      if (!t) return false;
      if (from == null || from === "") {
        this.upsertNode(t, "");
        return false;
      }
      return this.addDirectedEdge(from, to, edgeTitle);
    },
    hydrateFromServer(payload) {
      this.reset();
      const nodes = payload?.nodes ?? [];
      const edges = payload?.edges ?? [];
      for (const n of nodes) {
        const url = n.url ?? n.id ?? "";
        this.upsertNode(url, n.title ?? "", {
          external: Boolean(n.external)
        });
      }
      for (const e of edges) {
        const rawTo = e.to ?? e.v;
        const rawFrom = e.from ?? e.u;
        const to = normUrl(rawTo);
        if (!to) continue;
        const from = rawFrom == null || rawFrom === "" ? null : normUrl(rawFrom);
        if (from) {
          this.addDirectedEdge(from, to, e.title ?? "");
        } else {
          this.upsertNode(to, e.title ?? "");
        }
      }
    }
  }
});
