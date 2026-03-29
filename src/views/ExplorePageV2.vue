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
          <div class="cover-wrap" @click="goBlogDetail(blogItem.id)">
            <img
              v-if="blogItem.cover && !blogItem.coverError"
              class="cover"
              :src="blogItem.cover"
              :alt="blogItem.title"
              loading="lazy"
              @error="blogItem.coverError = true"
            />
            <div v-else class="cover cover--placeholder" aria-hidden="true">
              <span class="ph-icon">文</span>
            </div>
          </div>
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
import { computed, onMounted, ref } from "vue";
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
  try {
    await http.put(`/blog/like/${blogItem.id}`);
    const latest = await http.get(`/blog/${blogItem.id}`);
    blogItem.liked = latest.liked;
    blogItem.isLike = latest.isLike;
  } catch (error) {
    ElMessage.error(error.message || "操作失败");
  }
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
  gap: 18px;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.hero {
  padding: 22px 26px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--kc-subtle);
}

h2 {
  margin: 8px 0;
  font-size: 32px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.desc {
  margin: 0;
  max-width: 520px;
  line-height: 1.65;
  color: var(--kc-muted);
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 420px;
  justify-content: flex-end;
}

.hero-tags span {
  border: 1px solid var(--kc-border-soft);
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--kc-muted);
  background: var(--kc-card-elevated);
}

.list-wrap {
  padding: 20px 20px 24px;
}

.list-head h3 {
  margin: 0;
  font-size: 22px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.list-head p {
  margin: 6px 0 0;
  color: var(--kc-muted);
  font-size: 14px;
}

.blog-grid {
  margin-top: 16px;
  max-height: min(68vh, 820px);
  overflow-y: auto;
  padding-right: 4px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.blog-card {
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  overflow: hidden;
  background: var(--kc-card-elevated);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.blog-card:hover {
  box-shadow: var(--kc-shadow-soft);
  transform: translateY(-2px);
}

.cover-wrap {
  cursor: pointer;
  background: #ebe4d6;
}

.cover {
  display: block;
  width: 100%;
  height: 176px;
  object-fit: cover;
}

.cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #e8dfd0, #d4c9b8);
  color: var(--kc-muted);
}

.ph-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(45, 52, 35, 0.12);
  display: grid;
  place-items: center;
  font-size: 20px;
  font-family: Georgia, serif;
  color: var(--kc-text);
  opacity: 0.55;
}

.content {
  padding: 14px 14px 16px;
}

h4 {
  margin: 0;
  line-height: 1.45;
  cursor: pointer;
  min-height: 44px;
  font-size: 16px;
  color: var(--kc-text);
}

.reason {
  margin-top: 8px;
  font-size: 12px;
  color: var(--kc-muted);
  background: rgba(77, 92, 66, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.5;
}

.meta {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.author {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.author img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--kc-border-soft);
}

.author span {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--kc-text);
}

.like-btn {
  flex-shrink: 0;
  border: 1px solid var(--kc-border-soft);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 13px;
  background: var(--kc-card);
  color: var(--kc-text);
  cursor: pointer;
  transition: background 0.15s ease;
}

.like-btn:hover {
  background: rgba(77, 92, 66, 0.12);
  border-color: var(--kc-border);
}

@media (max-width: 640px) {
  .blog-grid {
    max-height: none;
    overflow: visible;
  }
}
</style>
