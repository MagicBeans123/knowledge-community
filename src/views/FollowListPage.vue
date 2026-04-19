<template>
  <section class="page">
    <div class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <div class="head-main">
        <h2>{{ pageTitle }}</h2>
        <div class="nav-links">
          <router-link class="nav-link" :to="`/community/other-info/${uid}`">主页</router-link>
          <router-link
            class="nav-link"
            :class="{ current: !isFollowers }"
            :to="`/community/user/${uid}/following`"
          >
            Ta 的关注
          </router-link>
          <router-link
            class="nav-link"
            :class="{ current: isFollowers }"
            :to="`/community/user/${uid}/followers`"
          >
            Ta 的粉丝
          </router-link>
          <router-link class="nav-link" :to="`/community/user/${uid}/blogs`">博客</router-link>
          <router-link class="nav-link" :to="`/community/user/${uid}/shops`">商店</router-link>
        </div>
      </div>
    </div>

    <div class="card body">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!records.length" class="state muted">暂无数据</div>
      <template v-else>
        <ul class="list">
          <li v-for="u in records" :key="String(u.id)" class="row" @click="goUser(u.id)">
            <img class="avatar" :src="u.icon || defaultIcon" alt="" />
            <div class="main">
              <p class="name">{{ u.nickName || "用户" }}</p>
              <p class="sub">{{ u.city || "" }} {{ u.introduce ? " · " + String(u.introduce).slice(0, 48) : "" }}</p>
            </div>
            <span class="chev">›</span>
          </li>
        </ul>
        <el-pagination
          class="pager"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="current"
          :page-size="size"
          :page-sizes="[10, 20, 50]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizePublicUser } from "../utils/dto";

const props = defineProps({
  userId: { type: [String, Number], default: "" }
});

const route = useRoute();
const router = useRouter();
const defaultIcon = "/image/default.png";

const uid = computed(() => String(props.userId || route.params.userId || "").trim());

const isFollowers = computed(() => route.name === "user-followers");

const pageTitle = computed(() => {
  const label = targetNick.value || `用户 ${uid.value}`;
  return isFollowers.value ? `${label} 的粉丝` : `${label} 的关注`;
});

const targetNick = ref("");
const loading = ref(true);
const records = ref([]);
const current = ref(1);
const size = ref(20);
const total = ref(0);

const parsePage = (data, page, pageSize) => {
  if (Array.isArray(data)) {
    return {
      records: data.map((x) => normalizePublicUser(x)),
      total: data.length,
      current: page,
      size: pageSize
    };
  }
  const rec = Array.isArray(data?.records)
    ? data.records
    : Array.isArray(data?.list)
      ? data.list
      : [];
  return {
    records: rec.map((x) => normalizePublicUser(x)),
    total: Number(data?.total ?? rec.length) || 0,
    current: Number(data?.current ?? page) || page,
    size: Number(data?.size ?? pageSize) || pageSize
  };
};

const loadTargetNick = async () => {
  if (!uid.value) {
    targetNick.value = "";
    return;
  }
  try {
    const raw = await http.get(`/user/${uid.value}`);
    const u = normalizePublicUser(raw);
    targetNick.value = u?.nickName || "";
  } catch {
    targetNick.value = "";
  }
};

const loadList = async (page = current.value, pageSize = size.value) => {
  if (!uid.value) {
    ElMessage.error("用户 id 无效");
    records.value = [];
    total.value = 0;
    return;
  }
  loading.value = true;
  try {
    const path = isFollowers.value ? `/follow/followers/${uid.value}` : `/follow/following/${uid.value}`;
    const data = await http.get(`${path}?current=${page}&size=${pageSize}`);
    const parsed = parsePage(data, page, pageSize);
    records.value = parsed.records;
    total.value = parsed.total;
    current.value = parsed.current;
    size.value = parsed.size;
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    records.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const onPageChange = async (page) => {
  current.value = page;
  await loadList(page, size.value);
};

const onSizeChange = async (newSize) => {
  size.value = newSize;
  current.value = 1;
  await loadList(1, newSize);
};

const goUser = (id) => {
  if (id == null || id === "") return;
  router.push(`/community/other-info/${id}`);
};

watch(
  () => [uid.value, route.name],
  async () => {
    if (!uid.value) {
      loading.value = false;
      records.value = [];
      total.value = 0;
      return;
    }
    current.value = 1;
    await loadTargetNick();
    await loadList(1, size.value);
  },
  { immediate: true }
);
</script>

<style scoped>
.page {
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
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.head-main {
  flex: 1;
  min-width: 0;
}
.back {
  padding: 0;
  color: var(--kc-muted);
}
.head h2 {
  margin: 0 0 10px;
  font-size: 22px;
  color: var(--kc-text);
}
.nav-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  font-size: 14px;
}
.nav-link {
  color: var(--kc-muted);
  text-decoration: none;
}
.nav-link:hover {
  color: var(--kc-text);
}
.nav-link.current {
  color: var(--kc-text);
  font-weight: 600;
}
.body {
  padding: 16px;
}
.state {
  padding: 24px;
  text-align: center;
  color: var(--kc-text);
}
.state.muted {
  color: var(--kc-muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
  cursor: pointer;
}
.row:hover {
  border-color: var(--kc-border);
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.main {
  flex: 1;
  min-width: 0;
}
.name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--kc-text);
}
.sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--kc-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chev {
  color: var(--kc-muted);
  font-size: 18px;
}
.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
