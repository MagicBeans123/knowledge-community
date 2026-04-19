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
        <div class="goods-block" v-if="orderTitle(order) || parseOrderImageUrls(order).length">
          <div v-if="parseOrderImageUrls(order).length" class="goods-imgs">
            <img
              v-for="(src, idx) in parseOrderImageUrls(order).slice(0, 4)"
              :key="idx"
              :src="src"
              alt=""
              class="goods-thumb"
            />
          </div>
          <p v-if="orderTitle(order)" class="goods-title">{{ orderTitle(order) }}</p>
        </div>
        <div class="info">
          <p><b>商品ID：</b>{{ order.goodsId ?? "--" }}</p>
          <p><b>订单号：</b>{{ order.id }}</p>
          <p><b>收货人：</b>{{ order.name || "--" }}</p>
          <p><b>收货地址：</b>{{ order.address || "--" }}</p>
          <p><b>购买数量：</b>{{ order.sum ?? 1 }}</p>
          <p><b>支付方式：</b>{{ formatPayType(order.payType) }}</p>
          <p><b>订单状态：</b>{{ formatOrderStatus(order.status) }}</p>
          <p><b>下单时间：</b>{{ order.createTime || "--" }}</p>
          <p><b>支付时间：</b>{{ order.payTime ?? "--" }}</p>
          <p><b>更新时间：</b>{{ order.updateTime || "--" }}</p>
        </div>
        <p v-if="order && orderIsPaidSuccess(order)" class="hint">
          订单已支付成功。如需退款，未发货前可申请退款（进入退款中）；已发货请前往订单管理处理。
        </p>
        <p v-else-if="order && !orderIsUnpaid(order)" class="hint muted">当前订单状态不支持继续支付或取消。</p>
        <div class="actions">
          <el-button @click="router.push('/community/orders')">订单管理</el-button>
          <template v-if="orderIsUnpaid(order)">
            <el-button type="danger" plain :loading="cancelling" @click="cancelOrder">取消订单</el-button>
            <el-button :loading="paying === PAY_TYPE.WECHAT_PAY" @click="payOrder(PAY_TYPE.WECHAT_PAY)">微信支付</el-button>
            <el-button type="primary" :loading="paying === PAY_TYPE.ALI_PAY" @click="payOrder(PAY_TYPE.ALI_PAY)">支付宝支付</el-button>
          </template>
          <el-button
            v-else-if="order && canBuyerApplyRefundWhenPaid(order)"
            type="warning"
            plain
            :loading="refunding"
            @click="applyRefund"
          >
            申请退款
          </el-button>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../api/http";
import { parseOrderImageUrls } from "../utils/dto";
import {
  PAY_TYPE,
  formatPayType,
  formatOrderStatus,
  orderIsUnpaid,
  orderIsPaidSuccess,
  canBuyerApplyRefundWhenPaid
} from "../constants/payType";

const route = useRoute();
const router = useRouter();
const normalizeOrderId = (value) => {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : "";
};
const orderId = normalizeOrderId(route.params.orderId);
const loading = ref(true);
const paying = ref(-1);
const cancelling = ref(false);
const refunding = ref(false);
const order = ref(null);

const orderTitle = (o) => {
  const t = o?.title;
  if (t == null) return "";
  const s = String(t).trim();
  return s || "";
};

const INITIAL_POLL_TIMES = 6;
const INITIAL_POLL_INTERVAL_MS = 1500;

const loadOrderDetail = async () => {
  if (!orderId) {
    order.value = null;
    throw new Error("订单号无效");
  }
  const data = await http.get(`/goods/order/detail/${orderId}`);
  order.value = data || null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadOrderDetailWithRetry = async (times = INITIAL_POLL_TIMES, intervalMs = INITIAL_POLL_INTERVAL_MS) => {
  let lastError = null;
  for (let i = 0; i < times; i += 1) {
    try {
      await loadOrderDetail();
      if (order.value) return;
      lastError = new Error("订单暂未生成");
    } catch (e) {
      lastError = e;
    }
    if (i < times - 1) {
      await sleep(intervalMs);
    }
  }
  throw lastError || new Error("加载订单详情失败");
};

const applyRefund = async () => {
  if (!orderId || !canBuyerApplyRefundWhenPaid(order.value)) return;
  try {
    await ElMessageBox.confirm(
      "已支付订单申请退款后将进入「退款中」，由商户确认后完成退款。是否继续？",
      "申请退款",
      {
        type: "warning",
        confirmButtonText: "申请退款",
        cancelButtonText: "返回"
      }
    );
  } catch {
    return;
  }
  refunding.value = true;
  try {
    await http.post(`/goods/order/buyer/refund/apply/${orderId}`);
    ElMessage.success("已提交退款申请");
    await loadOrderDetail();
  } catch (e) {
    ElMessage.error(e.message || "申请失败");
  } finally {
    refunding.value = false;
  }
};

const cancelOrder = async () => {
  if (!orderId || !orderIsUnpaid(order.value)) return;
  try {
    await ElMessageBox.confirm("确定取消该订单？未付款订单取消后将无法继续支付。", "取消订单", {
      type: "warning",
      confirmButtonText: "确定取消",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  cancelling.value = true;
  try {
    await http.delete(`/goods/order/cancel/${orderId}`);
    ElMessage.success("订单已取消");
    await loadOrderDetail();
  } catch (e) {
    ElMessage.error(e.message || "取消失败");
  } finally {
    cancelling.value = false;
  }
};

const payOrder = async (paytype) => {
  if (!orderIsUnpaid(order.value)) {
    ElMessage.warning("当前订单不可支付");
    return;
  }
  const p = Number(paytype);
  if (![PAY_TYPE.WECHAT_PAY, PAY_TYPE.ALI_PAY].includes(p)) {
    ElMessage.error("支付方式参数错误");
    return;
  }
  paying.value = p;
  try {
    await http.post("/goods/order/paysuccess", null, {
      params: {
        orderId,
        paytype: p
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
    await loadOrderDetailWithRetry();
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
.goods-block { margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--kc-border-soft); }
.goods-imgs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.goods-thumb { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid var(--kc-border-soft); }
.goods-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--kc-text); line-height: 1.4; }
.info p { margin: 6px 0; color: var(--kc-text); font-size: 14px; }
.hint { margin: 0 0 12px; font-size: 13px; color: var(--kc-text); }
.hint.muted { color: var(--kc-muted); }
.actions { margin-top: 16px; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
</style>
