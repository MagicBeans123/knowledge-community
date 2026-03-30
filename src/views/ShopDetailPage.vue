<template>
  <div v-if="shopLoading" class="card plain state">加载中…</div>
  <div v-else-if="!shop" class="card plain state">未找到该商户</div>
  <div class="detail" v-else-if="shop">
    <section class="card hero">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <div class="hero-main">
        <h1>{{ shop.name }}</h1>
        <p class="addr">{{ shop.address }}</p>
        <p v-if="shop.openHours" class="hours">营业时间 {{ shop.openHours }}</p>
        <div class="stats">
          <span>评分 {{ shop.score ?? "—" }}</span>
          <span>销量 {{ shop.sold ?? 0 }}</span>
          <span>评价 {{ shop.comments ?? 0 }}</span>
          <span v-if="shop.avgPrice != null">人均 ¥{{ shop.avgPrice }}</span>
        </div>
        <div v-if="shop.userId" class="owner-row">
          <router-link class="link" :to="`/community/other-info/${shop.userId}`">店主主页</router-link>
          <router-link class="link" :to="`/community/user/${shop.userId}/blogs`">店主博客</router-link>
          <el-button
            v-if="showFollow"
            size="small"
            type="primary"
            plain
            :loading="followLoading"
            @click="toggleFollowOwner"
          >
            {{ followOwnerText }}
          </el-button>
        </div>
      </div>
    </section>

    <section class="card block">
      <h2>优惠券</h2>
      <div v-if="vouchersLoading" class="muted">加载中…</div>
      <ul v-else-if="vouchers.length" class="v-list">
        <li v-for="v in vouchers" :key="v.id" class="v-item">
          <div>
            <strong>{{ v.title }}</strong>
            <p v-if="v.subTitle" class="sub">{{ v.subTitle }}</p>
            <p v-if="v.rules" class="rules">{{ v.rules }}</p>
          </div>
          <div class="price">
            <span class="pay">¥{{ v.payValue }}</span>
            <span class="actual">抵 ¥{{ v.actualValue }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="muted">暂无优惠券</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { useUserStore } from "../stores/user";
import { normalizeShop, normalizeVoucher } from "../utils/dto";

const props = defineProps({
  id: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);

const shop = ref(null);
const shopLoading = ref(true);
const vouchers = ref([]);
const vouchersLoading = ref(true);
const followedOwner = ref(false);
const followLoading = ref(false);

const shopId = props.id || route.params.id;

const showFollow = computed(() => {
  const uid = shop.value?.userId;
  if (!uid || !me.value?.id) return false;
  return Number(me.value.id) !== Number(uid);
});

const followOwnerText = computed(() => (followedOwner.value ? "取消关注店主" : "关注店主"));

const load = async () => {
  shopLoading.value = true;
  try {
    const raw = await http.get(`/shop/${shopId}`);
    shop.value = normalizeShop(raw);
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    shop.value = null;
  } finally {
    shopLoading.value = false;
  }
};

const loadFollowStatus = async () => {
  const uid = shop.value?.userId;
  if (!uid || !me.value?.id || Number(me.value.id) === Number(uid)) return;
  try {
    const flag = await http.get(`/follow/or/not/${uid}`);
    followedOwner.value = Boolean(flag);
  } catch {
    followedOwner.value = false;
  }
};

const toggleFollowOwner = async () => {
  const uid = shop.value?.userId;
  if (!uid) return;
  followLoading.value = true;
  try {
    await http.put(`/follow/${uid}/${!followedOwner.value}`);
    followedOwner.value = !followedOwner.value;
    ElMessage.success(followedOwner.value ? "已关注店主" : "已取消关注");
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    followLoading.value = false;
  }
};

const loadVouchers = async () => {
  vouchersLoading.value = true;
  try {
    const data = await http.get(`/voucher/of/shop/${shopId}`);
    vouchers.value = (Array.isArray(data) ? data : []).map((x) => normalizeVoucher(x));
  } catch {
    vouchers.value = [];
  } finally {
    vouchersLoading.value = false;
  }
};

onMounted(async () => {
  await userStore.fetchMe();
  await load();
  if (shop.value) {
    await loadFollowStatus();
    await loadVouchers();
  }
});
</script>

<style scoped>
.plain.state {
  padding: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--kc-muted);
}

.detail {
  display: grid;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.hero {
  padding: 20px 24px;
}

.back {
  padding: 0;
  margin-bottom: 8px;
  color: var(--kc-muted);
}

.hero-main h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.addr,
.hours {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--kc-muted);
}

.stats {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--kc-muted);
}

.owner-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.link {
  font-size: 14px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.block {
  padding: 20px 24px;
}

.block h2 {
  margin: 0 0 14px;
  font-size: 18px;
  color: var(--kc-text);
}

.muted {
  margin: 0;
  font-size: 14px;
  color: var(--kc-muted);
}

.v-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.v-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
}

.v-item strong {
  font-size: 15px;
  color: var(--kc-text);
}

.sub,
.rules {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.price {
  flex-shrink: 0;
  text-align: right;
}

.pay {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.actual {
  font-size: 12px;
  color: var(--kc-muted);
}
</style>
