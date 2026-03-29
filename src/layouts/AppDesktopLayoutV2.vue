<template>
  <div class="page-shell">
    <BaseTopNav2 @search-submit="onSearchSubmit" />
    <div class="main-wrap">
      <router-view v-slot="{ Component }">
        <component :is="Component" :keyword="keyword" />
      </router-view>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import BaseTopNav2 from "../components/BaseTopNav2.vue";

const keyword = ref("");
const onSearchSubmit = (value) => {
  keyword.value = value;
};
</script>

<style scoped>
.page-shell {
  min-height: 100vh;
  background: #f4f7fc;
}

.main-wrap {
  width: min(1440px, 96vw);
  margin: 18px auto 0;
  padding-bottom: 20px;
}
</style>
