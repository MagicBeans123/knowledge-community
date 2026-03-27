<template>
  <div class="home-grid">
    <aside class="card side-card">
      <div class="title">分类导航</div>
      <div class="type-grid">
        <button
          v-for="typeItem in types"
          :key="typeItem.id"
          class="type-item"
          :class="{ active: activeType === typeItem.id }"
          @click="filterByType(typeItem)"
        >
          <img :src="getTypeIcon(typeItem.icon)" :alt="typeItem.name" />
          <span>{{ typeItem.name }}</span>
        </button>
      </div>
    </aside>

    <section class="card content-card">
      <div class="content-head">
        <div class="title">热门笔记</div>
        <div class="sub">共 {{ filteredBlogs.length }} 条</div>
      </div>
      <div class="blog-grid" @scroll="onScroll">
        <article v-for="blogItem in filteredBlogs" :key="blogItem.id" class="blog-card">
          <img class="cover" :src="blogItem.cover" :alt="blogItem.title" @click="goBlogDetail(blogItem.id)" />
          <div class="blog-title" @click="goBlogDetail(blogItem.id)">{{ blogItem.title }}</div>
          <div class="meta">
            <div class="author">
              <img :src="blogItem.icon || defaultIcon" alt="avatar" />
              <span>{{ blogItem.name || '匿名用户' }}</span>
            </div>
            <button class="like-btn" @click="toggleLike(blogItem)">
              <el-icon :class="{ liked: blogItem.isLike }"><StarFilled /></el-icon>
              <span>{{ blogItem.liked }}</span>
            </button>
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
import { StarFilled } from "@element-plus/icons-vue";
import http from "../api/http";

const props = defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const router = useRouter();
const types = ref([]);
const blogs = ref([]);
const page = ref(1);
const loading = ref(false);
const activeType = ref(null);
const defaultIcon = "/imgs/icons/default-icon.png";

const filteredBlogs = computed(() => {
  const kw = props.keyword.trim().toLowerCase();
  if (!kw) {
    return blogs.value;
  }
  return blogs.value.filter((blogItem) => {
    const title = (blogItem.title || "").toLowerCase();
    const userName = (blogItem.name || "").toLowerCase();
    return title.includes(kw) || userName.includes(kw);
  });
});

const getTypeIcon = (icon) => `/imgs/${icon}`;

const fetchTypes = async () => {
  types.value = await http.get("/shop-type/list");
};

const fetchBlogs = async () => {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    const list = await http.get(`/blog/hot?current=${page.value}`);
    const normalized = (Array.isArray(list) ? list : []).map((item) => ({
      ...item,
      cover: (item.images || "").split(",")[0] || ""
    }));
    blogs.value = blogs.value.concat(normalized);
  } finally {
    loading.value = false;
  }
};

const toggleLike = async (blogItem) => {
  await http.put(`/blog/like/${blogItem.id}`);
  const latest = await http.get(`/blog/${blogItem.id}`);
  blogItem.liked = latest.liked;
  blogItem.isLike = latest.isLike;
};

const filterByType = (typeItem) => {
  activeType.value = activeType.value === typeItem.id ? null : typeItem.id;
};

const goBlogDetail = (blogId) => {
  router.push(`/community/blog/${blogId}`);
};

const onScroll = async (event) => {
  const target = event.target;
  if (target.scrollTop + target.clientHeight < target.scrollHeight - 20) {
    return;
  }
  page.value += 1;
  try {
    await fetchBlogs();
  } catch (error) {
    ElMessage.error(error.message);
  }
};

watch(
  () => props.keyword,
  (newValue) => {
    if (newValue.trim()) {
      ElMessage.success("已按关键词筛选");
    }
  }
);

onMounted(async () => {
  try {
    await Promise.all([fetchTypes(), fetchBlogs()]);
  } catch (error) {
    ElMessage.error(error.message);
  }
});
</script>

<style scoped>
.home-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 18px;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 45, 80, 0.08);
}

.side-card {
  padding: 16px;
  max-height: calc(100vh - 130px);
  overflow: auto;
}

.content-card {
  padding: 16px;
}

.title {
  font-size: 20px;
  font-weight: 600;
}

.sub {
  color: #74809a;
}

.content-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.type-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.type-item {
  border: 1px solid #e8edf5;
  border-radius: 10px;
  background: #fff;
  padding: 10px 8px;
  cursor: pointer;
  transition: 0.2s;
}

.type-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.type-item.active {
  border-color: #2f4d2f;
  background: #f0f5ee;
}

.type-item img {
  width: 40px;
  height: 40px;
}

.type-item span {
  display: block;
  margin-top: 8px;
}

.blog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  height: calc(100vh - 210px);
  overflow: auto;
}

.blog-card {
  border: 1px solid #e8edf5;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.cover {
  width: 100%;
  height: 180px;
  object-fit: cover;
  cursor: pointer;
}

.blog-title {
  padding: 10px 12px 0;
  font-weight: 600;
  line-height: 1.4;
  height: 52px;
  cursor: pointer;
}

.meta {
  margin-top: auto;
  padding: 10px 12px 12px;
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
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.like-btn {
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.liked {
  color: #ff6a3d;
}
</style>
