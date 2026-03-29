<template>
  <div class="explore-page">
    <section class="hero card">
      <div>
        <p class="eyebrow">知识发现</p>
        <h2>知识探索</h2>
        <p class="desc">基于热度与内容匹配推荐精选博客，帮助你快速找到高价值内容。</p>
      </div>
      <div class="hero-tags">
        <span v-for="tag in topTags" :key="tag">{{ tag }}</span>
      </div>
    </section>

    <section class="list-wrap card">
      <div class="list-head">
        <div>
          <h3>推荐博客</h3>
          <p>共 {{ filteredBlogs.length }} 篇内容</p>
        </div>
      </div>

      <div class="blog-grid" @scroll="onScroll">
        <article class="blog-card" v-for="blogItem in filteredBlogs" :key="blogItem.id">
          <img class="cover" :src="blogItem.cover" :alt="blogItem.title" @click="goBlogDetail(blogItem.id)" />
          <div class="content">
            <h4 @click="goBlogDetail(blogItem.id)">{{ blogItem.title }}</h4>
            <div class="reason">{{ recommendReason(blogItem) }}</div>
            <div class="meta">
              <div class="author">
                <img :src="blogItem.icon || defaultIcon" alt="avatar" />
                <span>{{ blogItem.nickName || "匿名用户" }}</span>
              </div>
              <button class="like-btn" @click="toggleLike(blogItem)">点赞 {{ blogItem.liked || 0 }}</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeBlogCard } from "../utils/dto";

const props = defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const router = useRouter();
const blogs = ref([]);
const page = ref(1);
const loading = ref(false);
const hasMore = ref(true);
const defaultIcon = "/imgs/icons/default-icon.png";
const topTags = ["前端工程", "效率工具", "学习方法", "项目实战", "思维模型"];

const filteredBlogs = computed(() => {
  const kw = props.keyword.trim().toLowerCase();
  if (!kw) return blogs.value;
  return blogs.value.filter((item) => {
    const title = (item.title || "").toLowerCase();
    const author = (item.nickName || "").toLowerCase();
    return title.includes(kw) || author.includes(kw);
  });
});

const fetchBlogs = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    const data = await http.get(`/blog/hot?current=${page.value}`);
    const list = Array.isArray(data) ? data : [];
    const mapped = list.map((item) => normalizeBlogCard(item));
    blogs.value = blogs.value.concat(mapped);
    if (!list.length) hasMore.value = false;
  } finally {
    loading.value = false;
  }
};

const recommendReason = (blogItem) => {
  const liked = blogItem.liked || 0;
  if (liked >= 100) return "高热度推荐：近期用户互动活跃";
  if ((blogItem.title || "").length > 20) return "深度内容：标题信息量较高";
  return "猜你想看：与热门主题相关";
};

const toggleLike = async (blogItem) => {
  await http.put(`/blog/like/${blogItem.id}`);
  const latest = await http.get(`/blog/${blogItem.id}`);
  blogItem.liked = latest.liked;
  blogItem.isLike = latest.isLike;
};

const goBlogDetail = (blogId) => {
  router.push(`/community/blog/${blogId}`);
};

const onScroll = async (event) => {
  const target = event.target;
  if (target.scrollTop + target.clientHeight < target.scrollHeight - 20) return;
  if (!hasMore.value || loading.value) return;
  page.value += 1;
  try {
    await fetchBlogs();
  } catch (error) {
    page.value -= 1;
    ElMessage.error(error.message);
  }
};

watch(
  () => props.keyword,
  (value) => {
    if (value.trim()) ElMessage.success("已按关键词筛选");
  }
);

onMounted(async () => {
  try {
    await fetchBlogs();
  } catch (error) {
    ElMessage.error(error.message);
  }
});
</script>

<style scoped>
.explore-page {
  display: grid;
  gap: 16px;
}

.card {
  background: #f7f3e8;
  border: 1px solid #d8d1c1;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(58, 67, 44, 0.14);
}

.hero {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
}

.eyebrow {
  margin: 0;
  color: #6a758f;
}

h2 {
  margin: 8px 0;
  font-size: 34px;
}

.desc {
  margin: 0;
  color: #6a758f;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-width: 420px;
}

.hero-tags span {
  border: 1px solid #dfe5f0;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  color: #45526f;
}

.list-wrap {
  padding: 16px;
}

.list-head h3 {
  margin: 0;
  font-size: 24px;
}

.list-head p {
  margin: 6px 0 0;
  color: #6a758f;
}

.blog-grid {
  margin-top: 14px;
  height: calc(100vh - 285px);
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.blog-card {
  border: 1px solid #ddd2ba;
  border-radius: 10px;
  overflow: hidden;
  background: #fffdf7;
}

.cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
  cursor: pointer;
}

.content {
  padding: 12px;
}

h4 {
  margin: 0;
  line-height: 1.4;
  cursor: pointer;
  min-height: 44px;
}

.reason {
  margin-top: 8px;
  font-size: 12px;
  color: #6d705f;
  background: #f2ecde;
  border-radius: 8px;
  padding: 6px 8px;
}

.meta {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
}

.author span {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.like-btn {
  border: none;
  background: transparent;
  color: #d55555;
  cursor: pointer;
}
</style>
