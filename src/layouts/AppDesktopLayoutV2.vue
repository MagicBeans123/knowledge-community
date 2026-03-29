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
  background: var(--kc-page-bg);
}

.main-wrap {
  width: min(1320px, 96vw);
  margin: 20px auto 0;
  padding-bottom: 32px;
}
</style>
