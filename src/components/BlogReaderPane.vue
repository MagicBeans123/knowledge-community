<template>
  <div class="reader-pane">
    <div v-if="loading" class="muted">加载正文中…</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <template v-else>
      <h2 v-if="showTitle && blog?.title" class="title">{{ blog.title }}</h2>
      <div v-if="contentLoadError" class="hint">{{ contentLoadError }}</div>
      <article class="markdown-body" v-html="articleHtml" />
    </template>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import http from "../api/http";
import { normalizeBlogDetail } from "../utils/dto";
import { isLikelyHtmlContent, renderMarkdown } from "../utils/markdown";

const props = defineProps({
  blogId: { type: [String, Number], required: true },
  /** 是否在正文上方显示标题 */
  showTitle: { type: Boolean, default: true }
});

const blog = ref(null);
const markdownSource = ref("");
const contentLoadError = ref("");
const loading = ref(false);
const error = ref("");

const articleHtml = computed(() => {
  const c = markdownSource.value;
  if (!c || typeof c !== "string") return "";
  return isLikelyHtmlContent(c) ? c : renderMarkdown(c);
});

const isContentUrl = (value) => {
  const v = String(value || "").trim();
  if (!v) return false;
  if (/\s/.test(v)) return false;
  return /^https?:\/\//i.test(v) || v.startsWith("/upload/") || v.startsWith("//");
};

const normalizeContentUrl = (url) => {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `${window.location.protocol}${raw}`;
  if (raw.startsWith("/")) return `${window.location.origin}${raw}`;
  return `${window.location.origin}/${raw}`;
};

const normalizeFetchedMarkdown = (text) => {
  if (typeof text !== "string") return "";
  const t = text.trim();
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const obj = JSON.parse(t);
      const c = obj?.content ?? obj?.data ?? "";
      if (typeof c === "string" && c) return c;
    } catch {
      /* ignore */
    }
  }
  if (!t.includes("\n") && t.includes("\\n")) {
    return t.replace(/\\n/g, "\n");
  }
  return text;
};

const resolveContent = async (normalizedBlog) => {
  const raw = normalizedBlog?.markdownContent ?? normalizedBlog?.content ?? "";
  contentLoadError.value = "";
  if (!raw) {
    markdownSource.value = "";
    return;
  }
  if (!isContentUrl(raw)) {
    markdownSource.value = raw;
    return;
  }
  try {
    const targetUrl = normalizeContentUrl(raw);
    const resp = await fetch(targetUrl);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    markdownSource.value = normalizeFetchedMarkdown(text);
    if (!markdownSource.value.trim()) {
      contentLoadError.value = "正文文件为空";
    }
  } catch (e) {
    markdownSource.value = "";
    contentLoadError.value = `正文文件加载失败${e?.message ? `：${e.message}` : ""}`;
  }
};

const load = async () => {
  const id = props.blogId;
  if (id == null || id === "") {
    blog.value = null;
    markdownSource.value = "";
    error.value = "缺少博客 id";
    return;
  }
  loading.value = true;
  error.value = "";
  markdownSource.value = "";
  blog.value = null;
  try {
    const raw = await http.get(`/blog/${encodeURIComponent(id)}`);
    const normalized = normalizeBlogDetail(raw);
    if (!normalized) {
      throw new Error("未找到该博客");
    }
    blog.value = normalized;
    await resolveContent(normalized);
  } catch (e) {
    error.value = e?.message || "加载失败";
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.blogId,
  () => load(),
  { immediate: true }
);
</script>

<style scoped>
.reader-pane {
  min-height: 120px;
}
.title {
  margin: 0 0 14px;
  font-size: 22px;
  line-height: 1.35;
  color: var(--kc-text);
}
.muted {
  color: var(--kc-muted);
  font-size: 14px;
}
.error {
  color: #c0392b;
  font-size: 14px;
}
.hint {
  color: var(--kc-muted);
  font-size: 13px;
  margin-bottom: 8px;
}
</style>
