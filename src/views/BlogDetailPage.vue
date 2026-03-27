<template>
  <section class="card detail-wrap" v-if="blog">
    <div class="head">
      <el-button text @click="router.back()">返回</el-button>
      <div class="title">{{ blog.title }}</div>
      <el-button type="primary" @click="toggleLike">点赞 {{ blog.liked }}</el-button>
    </div>
    <div class="author">
      <img :src="blog.icon || defaultIcon" alt="avatar" />
      <span>{{ blog.name }}</span>
      <em>{{ formatDate(blog.createTime) }}</em>
    </div>
    <div class="content" v-html="blog.content"></div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

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
const defaultIcon = "/imgs/icons/default-icon.png";

const blogId = props.id || route.params.id;

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

const fetchBlog = async () => {
  blog.value = await http.get(`/blog/${blogId}`);
};

const toggleLike = async () => {
  await http.put(`/blog/like/${blogId}`);
  await fetchBlog();
};

onMounted(async () => {
  try {
    await fetchBlog();
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

.author em {
  font-style: normal;
  margin-left: 8px;
}

.content {
  margin-top: 24px;
  line-height: 1.9;
  font-size: 15px;
}
</style>
