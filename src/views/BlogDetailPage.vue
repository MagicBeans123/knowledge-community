<template>
  <div class="detail-page">
    <section v-if="loadError" class="card panel error-panel">
      <p class="error-title">无法加载这篇博客</p>
      <p class="error-desc">{{ loadError }}</p>
      <el-button type="primary" @click="router.push('/community/explore')">返回探索</el-button>
    </section>

    <template v-else>
      <section v-if="!blog && loading" class="card panel skeleton-panel">
        <el-skeleton animated :rows="6" />
      </section>

      <section class="card panel" v-else-if="blog">
        <div class="head">
          <el-button class="back-btn" text @click="router.back()">← 返回</el-button>
          <h1 class="title">{{ blog.title }}</h1>
          <div class="head-actions">
            <el-button
              v-if="isBlogOwner"
              type="danger"
              plain
              size="small"
              :loading="blogDeleting"
              @click="deleteBlog"
            >
              删除博客
            </el-button>
            <el-button type="primary" class="like-main" :loading="likeLoading" @click="toggleLike">
              点赞 {{ blog.liked ?? 0 }}
            </el-button>
          </div>
        </div>

        <div class="author-row">
          <img class="avatar" :src="blog.icon || defaultIcon" alt="" />
          <div class="author-text">
            <div class="author-line">
              <router-link v-if="blog.userId" class="author-name" :to="`/community/other-info/${blog.userId}`">
                {{ blog.nickName || "匿名用户" }}
              </router-link>
              <span v-else class="author-name plain">{{ blog.nickName || "匿名用户" }}</span>
              <router-link v-if="blog.userId" class="blogs-link" :to="`/community/user/${blog.userId}/shops`">Ta 的商店</router-link>
              <router-link v-if="blog.userId" class="blogs-link" :to="`/community/user/${blog.userId}/blogs`">全部博客</router-link>
            </div>
            <span class="meta-line">
              <time>{{ formatDate(blog.createTime) }}</time>
              <span v-if="blog.comments != null" class="dot">·</span>
              <span v-if="blog.comments != null">评论 {{ blog.comments }}</span>
            </span>
            <div v-if="showAuthorFollow" class="author-actions">
              <el-button size="small" type="primary" plain :loading="followLoading" @click="toggleFollowAuthor">
                {{ followedAuthor ? "取消关注" : "关注" }}
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="contentLoadError" class="comments-hint">{{ contentLoadError }}</div>
        <article class="article-body markdown-body" v-html="articleHtml"></article>

        <div v-if="attachmentFiles.length" class="attachments-block">
          <h3>附件下载</h3>
          <ul class="attach-list">
            <li v-for="(url, idx) in attachmentFiles" :key="url + idx">
              <a :href="url" target="_blank" rel="noopener noreferrer" :download="fileNameFromUrl(url)">
                {{ fileNameFromUrl(url) }}
              </a>
            </li>
          </ul>
        </div>

        <div class="comments-block">
          <h2 class="comments-title">评论</h2>
          <div v-if="commentsError" class="comments-hint">{{ commentsError }}</div>
          <div class="comment-form">
            <el-input
              v-model="commentDraft"
              type="textarea"
              :rows="3"
              maxlength="255"
              show-word-limit
              placeholder="写下你的想法（最多 255 字）"
            />
            <el-button type="primary" class="send-btn" :loading="commentSubmitting" @click="submitComment">
              发表评论
            </el-button>
          </div>
          <ul class="comment-list" v-if="topLevelComments.length">
            <li v-for="c in topLevelComments" :key="c.id">
              <img :src="c.icon || defaultIcon" alt="" class="c-avatar" />
              <div class="c-body">
                <div class="c-meta">
                  <b>{{ c.nickName || "用户" }}</b>
                  <span class="c-time">{{ formatDate(c.createTime) }}</span>
                  <button type="button" class="like-mini" @click="toggleCommentLike(c)">赞 {{ c.liked ?? 0 }}</button>
                  <button
                    v-if="canDeleteComment(c)"
                    type="button"
                    class="del-mini"
                    :disabled="commentDeletingId === c.id"
                    @click="deleteCommentRow(c)"
                  >
                    删除
                  </button>
                </div>
                <p class="c-text">{{ c.content }}</p>
                <div class="reply-actions">
                  <button type="button" class="reply-toggle" @click="toggleReplies(c)">
                    {{ isRepliesExpanded(c.id) ? "收起回复" : "展开回复" }}
                  </button>
                  <button type="button" class="reply-toggle" @click="toggleReplyEditor(c.id)">回复</button>
                </div>
                <div v-if="isReplyEditorOpen(c.id)" class="reply-editor">
                  <el-input
                    :model-value="replyDraftByParent[c.id] || ''"
                    type="textarea"
                    :rows="2"
                    maxlength="255"
                    show-word-limit
                    placeholder="写下回复内容（最多 255 字）"
                    @update:model-value="(val) => setReplyDraft(c.id, val)"
                  />
                  <div class="reply-editor-actions">
                    <el-button size="small" @click="toggleReplyEditor(c.id)">取消</el-button>
                    <el-button
                      size="small"
                      type="primary"
                      :loading="isReplySubmitting(c.id)"
                      @click="submitReply(c)"
                    >
                      发送回复
                    </el-button>
                  </div>
                </div>
                <ul v-if="isRepliesExpanded(c.id)" class="reply-list">
                  <li v-if="isRepliesLoading(c.id)" class="reply-state">加载中…</li>
                  <li v-else-if="!repliesByParent[c.id]?.length" class="reply-state">暂无回复</li>
                  <li v-for="r in repliesByParent[c.id]" :key="r.id" class="reply-item">
                    <img :src="r.icon || defaultIcon" alt="" class="reply-avatar" />
                    <div class="reply-body">
                      <div class="c-meta">
                        <b>{{ r.nickName || "用户" }}</b>
                        <span class="c-time">{{ formatDate(r.createTime) }}</span>
                        <button type="button" class="like-mini" @click="toggleCommentLike(r)">赞 {{ r.liked ?? 0 }}</button>
                        <button
                          v-if="canDeleteComment(r)"
                          type="button"
                          class="del-mini"
                          :disabled="commentDeletingId === r.id"
                          @click="deleteCommentRow(r)"
                        >
                          删除
                        </button>
                      </div>
                      <p class="c-text">{{ r.content }}</p>
                      <div class="reply-actions">
                        <button type="button" class="reply-toggle" @click="toggleReplies(r)">
                          {{ isRepliesExpanded(r.id) ? "收起楼中楼" : "展开楼中楼" }}
                        </button>
                        <button type="button" class="reply-toggle" @click="toggleReplyEditor(r.id)">回复</button>
                      </div>
                      <div v-if="isReplyEditorOpen(r.id)" class="reply-editor">
                        <el-input
                          :model-value="replyDraftByParent[r.id] || ''"
                          type="textarea"
                          :rows="2"
                          maxlength="255"
                          show-word-limit
                          placeholder="写下楼中楼回复（最多 255 字）"
                          @update:model-value="(val) => setReplyDraft(r.id, val)"
                        />
                        <div class="reply-editor-actions">
                          <el-button size="small" @click="toggleReplyEditor(r.id)">取消</el-button>
                          <el-button
                            size="small"
                            type="primary"
                            :loading="isReplySubmitting(r.id)"
                            @click="submitReply(r)"
                          >
                            发送回复
                          </el-button>
                        </div>
                      </div>
                      <ul v-if="isRepliesExpanded(r.id)" class="sub-reply-list">
                        <li v-if="isRepliesLoading(r.id)" class="reply-state">加载中…</li>
                        <li v-else-if="!repliesByParent[r.id]?.length" class="reply-state">暂无楼中楼回复</li>
                        <li v-for="s in repliesByParent[r.id]" :key="s.id" class="sub-reply-item">
                          <img :src="s.icon || defaultIcon" alt="" class="sub-reply-avatar" />
                          <div class="reply-body">
                            <div class="c-meta">
                              <b>{{ s.nickName || "用户" }}</b>
                              <span class="c-time">{{ formatDate(s.createTime) }}</span>
                              <button type="button" class="like-mini" @click="toggleCommentLike(s)">赞 {{ s.liked ?? 0 }}</button>
                              <button
                                v-if="canDeleteComment(s)"
                                type="button"
                                class="del-mini"
                                :disabled="commentDeletingId === s.id"
                                @click="deleteCommentRow(s)"
                              >
                                删除
                              </button>
                            </div>
                            <p class="c-text">{{ s.content }}</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
          <p v-if="topLevelComments.length && topLoadingMore" class="load-more-c">加载中…</p>
          <p v-else-if="topLevelComments.length && !topHasMore" class="load-more-c end">没有更多了</p>
          <p v-else-if="!topLevelComments.length && topLoadingMore && !commentsError" class="load-more-c">评论加载中…</p>
          <p v-else-if="!commentsError && !topLevelComments.length" class="empty-c">暂无评论，来抢沙发吧</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { useUserStore } from "../stores/user";
import { normalizeBlogDetail, normalizeComment } from "../utils/dto";
import { isLikelyHtmlContent, renderMarkdown } from "../utils/markdown";

const props = defineProps({
  id: {
    type: [String, Number],
    required: false,
    default: ""
  },
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);

const blog = ref(null);
const followedAuthor = ref(false);
const followLoading = ref(false);
/** 仅顶级评论（游标分页）；子回复仍在 repliesByParent */
const topLevelComments = ref([]);
const topCursorSeconds = ref(0);
const topCursorCommentId = ref("0");
const topHasMore = ref(true);
const topLoadingMore = ref(false);
const expandedParentIds = ref([]);
const repliesByParent = ref({});
const repliesLoadingByParent = ref({});
const replyDraftByParent = ref({});
const replySubmittingByParent = ref({});
const replyEditorParentId = ref(null);
const commentDraft = ref("");
const commentSubmitting = ref(false);
const commentDeletingId = ref(null);
const loading = ref(true);
const loadError = ref("");
const commentsError = ref("");
const likeLoading = ref(false);
const blogDeleting = ref(false);
const defaultIcon = "/image/default.png";
const markdownSource = ref("");
const contentLoadError = ref("");

const blogId = props.id || route.params.id;

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
  // 兼容后端返回 {"content":"..."} 这类 JSON 包裹
  if (t.startsWith("{") && t.endsWith("}")) {
    try {
      const obj = JSON.parse(t);
      const c = obj?.content ?? obj?.data ?? "";
      if (typeof c === "string" && c) return c;
    } catch {
      /* ignore json parse error */
    }
  }
  // 兼容整段被转义为单行字符串：包含 \n 但没有真实换行
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

const attachmentFiles = computed(() => {
  const fileField = blog.value?.file;
  if (!fileField) return [];
  if (Array.isArray(fileField)) return fileField.map((x) => String(x).trim()).filter(Boolean);
  return String(fileField)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
});

const fileNameFromUrl = (url) => {
  const clean = String(url || "").split("?")[0];
  const seg = clean.split("/").filter(Boolean);
  return seg.length ? decodeURIComponent(seg[seg.length - 1]) : "附件";
};

const showAuthorFollow = computed(() => {
  const uid = blog.value?.userId;
  if (!uid || !me.value?.id) return false;
  return Number(uid) !== Number(me.value.id);
});

const isBlogOwner = computed(() => {
  const uid = blog.value?.userId;
  if (uid == null || uid === "" || me.value?.id == null || me.value?.id === "") return false;
  return String(uid) === String(me.value.id);
});

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

/** 与博客列表游标一致：支持 LocalDateTime 数组或时间戳 */
const toSeconds = (value) => {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    const ts = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
    return Number.isFinite(ts) ? Math.floor(ts / 1000) : 0;
  }
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : 0;
};

function parseCommentPagePayload(data) {
  if (Array.isArray(data)) {
    return { list: data, nextSeconds: 0 };
  }
  const p = data && typeof data === "object" ? data : {};
  const list = Array.isArray(p.list)
    ? p.list
    : Array.isArray(p.records)
      ? p.records
      : Array.isArray(p.items)
        ? p.items
        : [];
  const nextSeconds = Number(p.seconds ?? p.nextSeconds ?? p.cursor ?? 0) || 0;
  return { list, nextSeconds };
}

/**
 * 顶级评论：带 seconds / commentId / offset 游标；子回复仅 parentId + answerId。
 */
const buildCommentQuery = (parentId, answerId = "", cursor = null) => {
  const params = new URLSearchParams();
  params.set("parentId", String(parentId ?? 0));
  params.set("answerId", answerId == null ? "" : String(answerId));
  if (Number(parentId) === 0 && cursor) {
    params.set("seconds", String(cursor.seconds ?? 0));
    params.set("commentId", String(cursor.commentId ?? "0"));
    params.set("offset", String(cursor.offset ?? 0));
  }
  return params.toString();
};

const resetTopCommentCursor = () => {
  topCursorSeconds.value = 0;
  topCursorCommentId.value = "0";
  topHasMore.value = true;
};

const fetchTopCommentsPage = async (isInitial) => {
  if (topLoadingMore.value) return;
  if (!isInitial && !topHasMore.value) return;
  topLoadingMore.value = true;
  commentsError.value = "";
  try {
    /** 顶级首次：seconds 为当前 Unix 秒数（与关注动态首屏一致）；翻页用上一页末尾游标 */
    const q = buildCommentQuery(0, "", {
      seconds: isInitial ? Math.floor(Date.now() / 1000) : topCursorSeconds.value,
      commentId: isInitial ? "0" : topCursorCommentId.value,
      /** 第一次 0，之后固定 1（与关注动态等接口一致） */
      offset: isInitial ? 0 : 1
    });
    const data = await http.get(`/blog/${blogId}/comments?${q}`);
    const { list, nextSeconds } = parseCommentPagePayload(data);
    const mapped = list
      .map((item) => normalizeComment(item))
      .filter((c) => Number(c.parentId ?? 0) === 0);

    if (isInitial) {
      topLevelComments.value = mapped;
    } else {
      const ids = new Set(topLevelComments.value.map((x) => String(x.id)));
      topLevelComments.value = topLevelComments.value.concat(mapped.filter((x) => !ids.has(String(x.id))));
    }

    if (!mapped.length) {
      topHasMore.value = false;
    } else {
      const tail = mapped[mapped.length - 1];
      topCursorCommentId.value = String(tail.id ?? "0");
      topCursorSeconds.value = nextSeconds > 0 ? nextSeconds : toSeconds(tail.createTime || tail.updateTime);
    }
  } catch (error) {
    if (isInitial) {
      commentsError.value = error.message || "评论暂时无法加载，正文仍可阅读";
      topLevelComments.value = [];
    } else {
      ElMessage.error(error.message || "加载更多评论失败");
    }
  } finally {
    topLoadingMore.value = false;
  }
};

const loadMoreTopComments = () => fetchTopCommentsPage(false);

const onWindowScroll = () => {
  if (topLoadingMore.value || !topHasMore.value) return;
  const scrollBottom = window.innerHeight + window.scrollY;
  const docHeight = document.documentElement.scrollHeight;
  if (scrollBottom < docHeight - 80) return;
  loadMoreTopComments();
};

const fetchBlog = async () => {
  const raw = await http.get(`/blog/${blogId}`);
  const normalized = normalizeBlogDetail(raw);
  if (!normalized) {
    throw new Error("未找到该博客");
  }
  blog.value = normalized;
  await resolveContent(normalized);
};

const fetchComments = async () => {
  resetTopCommentCursor();
  expandedParentIds.value = [];
  repliesByParent.value = {};
  repliesLoadingByParent.value = {};
  replyDraftByParent.value = {};
  replySubmittingByParent.value = {};
  replyEditorParentId.value = null;
  await fetchTopCommentsPage(true);
};

const isRepliesExpanded = (parentId) => expandedParentIds.value.includes(parentId);
const isRepliesLoading = (parentId) => Boolean(repliesLoadingByParent.value[parentId]);

const fetchReplies = async (parentId) => {
  repliesLoadingByParent.value = { ...repliesLoadingByParent.value, [parentId]: true };
  try {
    const q = buildCommentQuery(parentId, "");
    const data = await http.get(`/blog/${blogId}/comments?${q}`);
    const list = Array.isArray(data) ? data : [];
    repliesByParent.value = {
      ...repliesByParent.value,
      [parentId]: list.map((item) => normalizeComment(item))
    };
  } catch (error) {
    ElMessage.error(error.message || "回复加载失败");
    repliesByParent.value = { ...repliesByParent.value, [parentId]: [] };
  } finally {
    repliesLoadingByParent.value = { ...repliesLoadingByParent.value, [parentId]: false };
  }
};

const toggleReplies = async (row) => {
  const parentId = row.id;
  if (isRepliesExpanded(parentId)) {
    expandedParentIds.value = expandedParentIds.value.filter((id) => id !== parentId);
    return;
  }
  expandedParentIds.value = [...expandedParentIds.value, parentId];
  if (!Object.prototype.hasOwnProperty.call(repliesByParent.value, parentId)) {
    await fetchReplies(parentId);
  }
};

const isReplyEditorOpen = (parentId) => replyEditorParentId.value === parentId;
const isReplySubmitting = (parentId) => Boolean(replySubmittingByParent.value[parentId]);

const setReplyDraft = (parentId, text) => {
  replyDraftByParent.value = { ...replyDraftByParent.value, [parentId]: text };
};

const toggleReplyEditor = async (parentId) => {
  if (isReplyEditorOpen(parentId)) {
    replyEditorParentId.value = null;
    return;
  }
  replyEditorParentId.value = parentId;
  if (!Object.prototype.hasOwnProperty.call(replyDraftByParent.value, parentId)) {
    replyDraftByParent.value = { ...replyDraftByParent.value, [parentId]: "" };
  }
  // 打开回复框时自动展开该楼层，方便看到上下文
  if (!isRepliesExpanded(parentId)) {
    expandedParentIds.value = [...expandedParentIds.value, parentId];
    if (!Object.prototype.hasOwnProperty.call(repliesByParent.value, parentId)) {
      await fetchReplies(parentId);
    }
  }
};

const submitReply = async (parentRow) => {
  const parentId = parentRow?.id;
  if (!parentId) return;
  const text = String(replyDraftByParent.value[parentId] ?? "").trim();
  if (!text) {
    ElMessage.warning("回复内容不能为空");
    return;
  }
  replySubmittingByParent.value = { ...replySubmittingByParent.value, [parentId]: true };
  try {
    await http.post(`/blog/${blogId}/comments`, {
      content: text,
      parentId,
      // 二级评论先挂在顶级评论下；不做 @ 逻辑时 answerId 传父评论 id 即可
      answerId: parentId
    });
    setReplyDraft(parentId, "");
    await fetchReplies(parentId);
    if (blog.value?.comments != null) {
      blog.value.comments += 1;
    }
    ElMessage.success("回复已发布");
  } catch (error) {
    ElMessage.error(error.message || "回复失败");
  } finally {
    replySubmittingByParent.value = { ...replySubmittingByParent.value, [parentId]: false };
  }
};

const submitComment = async () => {
  const text = commentDraft.value.trim();
  if (!text) {
    ElMessage.warning("评论内容不能为空");
    return;
  }
  commentSubmitting.value = true;
  try {
    await http.post(`/blog/${blogId}/comments`, {
      content: text,
      parentId: 0,
      answerId: null
    });
    commentDraft.value = "";
    if (blog.value?.comments != null) {
      blog.value.comments += 1;
    }
    await fetchComments();
    ElMessage.success("评论已发布");
  } catch (error) {
    ElMessage.error(error.message);
  } finally {
    commentSubmitting.value = false;
  }
};

const toggleCommentLike = async (row) => {
  try {
    await http.put(`/blog/comment/like/${row.id}`);
    const hadLiked = Boolean(row.__likedByMe ?? row.isLike ?? false);
    row.__likedByMe = !hadLiked;
    row.liked = hadLiked ? Math.max(0, Number(row.liked ?? 0) - 1) : Number(row.liked ?? 0) + 1;
  } catch (error) {
    ElMessage.error(error.message);
  }
};

/** 评论作者或博客作者可删 */
const canDeleteComment = (row) => {
  const uid = me.value?.id;
  if (uid == null || uid === "") return false;
  const u = String(uid);
  return String(row.userId ?? "") === u || String(blog.value?.userId ?? "") === u;
};

const removeCommentFromState = (row) => {
  const id = String(row.id);
  topLevelComments.value = topLevelComments.value.filter((c) => String(c.id) !== id);
  const pid = Number(row.parentId ?? 0);
  if (pid !== 0) {
    const list = repliesByParent.value[pid];
    if (Array.isArray(list)) {
      repliesByParent.value = {
        ...repliesByParent.value,
        [pid]: list.filter((r) => String(r.id) !== id)
      };
    }
  }
};

const deleteCommentRow = async (row) => {
  if (!row?.id) return;
  commentDeletingId.value = row.id;
  try {
    await http.delete(`/blog/${blogId}/comments/${row.id}`);
    removeCommentFromState(row);
    if (blog.value?.comments != null && blog.value.comments > 0) {
      blog.value.comments -= 1;
    }
    ElMessage.success("已删除");
  } catch (error) {
    ElMessage.error(error.message || "删除失败");
  } finally {
    commentDeletingId.value = null;
  }
};

const toggleLike = async () => {
  likeLoading.value = true;
  try {
    await http.put(`/blog/like/${blogId}`);
    const hadLiked = Boolean(blog.value?.isLike);
    if (!blog.value) blog.value = {};
    blog.value.isLike = !hadLiked;
    const nextLiked = Number(blog.value.liked || 0) + (hadLiked ? -1 : 1);
    blog.value.liked = Math.max(0, nextLiked);
  } catch (error) {
    ElMessage.error(error.message);
  } finally {
    likeLoading.value = false;
  }
};

const deleteBlog = async () => {
  if (!blogId || !isBlogOwner.value) return;
  try {
    await ElMessageBox.confirm("确定要删除这篇博客吗？删除后无法恢复。", "删除博客", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
      confirmButtonClass: "el-button--danger"
    });
  } catch {
    return;
  }
  blogDeleting.value = true;
  try {
    await http.delete(`/blog/${blogId}`);
    ElMessage.success("博客已删除");
    const uid = blog.value?.userId;
    if (uid != null && uid !== "") {
      router.push(`/community/user/${uid}/blogs`);
    } else {
      router.push("/community/explore");
    }
  } catch (error) {
    ElMessage.error(error.message || "删除失败");
  } finally {
    blogDeleting.value = false;
  }
};

const loadAuthorFollow = async () => {
  const uid = blog.value?.userId;
  if (!uid || !showAuthorFollow.value) return;
  try {
    const flag = await http.get(`/follow/or/not/${uid}`);
    followedAuthor.value = Boolean(flag);
  } catch {
    followedAuthor.value = false;
  }
};

const toggleFollowAuthor = async () => {
  const uid = blog.value?.userId;
  if (!uid) return;
  followLoading.value = true;
  try {
    await http.put(`/follow/${uid}/${!followedAuthor.value}`);
    followedAuthor.value = !followedAuthor.value;
    ElMessage.success(followedAuthor.value ? "已关注" : "已取消关注");
    import("../services/stompService.js")
      .then((m) => m.resyncSellerSeckillSubscriptions())
      .catch(() => {});
  } catch (error) {
    ElMessage.error(error.message);
  } finally {
    followLoading.value = false;
  }
};

onMounted(async () => {
  window.addEventListener("scroll", onWindowScroll, { passive: true });
  loadError.value = "";
  loading.value = true;
  try {
    await userStore.fetchMe();
    await fetchBlog();
    await loadAuthorFollow();
    await fetchComments();
  } catch (error) {
    loadError.value = error.message || "请检查网络或稍后重试";
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", onWindowScroll);
});
</script>

<style scoped>
.detail-page {
  max-width: 860px;
  margin: 0 auto;
}

.panel {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.error-panel {
  padding: 32px;
  text-align: center;
}

.error-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--kc-text);
}

.error-desc {
  margin: 0 0 20px;
  color: var(--kc-muted);
  font-size: 14px;
}

.skeleton-panel {
  padding: 28px;
}

.panel:not(.skeleton-panel):not(.error-panel) {
  padding: 28px 32px 36px;
}

.head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 16px;
  margin-bottom: 8px;
}

.back-btn {
  color: var(--kc-muted);
  padding-left: 0;
}

.title {
  flex: 1 1 220px;
  margin: 0;
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 700;
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.35;
  color: var(--kc-text);
  text-align: left;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.head-actions .like-main {
  flex-shrink: 0;
}

.like-main {
  flex-shrink: 0;
}

.author-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px 0 20px;
  border-bottom: 1px solid var(--kc-border-soft);
}

.author-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.blogs-link {
  font-size: 13px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.blogs-link:hover {
  text-decoration: underline;
}

.author-actions {
  margin-top: 8px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.author-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.author-name {
  color: var(--el-color-primary);
  text-decoration: none;
  font-weight: 600;
  font-size: 15px;
}

.author-name.plain {
  color: var(--kc-text);
}

.author-name:hover {
  text-decoration: underline;
}

.meta-line {
  font-size: 13px;
  color: var(--kc-muted);
}

.meta-line .dot {
  margin: 0 6px;
}

.article-body {
  margin-top: 24px;
  line-height: 1.85;
  font-size: 16px;
  color: var(--kc-text);
  word-break: break-word;
}

.article-body :deep(p) {
  margin: 0 0 12px;
}

.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3) {
  margin: 1.1em 0 0.5em;
  line-height: 1.25;
  color: var(--kc-text);
}

.article-body :deep(h1) {
  font-size: 1.5rem;
}

.article-body :deep(h2) {
  font-size: 1.25rem;
}

.article-body :deep(h3) {
  font-size: 1.1rem;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0 0 12px;
  padding-left: 1.4em;
}

.article-body :deep(blockquote) {
  margin: 0 0 12px;
  padding: 8px 14px;
  border-left: 4px solid var(--kc-border);
  background: rgba(77, 92, 66, 0.06);
  color: var(--kc-muted);
}

.article-body :deep(pre) {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #2d3423;
  color: #f3f0e9;
  overflow: auto;
  font-size: 13px;
}

.article-body :deep(code) {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 0.9em;
}

.article-body :deep(pre code) {
  color: inherit;
  background: none;
}

.article-body :deep(p code),
.article-body :deep(li code) {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(77, 92, 66, 0.1);
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 10px;
  display: block;
  margin: 12px 0;
}

.article-body :deep(a) {
  color: var(--el-color-primary);
}

.attachments-block {
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
}

.attachments-block h3 {
  margin: 0 0 8px;
  font-size: 16px;
  color: var(--kc-text);
}

.attach-list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}

.attach-list a {
  color: var(--el-color-primary);
  text-decoration: none;
}

.attach-list a:hover {
  text-decoration: underline;
}

.comments-block {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--kc-border-soft);
}

.comments-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.comments-hint {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(77, 92, 66, 0.08);
  color: var(--kc-muted);
  font-size: 13px;
}

.comment-form {
  display: grid;
  gap: 12px;
  margin-bottom: 22px;
}

.comment-form :deep(.el-textarea__inner) {
  background: var(--kc-card-elevated);
  border-radius: 10px;
}

.send-btn {
  justify-self: start;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}

.comment-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 12px;
  background: var(--kc-card-elevated);
  border: 1px solid var(--kc-border-soft);
}

.c-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.c-body {
  flex: 1;
  min-width: 0;
}

.c-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 13px;
  color: var(--kc-muted);
}

.c-meta b {
  color: var(--kc-text);
}

.c-time {
  opacity: 0.9;
}

.del-mini {
  margin-left: 8px;
  padding: 0 6px;
  font-size: 12px;
  color: var(--kc-muted);
  background: none;
  border: none;
  cursor: pointer;
}

.del-mini:hover:not(:disabled) {
  color: var(--el-color-danger);
}

.del-mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.like-mini {
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
  margin-left: auto;
}

.c-text {
  margin: 8px 0 0;
  line-height: 1.65;
  color: var(--kc-text);
  font-size: 14px;
}

.reply-actions {
  margin-top: 8px;
  display: flex;
  gap: 12px;
}

.reply-toggle {
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.reply-editor {
  margin-top: 10px;
  display: grid;
  gap: 8px;
}

.reply-editor-actions {
  display: flex;
  gap: 8px;
}

.reply-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 10px 0 0 0;
  border-top: 1px dashed var(--kc-border-soft);
  display: grid;
  gap: 10px;
}

.reply-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.reply-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.sub-reply-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 10px 0 0 14px;
  border-top: 1px dashed var(--kc-border-soft);
  display: grid;
  gap: 8px;
}

.sub-reply-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.sub-reply-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.reply-state {
  margin: 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.empty-c {
  margin: 0;
  color: var(--kc-muted);
  font-size: 14px;
}

.load-more-c {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--kc-muted);
  text-align: center;
}

.load-more-c.end {
  color: var(--kc-muted);
}

@media (max-width: 640px) {
  .panel:not(.skeleton-panel):not(.error-panel) {
    padding: 20px 18px 28px;
  }

  .like-main {
    margin-left: 0;
  }

  .head {
    flex-direction: column;
    align-items: stretch;
  }

  .title {
    order: -1;
    width: 100%;
  }
}
</style>
