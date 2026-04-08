<template>
  <div class="page">
    <section class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>{{ shopName ? `${shopName} 的全部商品` : "全部商品" }}</h2>
      <div class="head-actions">
        <el-select v-model="goodsTypeFilter" size="small" class="type-select">
          <el-option label="全部类型" value="all" />
          <el-option label="普通商品" value="0" />
          <el-option label="秒杀商品" value="1" />
        </el-select>
        <router-link class="nav-link" :to="`/community/shop/${shopId}`">商店详情</router-link>
      </div>
    </section>

    <section class="card list">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!goods.length" class="state muted">暂无商品</div>
      <ul v-else-if="filteredGoods.length" class="items">
        <li v-for="g in filteredGoods" :key="g.id" class="item">
          <div class="main">
            <div>
              <strong>{{ g.title }}</strong>
              <span v-if="Number(g.type) === 1" class="tag">秒杀</span>
            </div>
            <p v-if="g.description" class="desc">{{ g.description }}</p>
            <div v-if="g.imageList?.length" class="img-row">
              <img v-for="(img, idx) in g.imageList" :key="img + idx" :src="img" alt="" />
            </div>
            <p v-if="Number(g.type) === 1" class="meta">
              库存 {{ g.stock ?? 0 }} · {{ g.beginTime || "-" }} ~ {{ g.endTime || "-" }}
            </p>
          </div>
          <div class="price">
            <span class="pay">¥{{ g.payValue }}</span>
            <span class="actual">抵 ¥{{ g.actualValue }}</span>
          </div>
        </li>
      </ul>
      <div v-else class="state muted">当前类型暂无商品</div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizeGoods, normalizeShop } from "../utils/dto";

const props = defineProps({
  id: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const shopId = props.id || route.params.id;

const loading = ref(true);
const goods = ref([]);
const shopName = ref("");
const goodsTypeFilter = ref("all");

const filteredGoods = computed(() => {
  if (goodsTypeFilter.value === "all") return goods.value;
  return goods.value.filter((g) => String(g.type ?? 0) === String(goodsTypeFilter.value));
});

onMounted(async () => {
  loading.value = true;
  try {
    const [shopRaw, goodsRaw] = await Promise.all([http.get(`/shop/${shopId}`), http.get(`/goods/of/shop/${shopId}`)]);
    shopName.value = normalizeShop(shopRaw)?.name || "";
    goods.value = (Array.isArray(goodsRaw) ? goodsRaw : []).map((x) => normalizeGoods(x));
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    goods.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page { max-width: 920px; margin: 0 auto; display: grid; gap: 14px; }
.card { background: var(--kc-card); border: 1px solid var(--kc-border); border-radius: 14px; box-shadow: var(--kc-shadow); }
.head { padding: 16px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.back { padding: 0; color: var(--kc-muted); }
.head h2 { margin: 0; font-size: 22px; color: var(--kc-text); }
.head-actions { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.type-select { width: 120px; }
.nav-link { color: var(--el-color-primary); text-decoration: none; }
.list { padding: 16px; }
.state { padding: 24px; text-align: center; color: var(--kc-text); }
.state.muted { color: var(--kc-muted); }
.items { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.item { display: flex; justify-content: space-between; gap: 12px; border: 1px solid var(--kc-border-soft); border-radius: 10px; background: var(--kc-card-elevated); padding: 12px; }
.desc, .meta { margin: 6px 0 0; font-size: 13px; color: var(--kc-muted); }
.tag { margin-left: 8px; font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #fff3e6; color: #b54708; border: 1px solid #ffd8a8; }
.img-row { margin-top: 8px; display: flex; gap: 8px; overflow-x: auto; }
.img-row img { width: 96px; height: 64px; object-fit: cover; border: 1px solid var(--kc-border-soft); border-radius: 8px; }
.price { flex-shrink: 0; text-align: right; }
.pay { display: block; font-size: 18px; font-weight: 700; color: var(--el-color-primary); }
.actual { font-size: 12px; color: var(--kc-muted); }
</style>

