<template>
  <div class="page">
    <section class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2 v-if="nickName">{{ nickName }} 的博客</h2>
      <h2 v-else>用户博客</h2>
    </section>

    <section class="card list">
      <div v-if="loading" class="muted">加载中…</div>
      <div v-else-if="!blogs.length" class="muted">暂无博客</div>
      <ul v-else class="items">
        <li v-for="b in blogs" :key="b.id" @click="goBlog(b.id)">
          <span class="t">{{ b.title }}</span>
          <span class="d">{{ formatDate(b.createTime) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
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
const uid = props.userId || route.params.userId;

const loading = ref(true);
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

onMounted(async () => {
  loading.value = true;
  try {
    const u = await http.get(`/user/${uid}`);
    nickName.value = u?.nickName ?? u?.nick_name ?? "";
  } catch {
    nickName.value = "";
  }
  try {
    const data = await http.get(`/blog/of/user/${uid}`);
    const list = Array.isArray(data) ? data : [];
    blogs.value = list.map((x) => normalizeBlogCard(x));
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    blogs.value = [];
  } finally {
    loading.value = false;
  }
});
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
  margin: 0;
  font-size: 22px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.list {
  padding: 8px 0;
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
