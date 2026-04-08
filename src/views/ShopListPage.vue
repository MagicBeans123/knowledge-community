<template>
  <div class="shop-page">
    <section class="head card">
      <h2 class="title">商户</h2>
      <div class="head-actions">
        <el-button type="primary" size="small" @click="goCreate">创建商户</el-button>
        <el-select
        v-if="types.length"
        v-model="activeTypeId"
        class="type-select"
        placeholder="分类"
        @change="resetAndLoad"
      >
        <el-option label="全部" value="" />
        <el-option v-for="t in types" :key="t.id" :label="t.name || `分类${t.id}`" :value="t.id" />
      </el-select>
      </div>
    </section>

    <section class="list card">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!shops.length" class="state muted">暂无商户</div>
      <div v-else>
        <div class="grid">
          <article v-for="s in shops" :key="s.id" class="shop-card" @click="goDetail(s.id)">
            <div class="cover-wrap">
              <img v-if="s.cover" class="cover" :src="s.cover" :alt="s.name" loading="lazy" />
              <div v-else class="cover ph" aria-hidden="true" />
            </div>
            <div class="body">
              <h3>{{ s.name }}</h3>
              <p class="addr">{{ s.address }}</p>
              <div class="row">
                <span>评分 {{ s.score ?? "—" }}</span>
                <span>销量 {{ s.sold ?? 0 }}</span>
              </div>
            </div>
          </article>
        </div>
        <div class="pager">
          <el-button v-if="hasMore" :loading="loadingMore" @click="loadMore">加载更多</el-button>
          <span v-else class="muted">没有更多了</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeShop } from "../utils/dto";

defineProps({
  keyword: { type: String, default: "" }
});

const router = useRouter();
const types = ref([]);
const activeTypeId = ref("");
const shops = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const current = ref(1);
const size = 10;

const loadShops = async () => {
  const firstPage = current.value === 1;
  if (firstPage) loading.value = true;
  else loadingMore.value = true;
  try {
    // 默认“全部”：不按类型过滤；选择类型后再按类型分页查询
    if (activeTypeId.value === "") {
      const data = await http.get("/shop/hot");
      const list = (Array.isArray(data) ? data : []).map((x) => normalizeShop(x));
      shops.value = list;
      hasMore.value = false;
    } else {
      const data = await http.get(`/shop/of/type/${activeTypeId.value}?current=${current.value}&size=${size}`);
      const list = (Array.isArray(data) ? data : []).map((x) => normalizeShop(x));
      if (firstPage) shops.value = list;
      else shops.value = shops.value.concat(list);
      hasMore.value = list.length >= size;
    }
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    if (firstPage) shops.value = [];
    hasMore.value = false;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const resetAndLoad = async () => {
  current.value = 1;
  hasMore.value = true;
  shops.value = [];
  await loadShops();
};

const loadMore = async () => {
  if (!hasMore.value || loadingMore.value || loading.value) return;
  current.value += 1;
  await loadShops();
};

const goDetail = (id) => {
  router.push(`/community/shop/${id}`);
};

const goCreate = () => {
  router.push("/community/shop-create");
};

onMounted(async () => {
  loading.value = true;
  try {
    try {
      const data = await http.get("/type/list");
      types.value = Array.isArray(data) ? data : [];
    } catch {
      types.value = [];
    }
    await resetAndLoad();
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
  }
});
</script>

<style scoped>
.shop-page {
  display: grid;
  gap: 16px;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.head {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-left: auto;
}

.title {
  margin: 0;
  font-size: 26px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.type-select {
  width: 200px;
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

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
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
