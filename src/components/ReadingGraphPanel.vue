<template>
  <div class="rg-root">
    <div class="rg-head">
      <span class="rg-title">阅读轨迹</span>
    </div>
    <div v-if="nodesLen" class="rg-scroll">
      <div ref="hostRef" class="rg-mermaid-host" role="img" aria-label="阅读轨迹图" />
      <p v-if="renderError" class="rg-err">{{ renderError }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import mermaid from "mermaid";
import { canonicalPageUrl, isInternalBlogDetailUrl } from "../utils/readingGraph";

const props = defineProps({
  nodes: { type: Array, default: () => [] },
  edges: { type: Array, default: () => [] },
  selectedUrl: { type: String, default: "" }
});

const emit = defineEmits(["node-click"]);

const hostRef = ref(null);
const renderError = ref("");

let mermaidInited = false;
let renderSerial = 0;

function ensureMermaidInit() {
  if (mermaidInited) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "basis",
      padding: 10
    }
  });
  mermaidInited = true;
}

function normalizeSel(u) {
  return canonicalPageUrl(u);
}

/** 有向边：兼容 { u, v } 与 { from, to }，均为起点→终点 */
function parseEdgeEndpoints(e) {
  if (!e) return { a: "", b: "" };
  if (e.u != null || e.v != null) {
    return { a: normalizeSel(e.u), b: normalizeSel(e.v) };
  }
  return {
    a: e.from ? normalizeSel(e.from) : "",
    b: normalizeSel(e.to)
  };
}

function midForUrl(urlKey) {
  let h = 2166136261;
  const s = String(urlKey || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `n${h.toString(36)}`;
}

function escapeMermaidLabel(raw) {
  return String(raw || "…")
    .replace(/\\/g, "/")
    .replace(/"/g, "'")
    .replace(/\n/g, " ")
    .replace(/[[\]#]/g, " ")
    .trim()
    .slice(0, 48) || "…";
}

function displayLabel(nodeLike) {
  const t = String(nodeLike.title || "").trim();
  const softMax = 22;
  if (t) return t.length > softMax ? `${t.slice(0, softMax - 2)}…` : t;
  try {
    const u = new URL(nodeLike.url);
    const m = (u.pathname || "").match(/\/community\/blog\/([^/]+)\/?$/i);
    if (m) return decodeURIComponent(m[1]).slice(0, softMax + 4);
  } catch {
    /* ignore */
  }
  return "…";
}

const graphNodesResolved = computed(() => {
  const byUrl = new Map();
  for (const node of props.nodes || []) {
    const k = normalizeSel(node.url);
    if (!k) continue;
    const prev = byUrl.get(k);
    const title = (node.title && String(node.title).trim()) || prev?.title || "";
    const external =
      Boolean(node.external) ||
      Boolean(prev?.external) ||
      (!title && !isInternalBlogDetailUrl(k));
    byUrl.set(k, { url: k, title, external });
  }
  const ordered = [];
  const seenUrl = new Set();
  function pushBare(k) {
    if (!k || seenUrl.has(k)) return;
    seenUrl.add(k);
    ordered.push(
      byUrl.get(k) || {
        url: k,
        title: "",
        external: !isInternalBlogDetailUrl(k)
      }
    );
  }
  function touchEdgeEndpoints(edge) {
    const { a, b } = parseEdgeEndpoints(edge);
    if (b) {
      if (!byUrl.has(b)) byUrl.set(b, { url: b, title: "", external: !isInternalBlogDetailUrl(b) });
    }
    if (a) {
      if (!byUrl.has(a)) byUrl.set(a, { url: a, title: "", external: !isInternalBlogDetailUrl(a) });
    }
  }
  for (const e of props.edges || []) touchEdgeEndpoints(e);
  for (const e of props.edges || []) {
    const { a, b } = parseEdgeEndpoints(e);
    if (a) pushBare(a);
    if (b) pushBare(b);
  }
  for (const [, meta] of byUrl) pushBare(normalizeSel(meta.url));
  return ordered;
});

const nodesLen = computed(() => graphNodesResolved.value.length);

function buildMermaidDefinition(list, edgesRaw, selectedCanon) {
  const urlToMid = new Map();
  const midToUrl = new Map();
  for (const node of list) {
    const url = normalizeSel(node.url);
    if (!url) continue;
    const mid = midForUrl(url);
    urlToMid.set(url, mid);
    midToUrl.set(mid, url);
  }

  const sel = normalizeSel(selectedCanon);
  const selMid = sel ? urlToMid.get(sel) : "";

  const lines = ["flowchart LR"];
  const hasCircle = list.some((node) => Boolean(node.external));
  if (hasCircle) {
    lines.push(
      "classDef kcExt fill:#f4f6f3,stroke:#8a9a78,stroke-width:2px,color:#4d5c42"
    );
  }
  for (const node of list) {
    const url = normalizeSel(node.url);
    const mid = urlToMid.get(url);
    if (!mid) continue;
    const circle = Boolean(node.external);
    if (circle) {
      lines.push(`${mid}((○))`);
      if (mid !== selMid) lines.push(`class ${mid} kcExt`);
    } else {
      lines.push(`${mid}["${escapeMermaidLabel(displayLabel(node))}"]`);
    }
  }

  const seenDirected = new Set();
  for (const e of edgesRaw || []) {
    const { a, b } = parseEdgeEndpoints(e);
    if (!a || !b) continue;
    const midA = urlToMid.get(a);
    const midB = urlToMid.get(b);
    if (!midA || !midB) continue;
    const pk = `${a}\n${b}`;
    if (seenDirected.has(pk)) continue;
    seenDirected.add(pk);
    lines.push(`${midA} --> ${midB}`);
  }

  if (selMid) {
    lines.push(
      "classDef kcSel fill:#fff7e0,stroke:#4d5c42,stroke-width:3px,color:#1f1f1f"
    );
    lines.push(`class ${selMid} kcSel`);
  }

  return { text: lines.join("\n"), midToUrl };
}

function attachNodeClicks(rootEl, midToUrl) {
  const svg = rootEl.querySelector("svg");
  if (!svg) return;
  const mids = new Set(midToUrl.keys());
  svg.querySelectorAll("g.node").forEach((g) => {
    const id = g.id || "";
    const parts = id.split("-");
    const mid = parts.find((p) => mids.has(p));
    if (!mid) return;
    const url = midToUrl.get(mid);
    if (!url) return;
    g.style.cursor = "pointer";
    g.addEventListener(
      "click",
      (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        emit("node-click", url);
      },
      { capture: false }
    );
  });
}

async function renderMermaid() {
  renderError.value = "";
  const list = graphNodesResolved.value;

  await nextTick();
  const host = hostRef.value;
  if (!host) return;
  if (!list.length) {
    host.innerHTML = "";
    return;
  }

  const my = ++renderSerial;
  ensureMermaidInit();

  const { text, midToUrl } = buildMermaidDefinition(
    list,
    props.edges,
    props.selectedUrl
  );

  try {
    const { svg, bindFunctions } = await mermaid.render(
      `kc-rg-${my}-${Date.now()}`,
      text,
      host
    );
    if (my !== renderSerial) return;
    host.innerHTML = svg;
    bindFunctions?.(host);
    attachNodeClicks(host, midToUrl);
  } catch (e) {
    if (my !== renderSerial) return;
    renderError.value = "图暂时无法渲染";
    console.warn("[ReadingGraphPanel] mermaid:", e);
  }
}

watch(
  () => [graphNodesResolved.value, props.edges, props.selectedUrl],
  () => {
    void renderMermaid();
  },
  { deep: true, flush: "post" }
);

onMounted(() => {
  void renderMermaid();
});

onUnmounted(() => {
  renderSerial += 1;
});
</script>

<style scoped>
.rg-root {
  border-radius: 12px;
  padding: 10px 11px 12px;
  background: linear-gradient(165deg, rgba(var(--kc-primary-rgb), 0.06) 0%, var(--kc-card) 55%, var(--kc-card-elevated) 100%);
  border: 1px solid var(--kc-border-soft);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
  width: 100%;
  min-width: 0;
}

.rg-head {
  margin-bottom: 8px;
}

.rg-title {
  font-size: 12px;
  font-weight: 650;
  color: var(--kc-text);
  letter-spacing: 0.03em;
}

.rg-scroll {
  width: 100%;
  max-height: min(520px, 70vh);
  overflow: auto;
  margin: 0 -2px;
  border-radius: 8px;
  -webkit-overflow-scrolling: touch;
}

.rg-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.rg-scroll::-webkit-scrollbar-thumb {
  border-radius: 99px;
  background: rgba(var(--kc-primary-rgb), 0.22);
}

.rg-mermaid-host {
  width: 100%;
  min-height: 120px;
}

.rg-mermaid-host :deep(svg) {
  max-width: 100%;
  height: auto;
  display: block;
}

.rg-err {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--kc-muted, #888);
}
</style>
