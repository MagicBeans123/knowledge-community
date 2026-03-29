/**
 * 与 database_structure 对应的 JSON 驼峰字段约定（后端序列化）。
 * know_blog: userId, title, content, liked, comments, isCommit, createTime, updateTime
 * know_user: phone, email, nickName, icon, sign, createTime, updateTime
 * know_user_info: city, introduce, fans, followee, gender, birthday, credits, level
 * know_blog_comments: userId, blogId, parentId, answerId, content, liked, status, createTime
 */

const IMG_SRC_RE = /<img[^>]+src=["']([^"']+)["']/i;
const MD_IMG_RE = /!\[[^\]]*\]\(\s*([^)\s]+)\s*\)/;

export function firstImageSrcFromHtml(html) {
  if (!html || typeof html !== "string") return "";
  const m = html.match(IMG_SRC_RE);
  return m ? m[1] : "";
}

/** 从正文提取首张图：支持 Markdown ![](url) 与 HTML <img> */
export function firstImageFromBlogContent(content) {
  if (!content || typeof content !== "string") return "";
  const mdMatch = content.match(MD_IMG_RE);
  if (mdMatch) return mdMatch[1].trim();
  return firstImageSrcFromHtml(content);
}

export function normalizeBlogCard(raw) {
  const r = raw || {};
  const nickName = r.nickName ?? r.name ?? "";
  const cover =
    r.cover ||
    (r.images && String(r.images).split(",")[0].trim()) ||
    firstImageFromBlogContent(r.content) ||
    "";
  return {
    ...r,
    nickName,
    cover,
    liked: r.liked ?? 0,
    comments: r.comments ?? 0,
    isCommit: r.isCommit ?? r.is_commit,
    userId: r.userId ?? r.user_id,
    createTime: r.createTime ?? r.create_time,
    updateTime: r.updateTime ?? r.update_time
  };
}

export function normalizeBlogDetail(raw) {
  if (!raw) return null;
  const r = normalizeBlogCard(raw);
  return {
    ...r,
    comments: r.comments ?? 0
  };
}

export function normalizeComment(raw) {
  const c = raw || {};
  return {
    ...c,
    userId: c.userId ?? c.user_id,
    blogId: c.blogId ?? c.blog_id,
    parentId: c.parentId ?? c.parent_id ?? 0,
    answerId: c.answerId ?? c.answer_id ?? 0,
    createTime: c.createTime ?? c.create_time,
    updateTime: c.updateTime ?? c.update_time,
    liked: c.liked ?? 0,
    nickName: c.nickName ?? c.name ?? "用户"
  };
}

export function normalizePublicUser(raw) {
  const u = raw || {};
  const info = u.userInfo ?? u.info ?? {};
  return {
    id: u.id,
    nickName: u.nickName ?? u.nick_name ?? "",
    icon: u.icon ?? "",
    sign: u.sign ?? "",
    phone: u.phone,
    email: u.email,
    city: info.city ?? u.city ?? "",
    introduce: info.introduce ?? u.introduce ?? "",
    fans: info.fans ?? u.fans ?? 0,
    followee: info.followee ?? u.followee ?? 0,
    gender: info.gender ?? u.gender ?? 0,
    birthday: info.birthday ?? u.birthday ?? "",
    credits: info.credits ?? u.credits ?? 0,
    level: info.level ?? u.level ?? 0,
    createTime: u.createTime ?? u.create_time
  };
}

export function normalizeCurrentUser(payload) {
  const base = payload?.user ?? payload;
  const info = payload?.userInfo ?? payload?.info ?? base?.userInfo ?? {};
  const merged = { ...base, ...info };
  return {
    id: merged.id,
    phone: merged.phone ?? "",
    email: merged.email ?? "",
    nickName: merged.nickName ?? merged.nick_name ?? "",
    icon: merged.icon ?? "",
    sign: merged.sign ?? "",
    city: merged.city ?? "",
    introduce: merged.introduce ?? "",
    fans: merged.fans ?? 0,
    followee: merged.followee ?? 0,
    gender: merged.gender ?? 0,
    birthday: merged.birthday ?? "",
    credits: merged.credits ?? 0,
    level: merged.level ?? 0,
    blogCount: payload?.blogCount ?? merged.blogCount ?? merged.blog_count ?? 0,
    createTime: merged.createTime ?? merged.create_time,
    updateTime: merged.updateTime ?? merged.update_time
  };
}

const GENDER_LABELS = { 0: "保密", 1: "男", 2: "女" };

export function genderLabel(value) {
  if (value === null || value === undefined || value === "") return "未填写";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return GENDER_LABELS[n] ?? `选项${n}`;
}
