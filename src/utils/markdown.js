import MarkdownIt from "markdown-it";

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

export function renderMarkdown(source) {
  if (!source || typeof source !== "string") return "";
  return md.render(source);
}

/** 旧版富文本帖子：仍按 HTML 渲染 */
export function isLikelyHtmlContent(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (!t.startsWith("<")) return false;
  return /<\/?[a-z][a-z0-9]*[\s>/]/i.test(t);
}
