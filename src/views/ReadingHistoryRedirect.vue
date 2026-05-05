<template>
  <div class="reading-history-redirect" v-loading="true" />
</template>

<script setup>
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { openReadingHistoryAsBlog } from "../utils/readingHistoryEntry";

const route = useRoute();
const router = useRouter();

onMounted(async () => {
  const ok = await openReadingHistoryAsBlog(router, route.params.historyId, { replace: true });
  if (!ok) {
    router.replace("/community/graph/history");
  }
});
</script>

<style scoped>
.reading-history-redirect {
  min-height: 240px;
}
</style>
