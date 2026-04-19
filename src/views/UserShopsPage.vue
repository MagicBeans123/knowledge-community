<template>
  <div class="page">
    <section class="card head">
      <div class="head-row">
        <div class="head-left">
          <el-button text class="back" @click="router.back()">返回</el-button>
          <h2 v-if="nickName">{{ nickName }} 的商户</h2>
          <h2 v-else>用户商户</h2>
        </div>
        <el-button v-if="isOwnPage" type="primary" size="small" @click="goCreate">创建商铺</el-button>
      </div>
      <div class="nav-links">
        <router-link class="nav-link" :to="`/community/other-info/${uid}`">主页</router-link>
        <span class="nav-current">我的店铺</span>
        <router-link class="nav-link" :to="`/community/user/${uid}/blogs`">博客</router-link>
      </div>
    </section>

    <section class="list card">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!shops.length" class="state empty-block">
        <p class="muted">暂无商户</p>
        <el-button v-if="isOwnPage" type="primary" @click="goCreate">创建商铺</el-button>
      </div>
      <div v-else class="grid">
        <article v-for="s in shops" :key="s.id" class="shop-card" @click="goDetail(s.id)">
          <div class="cover-wrap">
            <img v-if="s.cover" class="cover" :src="s.cover" :alt="s.name" loading="lazy" />
            <div v-else class="cover ph" aria-hidden="true" />
            <div v-if="isOwnPage" class="card-actions" @click.stop>
              <button type="button" class="card-edit" @click="goEdit(s.id)">编辑</button>
              <button
                type="button"
                class="card-del"
                :disabled="deletingShopId === String(s.id)"
                @click="deleteShop(s)"
              >
                删除
              </button>
            </div>
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
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { normalizeShop } from "../utils/dto";
import { useUserStore } from "../stores/user";

const props = defineProps({
  userId: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);
const uid = props.userId || route.params.userId;

const isOwnPage = computed(() => {
  const mid = me.value?.id;
  if (mid == null || mid === "") return false;
  return String(mid) === String(uid);
});

const loading = ref(true);
const shops = ref([]);
const nickName = ref("");
const deletingShopId = ref("");

const goDetail = (id) => {
  router.push(`/community/shop/${id}`);
};

const goEdit = (id) => {
  router.push(`/community/shop/${id}/edit`);
};

const goCreate = () => {
  router.push(`/community/user/${uid}/shops/create`);
};

const deleteShop = async (row) => {
  const id = row?.id;
  if (id == null) return;
  const sid = String(id);
  try {
    await ElMessageBox.confirm(`确定删除「${row.name || "该店铺"}」吗？删除后不可恢复。`, "删除店铺", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button--danger"
    });
  } catch {
    return;
  }
  deletingShopId.value = sid;
  try {
    await http.delete(`/shop/${sid}`);
    ElMessage.success("已删除店铺");
    shops.value = shops.value.filter((s) => String(s.id) !== sid);
  } catch (e) {
    ElMessage.error(e.message || "删除失败");
  } finally {
    deletingShopId.value = "";
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    if (me.value?.id == null || me.value?.id === "") {
      await userStore.fetchMe();
    }
  } catch {
    /* ignore */
  }
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

.head-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.head-left {
  min-width: 0;
  flex: 1 1 200px;
}

.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.empty-block .muted {
  margin: 0;
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
  position: relative;
  height: 140px;
  background: #ebe4d6;
}

.card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: flex;
  gap: 6px;
}

.card-edit,
.card-del {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 8px;
  border: 1px solid var(--kc-border-soft);
  background: rgba(255, 255, 255, 0.92);
  cursor: pointer;
  box-shadow: var(--kc-shadow-soft);
}

.card-edit {
  color: var(--el-color-primary);
}

.card-edit:hover {
  background: #fff;
}

.card-del {
  color: var(--el-color-danger);
  border-color: rgba(245, 108, 108, 0.35);
}

.card-del:hover:not(:disabled) {
  background: #fff5f5;
}

.card-del:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
