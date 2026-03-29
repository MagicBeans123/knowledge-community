<template>
  <section class="card detail-wrap" v-if="blog">
    <div class="head">
      <el-button text @click="router.back()">返回</el-button>
      <div class="title">{{ blog.title }}</div>
      <el-button type="primary" @click="toggleLike">点赞 {{ blog.liked ?? 0 }}</el-button>
    </div>
    <div class="author">
      <img :src="blog.icon || defaultIcon" alt="avatar" />
      <router-link v-if="blog.userId" class="author-name" :to="`/community/other-info/${blog.userId}`">
        {{ blog.nickName || "匿名用户" }}
      </router-link>
      <span v-else>{{ blog.nickName || "匿名用户" }}</span>
      <em>{{ formatDate(blog.createTime) }}</em>
      <span class="stat" v-if="blog.comments != null">评论 {{ blog.comments }}</span>
    </div>
    <div class="content" v-html="blog.content"></div>

    <div class="comments card-inner">
      <h3>评论</h3>
      <div class="comment-form">
        <el-input
          v-model="commentDraft"
          type="textarea"
          :rows="3"
          maxlength="255"
          show-word-limit
          placeholder="写下你的想法（最多 255 字）"
        />
        <el-button type="primary" class="send-btn" :loading="commentSubmitting" @click="submitComment">发表评论</el-button>
      </div>
      <ul class="comment-list" v-if="comments.length">
        <li v-for="c in comments" :key="c.id">
          <img :src="c.icon || defaultIcon" alt="" class="c-avatar" />
          <div class="c-body">
            <div class="c-meta">
              <b>{{ c.nickName || "用户" }}</b>
              <span>{{ formatDate(c.createTime) }}</span>
              <button type="button" class="like-mini" @click="toggleCommentLike(c)">赞 {{ c.liked ?? 0 }}</button>
            </div>
            <p class="c-text">{{ c.content }}</p>
          </div>
        </li>
      </ul>
      <p v-else class="empty-c">暂无评论，来抢沙发吧</p>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeBlogDetail, normalizeComment } from "../utils/dto";

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
const blog = ref(null);
const comments = ref([]);
const commentDraft = ref("");
const commentSubmitting = ref(false);
const defaultIcon = "/imgs/icons/default-icon.png";

const blogId = props.id || route.params.id;

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

const fetchBlog = async () => {
  const raw = await http.get(`/blog/${blogId}`);
  blog.value = normalizeBlogDetail(raw);
};

const fetchComments = async () => {
  const data = await http.get(`/blog/${blogId}/comments`);
  const list = Array.isArray(data) ? data : [];
  comments.value = list.map((item) => normalizeComment(item));
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
    await fetchComments();
    await fetchBlog();
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
    await fetchComments();
  } catch (error) {
    ElMessage.error(error.message);
  }
};

const toggleLike = async () => {
  await http.put(`/blog/like/${blogId}`);
  await fetchBlog();
};

onMounted(async () => {
  try {
    await fetchBlog();
    await fetchComments();
  } catch (error) {
    ElMessage.error(error.message);
  }
});
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 45, 80, 0.08);
}

.detail-wrap {
  padding: 24px;
}

.head {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  align-items: center;
}

.title {
  font-size: 28px;
  font-weight: 700;
  text-align: center;
}

.author {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  color: #6f7b91;
}

.author img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.author-name {
  color: #2d6cdf;
  text-decoration: none;
  font-weight: 600;
}

.author-name:hover {
  text-decoration: underline;
}

.author em {
  font-style: normal;
  margin-left: 8px;
}

.author .stat {
  margin-left: 12px;
  font-size: 13px;
  color: #8b95a8;
}

.content {
  margin-top: 24px;
  line-height: 1.9;
  font-size: 15px;
}

.card-inner {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #eef1f6;
}

.card-inner h3 {
  margin: 0 0 14px;
  font-size: 18px;
}

.comment-form {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.send-btn {
  justify-self: start;
}

.comment-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 14px;
}

.comment-list li {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.c-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.c-body {
  flex: 1;
  min-width: 0;
}

.c-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #6f7b91;
}

.c-meta b {
  color: #1f2d3d;
}

.like-mini {
  border: none;
  background: transparent;
  color: #d55555;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.c-text {
  margin: 6px 0 0;
  line-height: 1.6;
  color: #2c3e50;
}

.empty-c {
  margin: 0;
  color: #8b95a8;
  font-size: 14px;
}
</style>
