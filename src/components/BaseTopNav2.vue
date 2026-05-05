<template>
  <header class="top-nav">
    <div class="brand" @click="toHome">Knowledge Community</div>
    <el-input
      v-model="searchText"
      class="search"
      clearable
      placeholder="搜索文章、作者、标签"
      @keyup.enter="emitSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <div class="actions">
      <el-button class="nav-btn" @click="toExplore">知识探索</el-button>
      <el-button class="nav-btn" @click="toShops">商户</el-button>
      <el-button class="nav-btn" @click="toReadingHistory">阅读轨迹</el-button>
      <el-button class="nav-btn" @click="toInfo">个人中心</el-button>
      <el-button type="primary" class="nav-primary" @click="toPublish">发布帖子</el-button>
    </div>
  </header>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Search } from "@element-plus/icons-vue";

const emit = defineEmits(["search-submit"]);
const searchText = ref("");
const router = useRouter();

const emitSearch = () => {
  emit("search-submit", searchText.value);
};

const toHome = () => router.push("/community/explore");
const toExplore = () => router.push("/community/explore");
const toShops = () => router.push("/community/shops");
const toReadingHistory = () => router.push("/community/graph/history");
const toInfo = () => router.push("/community/info");
const toPublish = () => router.push("/community/blog-edit");
</script>

<style scoped>
.top-nav {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: var(--kc-card);
  border-bottom: 1px solid var(--kc-border);
  box-shadow: var(--kc-shadow-soft);
}

.brand {
  min-width: 220px;
  color: var(--kc-text);
  font-weight: 700;
  font-size: 20px;
  font-family: Georgia, "Times New Roman", serif;
  letter-spacing: 0.02em;
  cursor: pointer;
}

.search {
  flex: 1;
  max-width: 560px;
}

.search :deep(.el-input__wrapper) {
  background: var(--kc-card-elevated);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px var(--kc-border-soft);
}

.search :deep(.el-input__wrapper:hover),
.search :deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px var(--kc-border);
}

.actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.nav-btn {
  background: transparent;
  border: 1px solid var(--kc-border-soft);
  color: var(--kc-text);
}

.nav-btn:hover {
  border-color: var(--kc-border);
  background: rgba(255, 253, 247, 0.8);
  color: var(--kc-text);
}

.nav-primary {
  font-weight: 600;
}
</style>
