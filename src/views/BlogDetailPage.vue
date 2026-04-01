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
          <el-button type="primary" class="like-main" :loading="likeLoading" @click="toggleLike">
            点赞 {{ blog.liked ?? 0 }}
          </el-button>
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

        <article class="article-body markdown-body" v-html="articleHtml"></article>

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
                </div>
                <p class="c-text">{{ c.content }}</p>
                <div class="reply-actions">
                  <button type="button" class="reply-toggle" @click="toggleReplies(c)">
                    {{ isRepliesExpanded(c.id) ? "收起回复" : "展开回复" }}
                  </button>
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
                      </div>
                      <p class="c-text">{{ r.content }}</p>
                    </div>
                  </li>
                </ul>
              </div>
            </li>
          </ul>
          <p v-else-if="!commentsError" class="empty-c">暂无评论，来抢沙发吧</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
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
const comments = ref([]);
const expandedParentIds = ref([]);
const repliesByParent = ref({});
const repliesLoadingByParent = ref({});
const commentDraft = ref("");
const commentSubmitting = ref(false);
const loading = ref(true);
const loadError = ref("");
const commentsError = ref("");
const likeLoading = ref(false);
const defaultIcon = "/imgs/icons/default-icon.png";

const blogId = props.id || route.params.id;

const articleHtml = computed(() => {
  const c = blog.value?.markdownContent ?? blog.value?.content;
  if (!c || typeof c !== "string") return "";
  return isLikelyHtmlContent(c) ? c : renderMarkdown(c);
});

const topLevelComments = computed(() =>
  comments.value.filter((item) => Number(item.parentId ?? 0) === 0)
);

const showAuthorFollow = computed(() => {
  const uid = blog.value?.userId;
  if (!uid || !me.value?.id) return false;
  return Number(uid) !== Number(me.value.id);
});

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const fetchBlog = async () => {
  const raw = await http.get(`/blog/${blogId}`);
  const normalized = normalizeBlogDetail(raw);
  if (!normalized) {
    throw new Error("未找到该博客");
  }
  blog.value = normalized;
};

const fetchComments = async () => {
  commentsError.value = "";
  try {
    const data = await http.get(`/blog/${blogId}/comments?parentId=0`);
    const list = Array.isArray(data) ? data : [];
    comments.value = list.map((item) => normalizeComment(item));
    expandedParentIds.value = [];
    repliesByParent.value = {};
    repliesLoadingByParent.value = {};
  } catch (error) {
    commentsError.value = error.message || "评论暂时无法加载，正文仍可阅读";
    comments.value = [];
  }
};

const isRepliesExpanded = (parentId) => expandedParentIds.value.includes(parentId);
const isRepliesLoading = (parentId) => Boolean(repliesLoadingByParent.value[parentId]);

const fetchReplies = async (parentId) => {
  repliesLoadingByParent.value = { ...repliesLoadingByParent.value, [parentId]: true };
  try {
    const data = await http.get(`/blog/${blogId}/comments?parentId=${parentId}`);
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
      answerId: 0
    });
    commentDraft.value = "";
    if (blog.value?.comments != null) {
      blog.value.comments += 1;
    }
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
    row.liked = Number(row.liked ?? 0) + 1;
  } catch (error) {
    ElMessage.error(error.message);
  }
};

const toggleLike = async () => {
  likeLoading.value = true;
  try {
    await http.put(`/blog/like/${blogId}`);
    await fetchBlog();
  } catch (error) {
    ElMessage.error(error.message);
  } finally {
    likeLoading.value = false;
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
  } catch (error) {
    ElMessage.error(error.message);
  } finally {
    followLoading.value = false;
  }
};

onMounted(async () => {
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

.like-main {
  flex-shrink: 0;
  margin-left: auto;
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
}

.reply-toggle {
  border: none;
  background: transparent;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 13px;
  padding: 0;
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
