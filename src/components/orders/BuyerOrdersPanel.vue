<template>
  <div class="buyer-panel">
    <div v-if="loading" class="state">加载中…</div>
    <template v-else>
      <div class="buyer-toolbar">
        <el-radio-group v-model="processFilter" size="small" class="process-rg" @change="onBuyerProcessChange">
          <el-radio-button :label="ORDER_PROCESS_FILTER.ALL">全部</el-radio-button>
          <el-radio-button :label="ORDER_PROCESS_FILTER.PENDING">未处理</el-radio-button>
          <el-radio-button :label="ORDER_PROCESS_FILTER.COMPLETE">已处理</el-radio-button>
        </el-radio-group>
        <el-select
          v-model="statusFilter"
          placeholder="订单状态"
          clearable
          size="small"
          class="status-select"
          @change="onBuyerStatusChange"
        >
          <el-option label="全部状态" value="" />
          <el-option
            v-for="opt in buyerStatusSelectOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </div>
      <div v-if="!orders.length && current === 1" class="state muted">暂无订单</div>
      <div v-else-if="!orders.length" class="state muted">本页暂无订单，请返回上一页</div>
      <ul v-else class="list">
        <li v-for="item in orders" :key="item.id" class="row">
          <div v-if="orderCover(item)" class="row-thumb-wrap">
            <img :src="orderCover(item)" alt="" class="row-thumb" />
          </div>
          <div class="main">
            <p v-if="orderTitle(item)" class="row-goods-title">{{ orderTitle(item) }}</p>
            <p><b>订单号：</b>{{ item.id }}</p>
            <p><b>地址：</b>{{ item.address || "--" }}</p>
            <p><b>数量：</b>{{ item.sum ?? 1 }}</p>
            <p><b>支付方式：</b>{{ formatPayType(item.payType) }}</p>
            <p><b>状态：</b>{{ formatOrderStatus(item.status) }}</p>
            <p><b>下单时间：</b>{{ item.createTime || "--" }}</p>
          </div>
          <div class="row-actions">
            <el-button size="small" @click="showDetail(item.id)">订单详情</el-button>
            <el-button
              v-if="orderIsUnpaid(item)"
              size="small"
              type="primary"
              @click="goPay(item)"
            >
              去支付
            </el-button>
            <el-button
              v-if="canBuyerConfirmReceive(item)"
              size="small"
              type="primary"
              plain
              :loading="receivingId === idKey(item)"
              @click="confirmReceiveRow(item)"
            >
              确认收货
            </el-button>
            <el-button
              v-if="canBuyerCancelUnpaidOrder(item)"
              size="small"
              type="danger"
              plain
              :loading="cancellingId === idKey(item)"
              @click="cancelOrderRow(item)"
            >
              取消订单
            </el-button>
            <el-button
              v-if="canBuyerApplyRefundWhenPaid(item)"
              size="small"
              type="warning"
              plain
              :loading="refundingApplyId === idKey(item)"
              @click="applyRefundRow(item)"
            >
              申请退款
            </el-button>
          </div>
        </li>
      </ul>

      <el-pagination
        v-if="!loading && ordersTotal > 0"
        class="pager"
        background
        layout="total, sizes, prev, pager, next"
        :total="ordersTotal"
        :current-page="current"
        :page-size="size"
        :page-sizes="[5, 10, 20, 30]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </template>

    <el-dialog v-model="detailVisible" title="订单详情" width="560px">
      <div v-if="detailLoading" class="state">加载中…</div>
      <template v-else-if="detail">
        <div v-if="orderTitle(detail) || parseOrderImageUrls(detail).length" class="detail-goods">
          <div v-if="parseOrderImageUrls(detail).length" class="detail-imgs">
            <img
              v-for="(src, idx) in parseOrderImageUrls(detail).slice(0, 4)"
              :key="idx"
              :src="src"
              alt=""
              class="detail-thumb"
            />
          </div>
          <p v-if="orderTitle(detail)" class="detail-title">{{ orderTitle(detail) }}</p>
        </div>
        <div class="detail-meta">
          <p><b>商品ID：</b>{{ detail.goodsId ?? "--" }}</p>
          <p><b>订单号：</b>{{ detail.id }}</p>
          <p><b>收货人：</b>{{ detail.name || "--" }}</p>
          <p><b>地址：</b>{{ detail.address || "--" }}</p>
          <p><b>数量：</b>{{ detail.sum ?? 1 }}</p>
          <p><b>支付方式：</b>{{ formatPayType(detail.payType) }}</p>
          <p><b>状态：</b>{{ formatOrderStatus(detail.status) }}</p>
          <p><b>下单时间：</b>{{ detail.createTime || "--" }}</p>
          <p><b>支付时间：</b>{{ detail.payTime ?? "--" }}</p>
          <p><b>更新时间：</b>{{ detail.updateTime || "--" }}</p>
        </div>
      </template>
      <p v-else class="muted">未查到订单详情</p>
      <template #footer>
        <div v-if="detail && !detailLoading" class="dialog-foot">
          <el-button v-if="orderIsUnpaid(detail)" type="primary" @click="goPay(detail)">
            去支付
          </el-button>
          <el-button
            v-if="canBuyerConfirmReceive(detail)"
            type="primary"
            plain
            :loading="receivingId === idKey(detail)"
            @click="confirmReceiveDetail"
          >
            确认收货
          </el-button>
          <el-button
            v-if="canBuyerCancelUnpaidOrder(detail)"
            type="danger"
            plain
            :loading="cancellingId === idKey(detail)"
            @click="cancelOrderDetail"
          >
            取消订单
          </el-button>
          <el-button
            v-if="canBuyerApplyRefundWhenPaid(detail)"
            type="warning"
            plain
            :loading="refundingApplyId === idKey(detail)"
            @click="applyRefundDetail"
          >
            申请退款
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../../api/http";
import { parseOrderImageUrls } from "../../utils/dto";
import {
  formatPayType,
  formatOrderStatus,
  canBuyerCancelUnpaidOrder,
  canBuyerApplyRefundWhenPaid,
  canBuyerConfirmReceive,
  orderIsUnpaid,
  ORDER_PROCESS_FILTER,
  orderStatusOptionsForProcessFilter
} from "../../constants/payType";

const router = useRouter();

const loading = ref(true);
const orders = ref([]);
/** 未处理 / 已处理 / 全部（与接口 query `filter` 一致） */
const processFilter = ref(ORDER_PROCESS_FILTER.ALL);
/** 按 status 1～7 筛选；空字符串为不限 */
const statusFilter = ref("");
const buyerStatusSelectOptions = computed(() => orderStatusOptionsForProcessFilter(processFilter.value));
const current = ref(1);
const size = ref(10);
/** 与 ShopGoodsPage 一致：后端无总条数时用伪总数，保证分页器可翻页 */
const ordersTotal = ref(0);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref(null);
const cancellingId = ref("");
const refundingApplyId = ref("");
const receivingId = ref("");

const idKey = (row) => {
  const id = row?.id;
  if (id === null || typeof id === "undefined") return "";
  return String(id);
};

const goPay = (row) => {
  const oid = idKey(row);
  if (!oid || !orderIsUnpaid(row)) return;
  router.push(`/community/order/pay/${oid}`);
};

const orderTitle = (o) => {
  const t = o?.title;
  if (t == null) return "";
  const s = String(t).trim();
  return s || "";
};

const orderCover = (o) => {
  const list = parseOrderImageUrls(o);
  return list[0] || "";
};

/** 只解析列表，不依赖后端返回总条数 */
const extractRecords = (data) => {
  if (Array.isArray(data)) return data;
  let raw = data || {};
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) {
    raw = raw.data;
  }
  if (Array.isArray(raw.records)) return raw.records;
  if (Array.isArray(raw.list)) return raw.list;
  if (Array.isArray(raw.content)) return raw.content;
  return [];
};

/**
 * @param {{ silent?: boolean }} [opts] silent 为 true 时不展示整页「加载中」，用于取消/收货后刷新，避免列表被整块替换导致按钮闪烁
 */
const loadOrders = async (page = current.value, pageSize = size.value, opts = {}) => {
  const silent = opts.silent === true;
  const p = Math.max(1, Number(page) || 1);
  const sz = Math.max(1, Number(pageSize) || 10);
  current.value = p;
  size.value = sz;
  if (!silent) loading.value = true;
  try {
    const qs = new URLSearchParams();
    qs.set("current", String(p));
    qs.set("size", String(sz));
    if (processFilter.value && processFilter.value !== ORDER_PROCESS_FILTER.ALL) {
      qs.set("filter", processFilter.value);
    }
    if (statusFilter.value !== "" && statusFilter.value != null) {
      qs.set("status", String(statusFilter.value));
    }
    const data = await http.get(`/goods/order/history?${qs.toString()}`);
    const records = extractRecords(data);
    orders.value = records;
    const resolvedCurrent = Number(data?.current ?? p) || p;
    const resolvedSize = Number(data?.size ?? sz) || sz;
    current.value = resolvedCurrent;
    size.value = resolvedSize;
    let total = Number(data?.total);
    if (!Number.isFinite(total) || total < 0) {
      const base = (resolvedCurrent - 1) * resolvedSize;
      total = base + records.length + (records.length >= resolvedSize ? 1 : 0);
    }
    ordersTotal.value = total;
  } catch (e) {
    ElMessage.error(e.message || "加载我的订单失败");
    orders.value = [];
    ordersTotal.value = 0;
  } finally {
    if (!silent) loading.value = false;
  }
};

const onBuyerProcessChange = () => {
  const allowed = new Set(buyerStatusSelectOptions.value.map((o) => o.value));
  if (statusFilter.value !== "" && statusFilter.value != null && !allowed.has(Number(statusFilter.value))) {
    statusFilter.value = "";
  }
  current.value = 1;
  loadOrders(1, size.value);
};

const onBuyerStatusChange = () => {
  current.value = 1;
  loadOrders(1, size.value);
};

const onPageChange = (page) => {
  loadOrders(page, size.value);
};

const onSizeChange = (newSize) => {
  loadOrders(1, newSize);
};

const showDetail = async (orderId) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detail.value = null;
  try {
    const data = await http.get(`/goods/order/detail/${orderId}`);
    detail.value = data || null;
  } catch (e) {
    ElMessage.error(e.message || "加载订单详情失败");
  } finally {
    detailLoading.value = false;
  }
};

const confirmReceiveRow = async (row) => {
  const oid = idKey(row);
  if (!oid || !canBuyerConfirmReceive(row)) return;
  try {
    await ElMessageBox.confirm("确认已收到商品？确认后订单将标记为已完成。", "确认收货", {
      type: "info",
      confirmButtonText: "确认收货",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  receivingId.value = oid;
  try {
    await http.post(`/goods/order/buyer/receive/${oid}`);
    ElMessage.success("已确认收货");
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    receivingId.value = "";
  }
};

const confirmReceiveDetail = async () => {
  const row = detail.value;
  const oid = idKey(row);
  if (!oid || !canBuyerConfirmReceive(row)) return;
  try {
    await ElMessageBox.confirm("确认已收到商品？确认后订单将标记为已完成。", "确认收货", {
      type: "info",
      confirmButtonText: "确认收货",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  receivingId.value = oid;
  try {
    await http.post(`/goods/order/buyer/receive/${oid}`);
    ElMessage.success("已确认收货");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detail.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    receivingId.value = "";
  }
};

const cancelOrderRow = async (row) => {
  const oid = idKey(row);
  if (!oid || !canBuyerCancelUnpaidOrder(row)) return;
  try {
    await ElMessageBox.confirm("确定取消该订单？未付款订单取消后将无法继续支付。", "取消订单", {
      type: "warning",
      confirmButtonText: "确定取消",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  cancellingId.value = oid;
  try {
    await http.delete(`/goods/order/cancel/${oid}`);
    ElMessage.success("订单已取消");
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "取消失败");
  } finally {
    cancellingId.value = "";
  }
};

const applyRefundRow = async (row) => {
  const oid = idKey(row);
  if (!oid || !canBuyerApplyRefundWhenPaid(row)) return;
  try {
    await ElMessageBox.confirm(
      "已支付订单申请退款后将进入「退款中」，商户处理后将退款；是否继续？",
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
  refundingApplyId.value = oid;
  try {
    await http.post(`/goods/order/buyer/refund/apply/${oid}`);
    ElMessage.success("已提交退款申请");
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "申请失败");
  } finally {
    refundingApplyId.value = "";
  }
};

const applyRefundDetail = async () => {
  const row = detail.value;
  const oid = idKey(row);
  if (!oid || !canBuyerApplyRefundWhenPaid(row)) return;
  try {
    await ElMessageBox.confirm(
      "已支付订单申请退款后将进入「退款中」，商户处理后将退款；是否继续？",
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
  refundingApplyId.value = oid;
  try {
    await http.post(`/goods/order/buyer/refund/apply/${oid}`);
    ElMessage.success("已提交退款申请");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detail.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "申请失败");
  } finally {
    refundingApplyId.value = "";
  }
};

const cancelOrderDetail = async () => {
  const row = detail.value;
  const oid = idKey(row);
  if (!oid || !canBuyerCancelUnpaidOrder(row)) return;
  try {
    await ElMessageBox.confirm("确定取消该订单？未付款订单取消后将无法继续支付。", "取消订单", {
      type: "warning",
      confirmButtonText: "确定取消",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  cancellingId.value = oid;
  try {
    await http.delete(`/goods/order/cancel/${oid}`);
    ElMessage.success("订单已取消");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detail.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadOrders(current.value, size.value, { silent: true });
  } catch (e) {
    ElMessage.error(e.message || "取消失败");
  } finally {
    cancellingId.value = "";
  }
};

onMounted(async () => {
  await loadOrders(current.value, size.value);
});
</script>

<style scoped>
.buyer-panel {
  min-height: 120px;
}

.buyer-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
  margin-bottom: 14px;
}

.process-rg {
  flex-shrink: 0;
}

.buyer-toolbar .status-select {
  width: 140px;
}
.state {
  padding: 24px;
  text-align: center;
  color: var(--kc-text);
}
.state.muted,
.muted {
  color: var(--kc-muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
  padding: 12px;
}
.row-thumb-wrap {
  flex-shrink: 0;
}
.row-thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--kc-border-soft);
  display: block;
}
.row-goods-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kc-text);
  line-height: 1.35;
}
.row-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}
.main {
  flex: 1;
  min-width: 0;
}
.main p {
  margin: 2px 0;
  font-size: 13px;
  color: var(--kc-text);
}
.detail-goods {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--kc-border-soft);
}
.detail-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.detail-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--kc-border-soft);
}
.detail-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--kc-text);
}
.detail-meta p {
  margin: 6px 0;
  font-size: 14px;
  color: var(--kc-text);
}
.dialog-foot {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
.pager {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}
</style>
