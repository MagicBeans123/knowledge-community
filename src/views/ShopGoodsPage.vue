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
      <div v-else-if="!visibleGoods.length" class="state muted">暂无商品</div>
      <ul v-else-if="visibleGoods.length" class="items">
        <li v-for="g in visibleGoods" :key="g.id" class="item">
          <div class="main">
            <div>
              <strong>{{ g.title }}</strong>
              <span v-if="Number(g.type) === 1" class="tag">秒杀</span>
              <span class="status-tag" :class="statusClass(g.status)">{{ statusText(g.status) }}</span>
              <span v-if="Number(g.type) === 1 && g.out" class="expired-tag">已过期</span>
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
            <el-button size="small" @click="goGoodsDetail(g)">详情</el-button>
            <el-button
              v-if="isShopOwner && Number(g.status) === 1"
              size="small"
              type="warning"
              :loading="isStatusLoading(g.id)"
              @click="updateGoodsStatus(g.id, 2)"
            >
              下架
            </el-button>
            <el-button
              v-if="isShopOwner && Number(g.status) === 2"
              size="small"
              type="success"
              :loading="isStatusLoading(g.id)"
              @click="updateGoodsStatus(g.id, 1)"
            >
              上架
            </el-button>
            <el-button
              v-if="isShopOwner"
              size="small"
              type="danger"
              plain
              :loading="deletingGoodsId === String(g.id)"
              :disabled="isStatusLoading(g.id)"
              @click="deleteGoods(g.id)"
            >
              删除
            </el-button>
          </div>
        </li>
      </ul>
      <div v-else class="state muted">当前类型暂无商品</div>
      <el-pagination
        v-if="!loading && goodsTotal > 0"
        class="pager"
        background
        layout="total, sizes, prev, pager, next"
        :total="pagerTotal"
        :current-page="goodsCurrent"
        :page-size="goodsSize"
        :page-sizes="[5, 10, 20, 30]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../api/http";
import { normalizeGoods, normalizeShop } from "../utils/dto";
import { useUserStore } from "../stores/user";
import { storeToRefs } from "pinia";

const props = defineProps({
  id: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);
const shopId = props.id || route.params.id;

const loading = ref(true);
const goods = ref([]);
const allGoods = ref([]);
const shopName = ref("");
const goodsTypeFilter = ref("all");
const goodsCurrent = ref(1);
const goodsSize = ref(10);
const goodsTotal = ref(0);
const localPaging = ref(false);
const selectedGoodsType = computed(() => (goodsTypeFilter.value === "all" ? null : Number(goodsTypeFilter.value)));
const viewerId = ref("");
const shopOwnerId = ref("");
const statusLoadingMap = ref({});
const deletingGoodsId = ref("");
const isShopOwner = computed(() => {
  if (!viewerId.value || !shopOwnerId.value) return false;
  return String(viewerId.value) === String(shopOwnerId.value);
});

const filteredGoods = computed(() => (localPaging.value ? allGoods.value : goods.value));
const visibleGoods = computed(() => {
  if (!localPaging.value) return filteredGoods.value;
  const start = (goodsCurrent.value - 1) * goodsSize.value;
  return filteredGoods.value.slice(start, start + goodsSize.value);
});
const pagerTotal = computed(() => (localPaging.value ? filteredGoods.value.length : goodsTotal.value));
const statusText = (status) => {
  const s = Number(status);
  if (s === 1) return "上架";
  if (s === 2) return "下架";
  if (s === 3) return "过期";
  return "未知";
};
const statusClass = (status) => {
  const s = Number(status);
  if (s === 1) return "is-on";
  if (s === 2) return "is-off";
  if (s === 3) return "is-expired";
  return "";
};
const isStatusLoading = (goodsId) => Boolean(statusLoadingMap.value[String(goodsId)]);

const goGoodsDetail = (goodsItem) => {
  if (!goodsItem?.id) return;
  const type = Number(goodsItem.type) === 1 ? 1 : 0;
  router.push(`/community/goods/${goodsItem.id}?type=${type}`);
};

const updateGoodsStatus = async (goodsId, nextStatus) => {
  if (!goodsId) return;
  const gid = String(goodsId);
  statusLoadingMap.value = { ...statusLoadingMap.value, [gid]: true };
  try {
    if (Number(nextStatus) === 2) {
      await http.put(`/goods/${gid}/off`);
    } else if (Number(nextStatus) === 1) {
      await http.put(`/goods/${gid}/on`);
    } else {
      return;
    }
    ElMessage.success(Number(nextStatus) === 2 ? "下架成功" : "上架成功");
    await loadGoodsPage(goodsCurrent.value, goodsSize.value);
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    statusLoadingMap.value = { ...statusLoadingMap.value, [gid]: false };
  }
};

const deleteGoods = async (goodsId) => {
  if (!goodsId) return;
  const gid = String(goodsId);
  try {
    await ElMessageBox.confirm("删除后不可恢复，确定删除该商品？", "删除商品", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }
  deletingGoodsId.value = gid;
  try {
    await http.delete(`/goods/${gid}`);
    ElMessage.success("已删除商品");
    await loadGoodsPage(goodsCurrent.value, goodsSize.value);
  } catch (e) {
    ElMessage.error(e.message || "删除失败");
  } finally {
    deletingGoodsId.value = "";
  }
};

const loadGoodsPage = async (page = goodsCurrent.value, size = goodsSize.value) => {
  const query = new URLSearchParams();
  query.set("current", String(page));
  query.set("size", String(size));
  if (selectedGoodsType.value !== null && Number.isFinite(selectedGoodsType.value)) {
    query.set("type", String(selectedGoodsType.value));
  }
  const goodsRaw = await http.get(`/goods/of/shop/${shopId}?${query.toString()}`);
  if (Array.isArray(goodsRaw)) {
    localPaging.value = false;
    const records = goodsRaw.map((x) => normalizeGoods(x));
    goods.value = records;
    allGoods.value = [];
    goodsCurrent.value = Number(page) || 1;
    goodsSize.value = Number(size) || 10;
    // 后端仅返回当前页列表时，使用“伪总数”让 next 可点击继续请求下一页
    const base = (goodsCurrent.value - 1) * goodsSize.value;
    goodsTotal.value = base + records.length + (records.length >= goodsSize.value ? 1 : 0);
    return;
  }
  localPaging.value = false;
  const records = Array.isArray(goodsRaw?.records) ? goodsRaw.records : [];
  goods.value = records.map((x) => normalizeGoods(x));
  allGoods.value = [];
  goodsCurrent.value = Number(goodsRaw?.current ?? page) || page;
  goodsSize.value = Number(goodsRaw?.size ?? size) || size;
  goodsTotal.value = Number(goodsRaw?.total ?? records.length) || 0;
};

const onPageChange = async (page) => {
  goodsCurrent.value = page;
  if (localPaging.value) {
    return;
  }
  loading.value = true;
  try {
    await loadGoodsPage(page, goodsSize.value);
  } finally {
    loading.value = false;
  }
};

const onSizeChange = async (size) => {
  goodsSize.value = size;
  goodsCurrent.value = 1;
  if (localPaging.value) {
    return;
  }
  loading.value = true;
  try {
    await loadGoodsPage(1, size);
  } finally {
    loading.value = false;
  }
};

watch(goodsTypeFilter, async () => {
  goodsCurrent.value = 1;
  loading.value = true;
  try {
    await loadGoodsPage(1, goodsSize.value);
  } finally {
    loading.value = false;
  }
});

onMounted(async () => {
  loading.value = true;
  try {
    await userStore.fetchMe();
    viewerId.value = String(me.value?.id ?? "");
    const [shopRaw] = await Promise.all([http.get(`/shop/${shopId}`)]);
    const normalizedShop = normalizeShop(shopRaw);
    shopName.value = normalizedShop?.name || "";
    shopOwnerId.value = String(normalizedShop?.userId ?? "");
    await loadGoodsPage(goodsCurrent.value, goodsSize.value);
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    goods.value = [];
    goodsTotal.value = 0;
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
.expired-tag { margin-left: 8px; font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #fee4e2; color: #b42318; border: 1px solid #fecdca; }
.status-tag {
  margin-left: 8px;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid transparent;
}
.status-tag.is-on {
  color: #027a48;
  background: #ecfdf3;
  border-color: #abefc6;
}
.status-tag.is-off {
  color: #344054;
  background: #f2f4f7;
  border-color: #d0d5dd;
}
.status-tag.is-expired {
  color: #b42318;
  background: #fee4e2;
  border-color: #fecdca;
}
.img-row { margin-top: 8px; display: flex; gap: 8px; overflow-x: auto; }
.img-row img { width: 96px; height: 64px; object-fit: cover; border: 1px solid var(--kc-border-soft); border-radius: 8px; }
.price { flex-shrink: 0; text-align: right; }
.pay { display: block; font-size: 18px; font-weight: 700; color: var(--el-color-primary); }
.actual { font-size: 12px; color: var(--kc-muted); }
.pager { margin-top: 14px; display: flex; justify-content: flex-end; }
</style>

