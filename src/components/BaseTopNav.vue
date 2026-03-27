<template>
  <header class="top-nav">
    <div class="brand" @click="toHome">Knowledge Community</div>
    <el-input
      v-model="searchText"
      class="search"
      placeholder="搜索文章、作者"
      @keyup.enter="emitSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    <div class="actions">
      <el-button @click="toInfo">个人中心</el-button>
      <el-button type="primary" @click="toPublish">发布</el-button>
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

const toHome = () => router.push("/community");
const toInfo = () => router.push("/info");
const toPublish = () => router.push("/blog-edit");
</script>

<style scoped>
.top-nav {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: linear-gradient(90deg, #ff6a3d, #ff8b4f);
}

.brand {
  min-width: 260px;
  color: #fff;
  font-weight: 700;
  font-size: 22px;
  cursor: pointer;
}

.search {
  flex: 1;
}

.actions {
  display: flex;
  gap: 10px;
}
</style>
