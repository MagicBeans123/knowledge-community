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
import { onMounted, onUnmounted, ref } from "vue";
import { ElNotification } from "element-plus";
import BaseTopNav2 from "../components/BaseTopNav2.vue";

const keyword = ref("");
const onSearchSubmit = (value) => {
  keyword.value = value;
};

const onSeckillPush = (ev) => {
  const d = ev.detail;
  if (!d || typeof d !== "object") return;
  const title =
    d.event === "SECKILL_PUBLISHED" ? "关注店主上新秒杀" : "秒杀提醒";
  const msg = d.title || `商品 #${d.goodsId ?? ""}`;
  ElNotification({
    title,
    message: msg,
    duration: 4500
  });
};

const hasAuthToken = () => {
  const raw = sessionStorage.getItem("token");
  return Boolean(raw && raw !== "undefined" && raw !== "null" && raw.trim() !== "");
};

/** 进入社区壳时只连一次；断线后不自动重连（见 stompService reconnectDelay:0） */
const connectStompOnce = () => {
  if (!hasAuthToken()) return;
  import("../services/stompService.js")
    .then(({ ensureConnected }) => {
      try {
        ensureConnected();
      } catch (e) {
        console.warn("[stomp] ensureConnected failed", e);
      }
    })
    .catch((e) => console.warn("[stomp] module load failed", e));
};

onMounted(() => {
  window.addEventListener("kc-seckill", onSeckillPush);
  connectStompOnce();
});

onUnmounted(() => {
  window.removeEventListener("kc-seckill", onSeckillPush);
  import("../services/stompService.js")
    .then(({ disconnect }) => disconnect())
    .catch(() => {});
});
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
