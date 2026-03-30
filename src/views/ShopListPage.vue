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
        @change="loadShops"
      >
        <el-option v-for="t in types" :key="t.id" :label="t.name || `分类${t.id}`" :value="t.id" />
      </el-select>
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
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeShop } from "../utils/dto";

defineProps({
  keyword: { type: String, default: "" }
});

const router = useRouter();
const types = ref([]);
const activeTypeId = ref(null);
const shops = ref([]);
const loading = ref(true);

const loadShops = async () => {
  loading.value = true;
  try {
    const data =
      activeTypeId.value != null
        ? await http.get(`/shop/of/type/${activeTypeId.value}`)
        : await http.get("/shop/hot");
    shops.value = (Array.isArray(data) ? data : []).map((x) => normalizeShop(x));
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    shops.value = [];
  } finally {
    loading.value = false;
  }
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
      if (types.value.length) {
        activeTypeId.value = types.value[0].id;
      }
    } catch {
      types.value = [];
    }
    await loadShops();
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
