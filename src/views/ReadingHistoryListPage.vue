<template>
  <div class="history-list-page">
    <section class="card head card-pad">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>阅读轨迹</h2>
      <p class="sub">点击查看浏览知识网</p>
    </section>

    <section class="card list card-pad" v-loading="loading || navigating">
      <el-empty v-if="!loading && !items.length" description="暂无历史记录" />
      <ul v-else class="items">
        <li v-for="row in items" :key="rowKey(row)" @click="goDetail(row)">
          <div class="main">
            <span class="title">{{ row.title || row.name || row.id || "未命名会话" }}</span>
            <span class="muted" v-if="row.createTime">{{ formatDt(row.createTime) }}</span>
          </div>
          <span class="goto">查看 →</span>
        </li>
      </ul>
      <div v-if="total > pageSize" class="pager">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          @current-change="onPageChange"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { fetchGraphHistoryList } from "../api/graph";
import { openReadingHistoryAsBlog } from "../utils/readingHistoryEntry";

const router = useRouter();
const loading = ref(false);
const navigating = ref(false);
const items = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);

function rowKey(row) {
  return row.id ?? row.historyId ?? row.uuid ?? JSON.stringify(row).slice(0, 80);
}

function parseListPayload(raw) {
  if (Array.isArray(raw)) {
    return { list: raw, total: raw.length };
  }
  const p = raw && typeof raw === "object" ? raw : {};
  const list = Array.isArray(p.list)
    ? p.list
    : Array.isArray(p.records)
      ? p.records
      : Array.isArray(p.items)
        ? p.items
        : [];
  const totalVal = Number(p.total ?? p.totalCount ?? p.totalElements ?? list.length);
  const pageNow = Number(p.page ?? p.current ?? page.value);
  const sizeNow = Number(p.size ?? p.pageSize ?? pageSize.value);
  return { list, total: Number.isFinite(totalVal) ? totalVal : list.length, page: pageNow, size: sizeNow };
}

function formatDt(t) {
  if (!t) return "";
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return String(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function load() {
  loading.value = true;
  try {
    const data = await fetchGraphHistoryList({ page: page.value, size: pageSize.value });
    const { list, total: tv } = parseListPayload(data);
    items.value = list;
    total.value = tv;
  } catch (e) {
    ElMessage.error(e?.message || "加载失败");
    items.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onPageChange(p) {
  page.value = p;
  load();
}

async function goDetail(row) {
  const id = row.id ?? row.historyId;
  if (id == null || id === "") {
    ElMessage.warning("缺少历史 id");
    return;
  }
  navigating.value = true;
  try {
    await openReadingHistoryAsBlog(router, id, { replace: false });
  } finally {
    navigating.value = false;
  }
}

onMounted(() => {
  load();
});
</script>

<style scoped>
.history-list-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.card-pad {
  padding: 18px 20px;
}
.head h2 {
  margin: 8px 0 6px;
  font-size: 22px;
  color: var(--kc-text);
}
.sub {
  margin: 0;
  font-size: 13px;
  color: var(--kc-muted);
  line-height: 1.5;
}
.items {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.items li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--kc-border-soft);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.items li:hover {
  border-color: rgba(var(--kc-primary-rgb), 0.35);
  background: var(--kc-card-elevated);
}
.main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.title {
  font-weight: 600;
  color: var(--kc-text);
  word-break: break-all;
}
.muted {
  font-size: 12px;
  color: var(--kc-muted);
}
.goto {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--kc-subtle);
}
.pager {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
</style>
