<template>
  <div class="page">
    <section class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2 v-if="nickName">{{ nickName }} 的博客</h2>
      <h2 v-else>用户博客</h2>
      <div class="nav-links">
        <router-link class="nav-link" :to="`/community/other-info/${uid}`">主页</router-link>
        <router-link class="nav-link" :to="`/community/user/${uid}/shops`">商店</router-link>
        <span class="nav-current">博客</span>
      </div>
    </section>

    <section class="card list">
      <div v-if="initialLoading" class="muted">加载中…</div>
      <div v-else-if="!blogs.length" class="muted">暂无博客</div>
      <div v-else class="list-scroll" @scroll="onScroll">
        <ul class="items">
          <li v-for="b in blogs" :key="b.id" @click="goBlog(b.id)">
            <span class="t">{{ b.title }}</span>
            <span class="d">{{ formatDate(b.createTime) }}</span>
          </li>
        </ul>
        <p v-if="loadingMore" class="load-more">加载中…</p>
        <p v-else-if="!hasMore && blogs.length" class="load-more end">没有更多了</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeBlogCard } from "../utils/dto";

const props = defineProps({
  userId: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const uid = computed(() => String(props.userId || route.params.userId || ""));

const page = ref(1);
const hasMore = ref(true);
const loading = ref(false);
const initialLoading = ref(true);
const loadingMore = ref(false);
const blogs = ref([]);
const nickName = ref("");

const formatDate = (t) => {
  if (!t) return "";
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const goBlog = (id) => {
  router.push(`/community/blog/${id}`);
};

const loadNickName = async () => {
  try {
    const u = await http.get(`/user/${uid.value}`);
    nickName.value = u?.nickName ?? u?.nick_name ?? "";
  } catch {
    nickName.value = "";
  }
};

const fetchBlogs = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  if (blogs.value.length) loadingMore.value = true;
  try {
    const data = await http.get(`/blog/of/user/${uid.value}?current=${page.value}`);
    const list = Array.isArray(data) ? data : [];
    const mapped = list.map((x) => normalizeBlogCard(x));
    blogs.value = blogs.value.concat(mapped);
    if (!list.length) hasMore.value = false;
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    throw e;
  } finally {
    loading.value = false;
    loadingMore.value = false;
    initialLoading.value = false;
  }
};

const resetAndLoad = async () => {
  page.value = 1;
  hasMore.value = true;
  blogs.value = [];
  initialLoading.value = true;
  await loadNickName();
  await fetchBlogs();
};

const onScroll = async (event) => {
  const target = event.target;
  if (target.scrollTop + target.clientHeight < target.scrollHeight - 20) return;
  if (!hasMore.value || loading.value) return;
  page.value += 1;
  try {
    await fetchBlogs();
  } catch {
    page.value -= 1;
  }
};

onMounted(() => resetAndLoad());

watch(
  () => uid.value,
  (next, prev) => {
    if (!next || next === prev) return;
    resetAndLoad();
  }
);

</script>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.head {
  padding: 16px 20px;
}

.back {
  padding: 0;
  margin-bottom: 8px;
  color: var(--kc-muted);
}

.head h2 {
  margin: 0 0 10px;
  font-size: 22px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 14px;
}

.nav-link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.nav-current {
  color: var(--kc-text);
  font-weight: 600;
}

.list {
  padding: 0;
}

.list-scroll {
  max-height: min(68vh, 720px);
  overflow-y: auto;
  padding: 8px 0;
}

.load-more {
  margin: 0;
  padding: 12px 20px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--kc-muted);
}

.load-more.end {
  opacity: 0.85;
}

.muted {
  padding: 20px;
  text-align: center;
  font-size: 14px;
  color: var(--kc-muted);
}

.items {
  list-style: none;
  margin: 0;
  padding: 0;
}

.items li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--kc-border-soft);
  font-size: 15px;
  color: var(--kc-text);
}

.items li:last-child {
  border-bottom: none;
}

.items li:hover {
  background: rgba(77, 92, 66, 0.06);
}

.t {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--kc-muted);
}
</style>
