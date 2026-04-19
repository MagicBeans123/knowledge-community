<template>
  <section class="page">
    <div class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>订单管理</h2>
    </div>

    <div class="card body tabs-card">
      <el-tabs v-model="activeTab" class="om-tabs">
        <el-tab-pane label="我的订单" name="buyer" lazy>
          <BuyerOrdersPanel />
        </el-tab-pane>
        <el-tab-pane label="商户订单" name="merchant" lazy>
          <MerchantOrdersPanel />
        </el-tab-pane>
      </el-tabs>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import BuyerOrdersPanel from "../components/orders/BuyerOrdersPanel.vue";
import MerchantOrdersPanel from "../components/orders/MerchantOrdersPanel.vue";

const router = useRouter();
const activeTab = ref("buyer");
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
  align-items: center;
  gap: 12px;
}
.back {
  padding: 0;
  color: var(--kc-muted);
}
.head h2 {
  margin: 0;
  font-size: 22px;
  color: var(--kc-text);
}
.body.tabs-card {
  padding: 8px 16px 16px;
}
.om-tabs :deep(.el-tabs__header) {
  margin-bottom: 14px;
}
.om-tabs :deep(.el-tabs__content) {
  overflow: visible;
}
</style>
