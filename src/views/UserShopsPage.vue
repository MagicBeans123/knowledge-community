<template>
  <div class="page">
    <section class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2 v-if="nickName">{{ nickName }} 的商户</h2>
      <h2 v-else>用户商户</h2>
      <div class="nav-links">
        <router-link class="nav-link" :to="`/community/other-info/${uid}`">主页</router-link>
        <span class="nav-current">商店</span>
        <router-link class="nav-link" :to="`/community/user/${uid}/blogs`">博客</router-link>
      </div>
    </section>

    <section class="list card">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!shops.length" class="state muted">暂无商户</div>
      <div v-else class="grid">
        <article v-for="s in shops" :key="s.id" class="shop-card" @click="goDetail(s.id)">
          <div class="cover-wrap">
            <img v-if="s.cover" class="cover" :src="s.cover" :alt="s.name" loading="lazy" />
            <div v-else class="cover ph" aria-hidden="true" />
          </div>
          <div class="body">
            <h3>{{ s.name }}</h3>
            <p class="addr">{{ s.area || s.address }}</p>
            <div class="row">
              <span>评分 {{ s.score ?? "—" }}</span>
              <span v-if="s.avgPrice != null">人均 ¥{{ s.avgPrice }}</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeShop } from "../utils/dto";

const props = defineProps({
  userId: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const uid = props.userId || route.params.userId;

const loading = ref(true);
const shops = ref([]);
const nickName = ref("");

const goDetail = (id) => {
  router.push(`/community/shop/${id}`);
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
    const data = await http.get(`/shop/of/user/${uid}`);
    const list = Array.isArray(data) ? data : [];
    shops.value = list.map((x) => normalizeShop(x));
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    shops.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page {
  max-width: 960px;
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
  padding: 16px;
}

.state {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--kc-text);
}

.state.muted {
  color: var(--kc-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.shop-card {
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  overflow: hidden;
  background: var(--kc-card-elevated);
  cursor: pointer;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}

.shop-card:hover {
  box-shadow: var(--kc-shadow-soft);
  transform: translateY(-2px);
}

.cover-wrap {
  height: 140px;
  background: #ebe4d6;
}

.cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover.ph {
  background: linear-gradient(145deg, #e8dfd0, #d4c9b8);
}

.body {
  padding: 12px 14px 14px;
}

.body h3 {
  margin: 0 0 6px;
  font-size: 16px;
  color: var(--kc-text);
}

.addr {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--kc-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--kc-muted);
}
</style>
