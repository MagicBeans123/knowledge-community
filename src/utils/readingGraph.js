/**
 * Markdown 阅读跳转图：URL 规范化与站内博客链接判断（路径与 /community/blog/:id 对齐）
 */

const BLOG_PATH_RE = /^\/community\/blog\/([^/]+)\/?$/i;

export function canonicalPageUrl(href) {
  if (href == null || href === "") return "";
  try {
    const u = new URL(String(href), typeof window !== "undefined" ? window.location.origin : undefined);
    u.hash = "";
    return u.href;
  } catch {
    return String(href).split("#")[0];
  }
}

export function isInternalBlogDetailUrl(href) {
  if (href == null || href === "") return false;
  try {
    const u = new URL(String(href), typeof window !== "undefined" ? window.location.origin : undefined);
    if (typeof window !== "undefined" && u.origin !== window.location.origin) return false;
    return BLOG_PATH_RE.test(u.pathname || "");
  } catch {
    return false;
  }
}

/** 返回 /community/blog/:id?... 形式（同源） */
export function internalBlogRouterPath(href) {
  try {
    const u = new URL(String(href), typeof window !== "undefined" ? window.location.origin : undefined);
    return `${u.pathname}${u.search}${u.hash}` || "/community/explore";
  } catch {
    return "/community/explore";
  }
}

/**
 * 解析 Markdown 中正文的博客站内链接。
 * Markdown 常为相对路径（如 `blog/id`、`community/blog/id`）；用默认 URL 拼接会得到错误 pathname，需兜底。
 *
 * @param {string} hrefAttr `<a>` 上原始 href（未 decode）
 * @param {string} [baseHref] 一般为 `window.location.href`
 * @returns {string|null} 规范同源博客详情 absolute URL；无法识别则 null
 */
export function resolveMarkdownBlogHref(hrefAttr, baseHref) {
  if (hrefAttr == null || hrefAttr === "" || hrefAttr.startsWith("#")) return null;
  const raw = String(hrefAttr).trim();
  const base =
    typeof baseHref === "string" && baseHref
      ? baseHref
      : typeof window !== "undefined"
        ? window.location.href
        : undefined;
  const origin =
    typeof window !== "undefined" ? window.location.origin : base ? new URL(base).origin : "";

  const tryCanonical = (abs) => {
    try {
      const u = new URL(abs);
      if (!origin || u.origin !== origin) return null;
      u.hash = "";
      return BLOG_PATH_RE.test(u.pathname || "") ? u.href : null;
    } catch {
      return null;
    }
  };

  if (typeof base === "string") {
    const first = tryCanonical(new URL(raw, base).href);
    if (first) return canonicalPageUrl(first);
  }

  try {
    if (origin) {
      if (raw.startsWith("/")) {
        const c = tryCanonical(new URL(raw, origin).href);
        if (c) return canonicalPageUrl(c);
      } else if (!/^https?:\/\//i.test(raw)) {
        const withSlash = raw.startsWith("community/")
          ? `/${raw}`
          : /^blog\/[^/]+\/?$/i.test(raw)
            ? `/community/${raw}`
            : /^community\/blog\//i.test(raw)
              ? `/${raw}`
              : null;
        if (withSlash) {
          const c = tryCanonical(new URL(withSlash, origin).href);
          if (c) return canonicalPageUrl(c);
        }
      }
    }
  } catch {
    /* fallthrough */
  }

  return null;
}

/**
 * 正文 `<a href>` 的导航目标。
 * - **blog**：同源 `/community/blog/:id`，用于 SPA 内跳转并维护阅读轨迹。
 * - **other**：其它 http(s) 或站内路径（如探索页），`openUrl` 用于新标签打开，避免打断当前页轨迹。
 */
export function resolveMarkdownNavTarget(hrefAttr, baseHref) {
  if (hrefAttr == null || hrefAttr === "" || String(hrefAttr).startsWith("#")) return null;
  const base =
    typeof baseHref === "string" && baseHref
      ? baseHref
      : typeof window !== "undefined"
        ? window.location.href
        : undefined;
  if (!base) return null;

  const blogAbs = resolveMarkdownBlogHref(hrefAttr, base);
  if (blogAbs) {
    return {
      kind: "blog",
      canonical: canonicalPageUrl(blogAbs),
      openUrl: blogAbs
    };
  }

  const raw = String(hrefAttr).trim();
  if (/^mailto:/i.test(raw) || /^tel:/i.test(raw)) return null;
  try {
    const u = new URL(raw, base);
    if (u.protocol === "javascript:" || u.protocol === "data:" || u.protocol === "vbscript:") {
      return null;
    }
    if (u.protocol === "file:") return null;
    const openUrl = u.href;
    return {
      kind: "other",
      canonical: canonicalPageUrl(openUrl),
      openUrl
    };
  } catch {
    return null;
  }
}

export function parseBlogIdFromInternalUrl(href) {
  try {
    const u = new URL(String(href), typeof window !== "undefined" ? window.location.origin : undefined);
    const m = (u.pathname || "").match(BLOG_PATH_RE);
    return m ? decodeURIComponent(m[1]) : "";
  } catch {
    return "";
  }
}
