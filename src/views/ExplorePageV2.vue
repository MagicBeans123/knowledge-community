<template>
  <div class="explore-page">
    <section class="hero card">
      <h2 class="hero-title">知识探索</h2>
    </section>

    <section class="list-wrap card">
      <div class="list-head">
        <div>
          <h3>{{ activeTab === "hot" ? "推荐博客" : "关注动态" }}</h3>
          <p>共 {{ filteredBlogs.length }} 篇内容</p>
        </div>
        <div class="tab-switch">
          <button class="tab-btn" :class="{ active: activeTab === 'hot' }" @click="switchTab('hot')">推荐</button>
          <button class="tab-btn" :class="{ active: activeTab === 'follow' }" @click="switchTab('follow')">查看动态</button>
        </div>
      </div>

      <div class="blog-grid" @scroll="onScroll">
        <article
          v-for="blogItem in filteredBlogs"
          :key="blogItem.id"
          class="blog-card"
          @click="goBlogDetail(blogItem.id)"
        >
          <h4 class="title">{{ blogItem.title }}</h4>
          <p v-if="formatTime(blogItem.createTime || blogItem.updateTime)" class="time-line">
            {{ formatTime(blogItem.createTime || blogItem.updateTime) }}
          </p>
          <div class="meta">
            <div class="author">
              <img :src="blogItem.icon || defaultIcon" alt="" />
              <span>{{ blogItem.nickName || blogItem.name || "匿名用户" }}</span>
            </div>
            <div class="stats">
              <button type="button" class="like-btn" @click.stop="toggleLike(blogItem)">
                点赞 {{ blogItem.liked ?? 0 }}
              </button>
              <span class="comment-stat">评论 {{ blogItem.comments ?? 0 }}</span>
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
const loading = ref(false);
const hasMore = ref(true);
const activeTab = ref("hot");
const followCursorSeconds = ref(Math.floor(Date.now() / 1000));
const followOffset = ref(0);
const defaultIcon = "/image/default.png";

/** 探索卡片展示用时间 */
const formatTime = (t) => {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};
const filteredBlogs = computed(() => {
  const kw = props.keyword.trim().toLowerCase();
  if (!kw) return blogs.value;
  return blogs.value.filter((item) => {
    const title = (item.title || "").toLowerCase();
    const author = (item.nickName || item.name || "").toLowerCase();
    return title.includes(kw) || author.includes(kw);
  });
});

const fetchBlogs = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  try {
    const data =
      activeTab.value === "hot"
        ? await http.get("/blog/hot")
        : await http.get(`/blog/follows?seconds=${followCursorSeconds.value}&offset=${followOffset.value}`);

    let list = [];
    let nextSeconds = 0;
    if (Array.isArray(data)) {
      list = data;
    } else if (data && typeof data === "object") {
      list = Array.isArray(data.list) ? data.list : Array.isArray(data.records) ? data.records : [];
      nextSeconds = Number(data.seconds ?? data.nextSeconds ?? data.cursor ?? 0) || 0;
    }

    const mapped = list.map((item) => normalizeBlogCard(item));
    if (!mapped.length) {
      hasMore.value = false;
      return;
    }
    const exists = new Set(blogs.value.map((x) => x.id));
    blogs.value = blogs.value.concat(mapped.filter((x) => !exists.has(x.id)));

    if (activeTab.value === "follow") {
      if (nextSeconds > 0) followCursorSeconds.value = nextSeconds;
      followOffset.value = 1;
    }
  } finally {
    loading.value = false;
  }
};

const switchTab = async (tab) => {
  if (activeTab.value === tab) return;
  activeTab.value = tab;
  blogs.value = [];
  hasMore.value = true;
  if (tab === "follow") {
    followCursorSeconds.value = Math.floor(Date.now() / 1000);
    followOffset.value = 0;
  }
  try {
    await fetchBlogs();
  } catch (error) {
    ElMessage.error(error.message || "加载失败");
  }
};

const toggleLike = async (blogItem) => {
  try {
    await http.put(`/blog/like/${blogItem.id}`);
    const latest = await http.get(`/blog/${blogItem.id}`);
    const n = normalizeBlogCard(latest);
    blogItem.liked = n.liked;
    blogItem.comments = n.comments;
    blogItem.isLike = n.isLike;
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
  try {
    await fetchBlogs();
  } catch (error) {
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
  padding: 18px 22px;
}

.hero-title {
  margin: 0;
  font-size: 28px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
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

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tab-switch {
  display: flex;
  gap: 8px;
}

.tab-btn {
  border: 1px solid var(--kc-border-soft);
  border-radius: 999px;
  background: var(--kc-card);
  color: var(--kc-text);
  font-size: 13px;
  padding: 5px 12px;
  cursor: pointer;
}

.tab-btn.active {
  background: rgba(77, 92, 66, 0.12);
  border-color: var(--kc-border);
}

.blog-grid {
  margin-top: 16px;
  max-height: min(68vh, 820px);
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.blog-card {
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  overflow: visible;
  background: var(--kc-card-elevated);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  padding: 16px 18px;
  min-height: 112px;
  cursor: pointer;
}

.blog-card:hover {
  box-shadow: var(--kc-shadow-soft);
  transform: translateY(-2px);
}

.title {
  margin: 0;
  line-height: 1.45;
  font-size: 15px;
  font-weight: 600;
  color: var(--kc-text);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.time-line {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--kc-muted);
}

.meta {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: nowrap;
}

.stats {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.comment-stat {
  font-size: 13px;
  color: var(--kc-muted);
  user-select: none;
}

.author {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.author img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--kc-border-soft);
  flex-shrink: 0;
}

.author span {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  color: var(--kc-text);
}

.author.clickable {
  cursor: pointer;
}

.author.clickable:hover span {
  color: var(--el-color-primary);
}

.like-btn {
  flex-shrink: 0;
  border: 1px solid var(--kc-border-soft);
  border-radius: 999px;
  padding: 5px 12px;
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

  .meta {
    flex-wrap: wrap;
    align-items: center;
  }

  .stats {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
