<template>
  <section class="page">
    <div class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>订单支付</h2>
    </div>

    <div class="card body">
      <div v-if="loading" class="state">订单加载中…</div>
      <div v-else-if="!order" class="state muted">未找到订单</div>
      <template v-else>
        <div class="info">
          <p><b>订单号：</b>{{ order.id }}</p>
          <p><b>商品ID：</b>{{ order.goodsId }}</p>
          <p><b>收货地址：</b>{{ order.address || "--" }}</p>
          <p><b>购买数量：</b>{{ order.sum ?? 1 }}</p>
          <p><b>支付方式：</b>{{ payTypeText(order.payType) }}</p>
          <p><b>订单状态：</b>{{ statusText(order.status) }}</p>
          <p><b>下单时间：</b>{{ order.createTime || "--" }}</p>
        </div>
        <div class="actions">
          <el-button @click="router.push('/community/orders')">查看历史订单</el-button>
          <el-button :loading="paying === 0" @click="payOrder(0)">微信支付</el-button>
          <el-button type="primary" :loading="paying === 1" @click="payOrder(1)">支付宝支付</el-button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

const route = useRoute();
const router = useRouter();
const normalizeOrderId = (value) => {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : "";
};
const orderId = normalizeOrderId(route.params.orderId);
const loading = ref(true);
const paying = ref(-1);
const order = ref(null);

const payTypeText = (payType) => {
  if (Number(payType) === 1) return "余额支付";
  if (Number(payType) === 2) return "支付宝";
  if (Number(payType) === 3) return "微信";
  return "未知";
};

const statusText = (status) => {
  const s = Number(status);
  if (s === 1) return "未支付";
  if (s === 2) return "已支付";
  if (s === 3) return "已核销";
  if (s === 4) return "已取消";
  if (s === 5) return "退款中";
  if (s === 6) return "已退款";
  return "未知";
};

const loadOrderDetail = async () => {
  if (!orderId) {
    order.value = null;
    throw new Error("订单号无效");
  }
  const data = await http.get(`/goods/order/detail/${orderId}`);
  order.value = data || null;
};

const payOrder = async (paytype) => {
  if (![0, 1].includes(Number(paytype))) {
    ElMessage.error("支付方式参数错误");
    return;
  }
  paying.value = Number(paytype);
  try {
    await http.get("/goods/order/paysuccess", {
      params: {
        orderId,
        paytype: Number(paytype)
      }
    });
    ElMessage.success("支付成功");
    await loadOrderDetail();
  } catch (e) {
    ElMessage.error(e.message || "支付失败");
  } finally {
    paying.value = -1;
  }
};

onMounted(async () => {
  loading.value = true;
  try {
    await loadOrderDetail();
  } catch (e) {
    ElMessage.error(e.message || "加载订单详情失败");
    order.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page { display: grid; gap: 14px; }
.card { background: var(--kc-card); border: 1px solid var(--kc-border); border-radius: 14px; box-shadow: var(--kc-shadow); }
.head { padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
.back { padding: 0; color: var(--kc-muted); }
.head h2 { margin: 0; font-size: 22px; color: var(--kc-text); }
.body { padding: 16px; }
.state { padding: 24px; text-align: center; color: var(--kc-text); }
.state.muted { color: var(--kc-muted); }
.info p { margin: 6px 0; color: var(--kc-text); font-size: 14px; }
.actions { margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px; }
</style>
