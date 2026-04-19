<template>
  <div class="merchant-panel">
    <div v-if="merchantAuthLoading" class="state">加载中…</div>
    <div v-else-if="userId == null || userId === ''" class="state muted">请先登录后查看商户订单</div>
    <template v-else>
      <div class="analytics-toolbar">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="起始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="onRangeOrShopChange"
        />
        <el-select
          v-model="selectedShopId"
          placeholder="店铺"
          filterable
          style="width: 220px"
          @change="onRangeOrShopChange"
        >
          <el-option label="全部店铺" value="" />
          <el-option v-for="s in shops" :key="s.id" :label="s.name" :value="String(s.id)" />
        </el-select>
        <el-button :loading="chartLoading" @click="refreshAnalytics">刷新数据</el-button>
      </div>

      <div class="analytics-row">
        <div class="chart-wrap">
          <div v-if="chartLoading" class="chart-state">图表加载中…</div>
          <div v-show="!chartLoading" ref="chartRef" class="chart-box" />
        </div>
        <div class="kpi-column">
          <div class="kpi-card">
            <span class="kpi-label">成功卖出商品量</span>
            <strong class="kpi-val">{{ fmtInt(summary.soldQuantity) }}</strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">营业额</span>
            <strong class="kpi-val">¥{{ fmtMoney(summary.revenue) }}</strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">完成率</span>
            <strong class="kpi-val">{{ formatRate(summary.completionRate) }}</strong>
          </div>
          <div class="kpi-card">
            <span class="kpi-label">总订单量</span>
            <strong class="kpi-val">{{ fmtInt(summary.totalOrders) }}</strong>
          </div>
        </div>
      </div>

      <p v-if="analyticsNote" class="analytics-note">{{ analyticsNote }}</p>

      <h3 class="sub-title">我的店铺</h3>
      <div v-if="shopsLoading" class="state">店铺加载中…</div>
      <div v-else-if="!shops.length" class="state muted">暂无店铺，请先在个人中心「我的店铺」中创建商铺</div>
      <div v-else class="shop-strips">
        <div v-for="s in shops" :key="s.id" class="shop-strip">
          <div class="shop-strip-head" @click="toggleShop(s.id)">
            <img v-if="s.cover" :src="s.cover" class="shop-mini-cover" alt="" />
            <div v-else class="shop-mini-cover ph" />
            <div class="shop-strip-meta">
              <span class="shop-name">{{ s.name }}</span>
              <span class="shop-sub">{{ s.address || "—" }}</span>
            </div>
            <span class="chev">{{ expandedShopId === String(s.id) ? "收起" : "展开" }}</span>
          </div>
          <div v-show="expandedShopId === String(s.id)" class="shop-strip-body">
            <div class="mo-filters">
              <el-radio-group
                :model-value="shopFilter(s.id)"
                size="small"
                class="filter-rg"
                @update:model-value="(v) => setShopFilter(s.id, v)"
              >
                <el-radio-button label="all">全部</el-radio-button>
                <el-radio-button label="pending">未处理</el-radio-button>
                <el-radio-button label="complete">已处理</el-radio-button>
              </el-radio-group>
              <el-select
                :model-value="shopStatusFilter(s.id)"
                placeholder="订单状态"
                clearable
                size="small"
                class="status-select"
                @update:model-value="(v) => setShopStatusFilter(s.id, v)"
              >
                <el-option label="全部状态" :value="EMPTY_STATUS" />
                <el-option
                  v-for="opt in shopStatusOptions(s.id)"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </div>
            <div v-if="shopOrdersLoading[String(s.id)]" class="state sm">订单加载中…</div>
            <div v-else-if="!(shopOrdersMap[String(s.id)]?.length)" class="state sm muted">暂无订单</div>
            <ul v-else class="mo-list">
              <li v-for="item in shopOrdersMap[String(s.id)]" :key="item.id" class="mo-row">
                <div v-if="moCover(item)" class="mo-thumb-wrap">
                  <img :src="moCover(item)" alt="" class="mo-thumb" />
                </div>
                <div class="mo-main">
                  <p v-if="moTitle(item)" class="mo-title">{{ moTitle(item) }}</p>
                  <p><b>订单号：</b>{{ item.id }}</p>
                  <p><b>数量：</b>{{ item.sum ?? 1 }}</p>
                  <p><b>状态：</b>{{ formatOrderStatus(item.status) }}</p>
                  <p><b>下单时间：</b>{{ item.createTime || "--" }}</p>
                </div>
                <div class="mo-actions">
                  <el-button size="small" @click="openDetail(item.id, s.id)">详情</el-button>
                  <el-button
                    v-if="canMerchantShipOrder(item)"
                    size="small"
                    type="primary"
                    :loading="shippingId === idKey(item)"
                    @click.stop="shipOrderRow(s.id, item)"
                  >
                    配送
                  </el-button>
                  <el-button
                    v-if="canMerchantCancelOrder(item)"
                    size="small"
                    type="danger"
                    plain
                    :loading="merchantCancellingId === idKey(item)"
                    @click.stop="merchantCancelRow(s.id, item)"
                  >
                    取消订单
                  </el-button>
                  <el-button
                    v-if="canMerchantCompleteRefund(item)"
                    size="small"
                    type="warning"
                    plain
                    :loading="merchantRefundCompleteId === idKey(item)"
                    @click.stop="merchantRefundCompleteRow(s.id, item)"
                  >
                    同意退款
                  </el-button>
                </div>
              </li>
            </ul>
            <el-pagination
              v-if="
                !shopOrdersLoading[String(s.id)] &&
                merchantPagerVisible(String(s.id))
              "
              class="pager"
              background
              layout="total, sizes, prev, pager, next"
              :total="shopOrderPager[String(s.id)]?.total ?? 0"
              :current-page="shopOrderPager[String(s.id)]?.current ?? 1"
              :page-size="shopOrderPager[String(s.id)]?.size ?? 10"
              :page-sizes="[5, 10, 20, 30]"
              @current-change="(p) => onMerchantOrderPageChange(s.id, p)"
              @size-change="(sz) => onMerchantOrderSizeChange(s.id, sz)"
            />
          </div>
        </div>
      </div>
    </template>

    <el-dialog v-model="detailVisible" title="订单详情" width="560px">
      <div v-if="detailLoading" class="state">加载中…</div>
      <template v-else-if="detailRow">
        <div v-if="moTitle(detailRow) || parseOrderImageUrls(detailRow).length" class="mo-detail-goods">
          <div v-if="parseOrderImageUrls(detailRow).length" class="mo-detail-imgs">
            <img
              v-for="(src, idx) in parseOrderImageUrls(detailRow).slice(0, 4)"
              :key="idx"
              :src="src"
              alt=""
              class="mo-detail-thumb"
            />
          </div>
          <p v-if="moTitle(detailRow)" class="mo-detail-title">{{ moTitle(detailRow) }}</p>
        </div>
        <div class="mo-detail-meta">
          <p><b>商品ID：</b>{{ detailRow.goodsId ?? "--" }}</p>
          <p><b>订单号：</b>{{ detailRow.id }}</p>
          <p><b>收货人：</b>{{ detailRow.name || "--" }}</p>
          <p><b>地址：</b>{{ detailRow.address || "--" }}</p>
          <p><b>数量：</b>{{ detailRow.sum ?? 1 }}</p>
          <p><b>支付方式：</b>{{ formatPayType(detailRow.payType) }}</p>
          <p><b>状态：</b>{{ formatOrderStatus(detailRow.status) }}</p>
          <p><b>下单时间：</b>{{ detailRow.createTime || "--" }}</p>
          <p><b>支付时间：</b>{{ detailRow.payTime ?? "--" }}</p>
          <p><b>更新时间：</b>{{ detailRow.updateTime || "--" }}</p>
        </div>
      </template>
      <template #footer>
        <div v-if="detailRow && !detailLoading" class="mo-dialog-foot">
          <el-button
            v-if="canMerchantShipOrder(detailRow)"
            type="primary"
            :loading="shippingId === idKey(detailRow)"
            @click="shipOrderDetail"
          >
            配送
          </el-button>
          <el-button
            v-if="canMerchantCancelOrder(detailRow)"
            type="danger"
            plain
            :loading="merchantCancellingId === idKey(detailRow)"
            @click="merchantCancelDetail"
          >
            取消订单
          </el-button>
          <el-button
            v-if="canMerchantCompleteRefund(detailRow)"
            type="warning"
            plain
            :loading="merchantRefundCompleteId === idKey(detailRow)"
            @click="merchantRefundCompleteDetail"
          >
            同意退款
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import * as echarts from "echarts";
import { ElMessage, ElMessageBox } from "element-plus";
import http from "../../api/http";
import { useUserStore } from "../../stores/user";
import { normalizeShop, parseOrderImageUrls } from "../../utils/dto";
import {
  formatOrderStatus,
  formatPayType,
  MERCHANT_ORDER_FILTER,
  ORDER_PROCESS_FILTER,
  orderStatusOptionsForProcessFilter,
  canMerchantShipOrder,
  canMerchantCancelOrder,
  canMerchantCompleteRefund
} from "../../constants/payType";

const userStore = useUserStore();
const userId = computed(() => userStore.user?.id ?? null);
/** 有 token 时需先 fetchMe，避免 user 未加载就误判未登录 */
const merchantAuthLoading = ref(true);

const defaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  const ymd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return [ymd(start), ymd(end)];
};

const dateRange = ref(defaultDateRange());
const selectedShopId = ref("");
const shops = ref([]);
const shopsLoading = ref(false);
const chartRef = ref(null);
let chartInst = null;
const chartLoading = ref(false);
const analyticsNote = ref("");

const summary = reactive({
  soldQuantity: null,
  revenue: null,
  completionRate: null,
  totalOrders: null
});

const expandedShopId = ref(null);
const EMPTY_STATUS = "";
const shopFilters = reactive({});
/** 按订单 status（1～7）精确筛选；空字符串表示不限定状态 */
const shopStatusFilters = reactive({});
const shopOrdersMap = reactive({});
const shopOrdersLoading = reactive({});
/** 每店铺订单列表分页（与店铺商品列表一致：total/current/size） */
const shopOrderPager = reactive({});

const detailVisible = ref(false);
const detailLoading = ref(false);
const detailRow = ref(null);
/** 详情弹窗打开时的店铺 id，用于操作后刷新列表 */
const detailShopId = ref(null);

const shippingId = ref("");
const merchantCancellingId = ref("");
const merchantRefundCompleteId = ref("");

const idKey = (row) => {
  const id = row?.id;
  if (id === null || typeof id === "undefined") return "";
  return String(id);
};

const shopFilter = (id) => shopFilters[id] ?? MERCHANT_ORDER_FILTER.ALL;

const shopStatusFilter = (id) => shopStatusFilters[String(id)] ?? EMPTY_STATUS;

/** 与当前「全部/未处理/已处理」一致的状态下拉项，避免互斥组合 */
const shopStatusOptions = (shopId) => {
  const f = shopFilter(shopId);
  return orderStatusOptionsForProcessFilter(
    f === MERCHANT_ORDER_FILTER.ALL ? ORDER_PROCESS_FILTER.ALL : f
  );
};

const ensureShopOrderPager = (shopKey) => {
  const key = String(shopKey);
  if (!shopOrderPager[key]) {
    shopOrderPager[key] = { current: 1, size: 10, total: 0 };
  }
  return shopOrderPager[key];
};

/** 有总数或本页有数据时显示分页（与 ShopDetailPage 商品分页展示条件一致） */
const merchantPagerVisible = (key) => {
  const k = String(key);
  const t = Number(shopOrderPager[k]?.total ?? 0);
  const n = shopOrdersMap[k]?.length ?? 0;
  return t > 0 || n > 0;
};

const onMerchantOrderPageChange = (shopId, page) => {
  loadShopOrders(shopId, { page });
};

const onMerchantOrderSizeChange = (shopId, size) => {
  loadShopOrders(shopId, { page: 1, size });
};

const setShopFilter = (id, v) => {
  shopFilters[id] = v;
  const key = String(id);
  const opts = orderStatusOptionsForProcessFilter(
    v === MERCHANT_ORDER_FILTER.ALL ? ORDER_PROCESS_FILTER.ALL : v
  );
  const allowed = new Set(opts.map((o) => o.value));
  const cur = shopStatusFilters[key];
  if (cur !== EMPTY_STATUS && cur != null && !allowed.has(Number(cur))) {
    shopStatusFilters[key] = EMPTY_STATUS;
  }
  loadShopOrders(id, { page: 1 });
};

const setShopStatusFilter = (id, v) => {
  const key = String(id);
  shopStatusFilters[key] = v === undefined || v === null ? EMPTY_STATUS : v;
  loadShopOrders(id, { page: 1 });
};

const fmtInt = (v) => {
  if (v === null || typeof v === "undefined" || Number.isNaN(Number(v))) return "--";
  return String(Math.round(Number(v)));
};

const fmtMoney = (v) => {
  if (v === null || typeof v === "undefined" || Number.isNaN(Number(v))) return "--";
  return Number(v).toFixed(2);
};

const formatRate = (v) => {
  if (v === null || typeof v === "undefined" || Number.isNaN(Number(v))) return "--";
  const n = Number(v);
  if (n >= 0 && n <= 1) return `${(n * 100).toFixed(1)}%`;
  return `${n.toFixed(1)}%`;
};

const normalizeChartPayload = (data) => {
  if (!data || typeof data !== "object") {
    return { labels: [], orderCount: [], completeCount: [] };
  }
  const labels = data.labels || data.dates || data.dateList || [];
  const orderCount =
    data.orderCount || data.newOrderCount || data.orderCounts || data.placedCount || [];
  const completeCount =
    data.completeCount || data.completedCount || data.completeCounts || data.doneCount || [];
  return {
    labels: Array.isArray(labels) ? labels : [],
    orderCount: Array.isArray(orderCount) ? orderCount.map((x) => Number(x) || 0) : [],
    completeCount: Array.isArray(completeCount) ? completeCount.map((x) => Number(x) || 0) : []
  };
};

const normalizeSummaryPayload = (data) => {
  if (!data || typeof data !== "object") {
    return { soldQuantity: null, revenue: null, completionRate: null, totalOrders: null };
  }
  return {
    soldQuantity: data.soldQuantity ?? data.soldQty ?? data.sold_quantity,
    revenue: data.revenue ?? data.amount ?? data.turnover,
    completionRate: data.completionRate ?? data.completion_rate ?? data.rate,
    totalOrders: data.totalOrders ?? data.orderTotal ?? data.total_orders
  };
};

const applyChartOption = (payload) => {
  const { labels, orderCount, completeCount } = normalizeChartPayload(payload);
  if (!chartRef.value) return;
  if (!chartInst) chartInst = echarts.init(chartRef.value);
  chartInst.setOption(
    {
      color: ["#b8860b", "#3d7a5e"],
      tooltip: { trigger: "axis" },
      legend: { data: ["下单数量", "完成量"] },
      grid: { left: 48, right: 16, top: 40, bottom: 28 },
      xAxis: { type: "category", boundaryGap: false, data: labels },
      yAxis: { type: "value", minInterval: 1 },
      series: [
        { name: "下单数量", type: "line", smooth: true, data: orderCount },
        { name: "完成量", type: "line", smooth: true, data: completeCount }
      ]
    },
    true
  );
};

const resizeChart = () => {
  chartInst?.resize();
};

/** 布局稳定后再 resize，避免 tab 切换/ v-show 切换后仍按 0 宽渲染 */
const scheduleChartResize = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resizeChart();
    });
  });
};

let chartResizeObs = null;
const disconnectChartResizeObserver = () => {
  chartResizeObs?.disconnect();
  chartResizeObs = null;
};

const loadAnalytics = async () => {
  if (!userId.value || !dateRange.value || dateRange.value.length !== 2) return;
  chartLoading.value = true;
  analyticsNote.value = "";
  const [startDate, endDate] = dateRange.value;
  const qs = new URLSearchParams();
  qs.set("startDate", startDate);
  qs.set("endDate", endDate);
  if (selectedShopId.value) qs.set("shopId", selectedShopId.value);

  let chartPayload = { labels: [], orderCount: [], completeCount: [] };
  try {
    chartPayload = await http.get(`/goods/order/merchant/analytics/chart?${qs.toString()}`);
  } catch {
    analyticsNote.value =
      (analyticsNote.value ? analyticsNote.value + " " : "") +
      "趋势图接口暂不可用，已展示空图。";
  }

  /** 先结束 loading，让图表容器参与布局（可见且有宽度），再 init/setOption */
  chartLoading.value = false;
  await nextTick();
  applyChartOption(chartPayload);
  await nextTick();
  scheduleChartResize();

  try {
    const sumData = await http.get(`/goods/order/merchant/analytics/summary?${qs.toString()}`);
    const n = normalizeSummaryPayload(sumData);
    summary.soldQuantity = n.soldQuantity;
    summary.revenue = n.revenue;
    summary.completionRate = n.completionRate;
    summary.totalOrders = n.totalOrders;
  } catch {
    summary.soldQuantity = null;
    summary.revenue = null;
    summary.completionRate = null;
    summary.totalOrders = null;
    analyticsNote.value =
      (analyticsNote.value ? analyticsNote.value + " " : "") + "汇总指标接口暂不可用。";
  }
};

watch(
  () => chartRef.value,
  (el) => {
    disconnectChartResizeObserver();
    if (!el) return;
    chartResizeObs = new ResizeObserver(() => {
      resizeChart();
    });
    chartResizeObs.observe(el);
    scheduleChartResize();
  },
  { flush: "post" }
);

const refreshAnalytics = () => loadAnalytics();

const onRangeOrShopChange = () => loadAnalytics();

const loadShops = async () => {
  if (!userId.value) {
    shops.value = [];
    return;
  }
  shopsLoading.value = true;
  try {
    const data = await http.get(`/shop/of/user/${userId.value}`);
    const list = Array.isArray(data) ? data : [];
    shops.value = list.map((x) => normalizeShop(x));
  } catch (e) {
    ElMessage.error(e.message || "加载店铺失败");
    shops.value = [];
  } finally {
    shopsLoading.value = false;
  }
};

const parsePaged = (data) => {
  if (Array.isArray(data)) return data;
  const records = Array.isArray(data?.records)
    ? data.records
    : Array.isArray(data?.list)
      ? data.list
      : [];
  return records;
};

const moTitle = (o) => {
  const t = o?.title;
  if (t == null) return "";
  const s = String(t).trim();
  return s || "";
};

const moImages = (o) => {
  const raw = o?.images ?? o?.image;
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
};

const moCover = (o) => moImages(o)[0] || "";

const loadShopOrders = async (shopId, overrides = {}) => {
  const key = String(shopId);
  ensureShopOrderPager(key);
  const filter = shopFilter(shopId);
  const pager = shopOrderPager[key];
  if (overrides.page != null) pager.current = Math.max(1, Number(overrides.page) || 1);
  if (overrides.size != null) pager.size = Math.max(1, Number(overrides.size) || 10);

  const page = Math.max(1, Number(pager.current) || 1);
  const pageSize = Math.max(1, Number(pager.size) || 10);
  pager.current = page;
  pager.size = pageSize;

  shopOrdersLoading[key] = true;
  try {
    const qs = new URLSearchParams();
    qs.set("shopId", key);
    if (filter && filter !== MERCHANT_ORDER_FILTER.ALL) {
      qs.set("filter", filter);
    }
    const st = shopStatusFilter(shopId);
    if (st !== EMPTY_STATUS && st !== null && typeof st !== "undefined") {
      qs.set("status", String(st));
    }
    qs.set("current", String(page));
    qs.set("size", String(pageSize));
    const data = await http.get(`/goods/order/merchant/orders?${qs.toString()}`);
    const rows = parsePaged(data);
    const resolvedCurrent = Number(data?.current ?? page) || page;
    const resolvedSize = Number(data?.size ?? pageSize) || pageSize;
    let total = Number(data?.total);
    if (!Number.isFinite(total) || total < 0) {
      const base = (resolvedCurrent - 1) * resolvedSize;
      total = base + rows.length + (rows.length >= resolvedSize ? 1 : 0);
    }
    shopOrderPager[key] = { current: resolvedCurrent, size: resolvedSize, total };
    shopOrdersMap[key] = rows;
  } catch {
    shopOrdersMap[key] = [];
    shopOrderPager[key] = { ...shopOrderPager[key], total: 0 };
    ElMessage.warning("商户订单列表接口暂不可用或暂无数据");
  } finally {
    shopOrdersLoading[key] = false;
  }
};

const toggleShop = (id) => {
  const sid = String(id);
  if (expandedShopId.value === sid) {
    expandedShopId.value = null;
    return;
  }
  expandedShopId.value = sid;
  if (shopFilters[sid] === undefined) {
    shopFilters[sid] = MERCHANT_ORDER_FILTER.ALL;
  }
  loadShopOrders(sid);
};

const openDetail = async (orderId, shopId = null) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detailRow.value = null;
  detailShopId.value = shopId != null ? String(shopId) : null;
  try {
    const data = await http.get(`/goods/order/detail/${orderId}`);
    detailRow.value = data || null;
  } catch (e) {
    ElMessage.error(e.message || "加载订单详情失败");
  } finally {
    detailLoading.value = false;
  }
};

const shipOrderRow = async (shopId, item) => {
  const oid = idKey(item);
  if (!oid || !canMerchantShipOrder(item)) return;
  try {
    await ElMessageBox.confirm("确认已发货？订单将进入配送中状态。", "配送确认", {
      type: "info",
      confirmButtonText: "确认发货",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  shippingId.value = oid;
  try {
    await http.post(`/goods/order/merchant/ship/${oid}`);
    ElMessage.success("已标记配送");
    await loadShopOrders(shopId);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    shippingId.value = "";
  }
};

const merchantRefundCompleteRow = async (shopId, item) => {
  const oid = idKey(item);
  if (!oid || !canMerchantCompleteRefund(item)) return;
  try {
    await ElMessageBox.confirm(
      "确认完成退款？订单将变为「已退款」，请确保已按规则处理打款与库存回滚。",
      "同意退款",
      {
        type: "warning",
        confirmButtonText: "确认退款",
        cancelButtonText: "返回"
      }
    );
  } catch {
    return;
  }
  merchantRefundCompleteId.value = oid;
  try {
    await http.post(`/goods/order/merchant/refund/complete/${oid}`);
    ElMessage.success("退款已完成");
    await loadShopOrders(shopId);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    merchantRefundCompleteId.value = "";
  }
};

const merchantCancelRow = async (shopId, item) => {
  const oid = idKey(item);
  if (!oid || !canMerchantCancelOrder(item)) return;
  try {
    await ElMessageBox.confirm("确定取消该未付款订单？取消后买家将无法继续支付该订单。", "取消订单", {
      type: "warning",
      confirmButtonText: "确定取消",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  merchantCancellingId.value = oid;
  try {
    await http.post(`/goods/order/merchant/cancel/${oid}`);
    ElMessage.success("订单已取消");
    await loadShopOrders(shopId);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "取消失败");
  } finally {
    merchantCancellingId.value = "";
  }
};

const shipOrderDetail = async () => {
  const sid = detailShopId.value;
  const item = detailRow.value;
  if (!sid || !item || !canMerchantShipOrder(item)) return;
  try {
    await ElMessageBox.confirm("确认已发货？订单将进入配送中状态。", "配送确认", {
      type: "info",
      confirmButtonText: "确认发货",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  const oid = idKey(item);
  shippingId.value = oid;
  try {
    await http.post(`/goods/order/merchant/ship/${oid}`);
    ElMessage.success("已标记配送");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detailRow.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadShopOrders(sid);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    shippingId.value = "";
  }
};

const merchantRefundCompleteDetail = async () => {
  const sid = detailShopId.value;
  const item = detailRow.value;
  if (!sid || !item || !canMerchantCompleteRefund(item)) return;
  try {
    await ElMessageBox.confirm(
      "确认完成退款？订单将变为「已退款」，请确保已按规则处理打款与库存回滚。",
      "同意退款",
      {
        type: "warning",
        confirmButtonText: "确认退款",
        cancelButtonText: "返回"
      }
    );
  } catch {
    return;
  }
  const oid = idKey(item);
  merchantRefundCompleteId.value = oid;
  try {
    await http.post(`/goods/order/merchant/refund/complete/${oid}`);
    ElMessage.success("退款已完成");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detailRow.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadShopOrders(sid);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    merchantRefundCompleteId.value = "";
  }
};

const merchantCancelDetail = async () => {
  const sid = detailShopId.value;
  const item = detailRow.value;
  if (!sid || !item || !canMerchantCancelOrder(item)) return;
  try {
    await ElMessageBox.confirm("确定取消该未付款订单？取消后买家将无法继续支付该订单。", "取消订单", {
      type: "warning",
      confirmButtonText: "确定取消",
      cancelButtonText: "返回"
    });
  } catch {
    return;
  }
  const oid = idKey(item);
  merchantCancellingId.value = oid;
  try {
    await http.post(`/goods/order/merchant/cancel/${oid}`);
    ElMessage.success("订单已取消");
    detailLoading.value = true;
    try {
      const data = await http.get(`/goods/order/detail/${oid}`);
      detailRow.value = data || null;
    } catch (e) {
      ElMessage.error(e.message || "刷新订单详情失败");
    } finally {
      detailLoading.value = false;
    }
    await loadShopOrders(sid);
    await loadAnalytics();
  } catch (e) {
    ElMessage.error(e.message || "取消失败");
  } finally {
    merchantCancellingId.value = "";
  }
};

watch(
  userId,
  async (id) => {
    if (id == null) return;
    await loadShops();
    await loadAnalytics();
  },
  { immediate: true }
);

onMounted(async () => {
  window.addEventListener("resize", resizeChart);
  try {
    const raw = sessionStorage.getItem("token");
    const hasToken = raw && raw !== "undefined" && raw !== "null" && String(raw).trim() !== "";
    if (hasToken) {
      await userStore.fetchMe();
    }
  } catch {
    /* fetchMe 失败时 store 会清空 user，下面展示未登录 */
  } finally {
    merchantAuthLoading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener("resize", resizeChart);
  disconnectChartResizeObserver();
  chartInst?.dispose();
  chartInst = null;
});
</script>

<style scoped>
.merchant-panel {
  min-height: 160px;
}

.state {
  padding: 20px;
  text-align: center;
  color: var(--kc-text);
}
.state.sm {
  padding: 12px;
  font-size: 13px;
}
.state.muted {
  color: var(--kc-muted);
}

.analytics-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.analytics-row {
  display: grid;
  grid-template-columns: 1fr minmax(220px, 260px);
  gap: 16px;
  margin-bottom: 8px;
}

@media (max-width: 900px) {
  .analytics-row {
    grid-template-columns: 1fr;
  }
}

.chart-wrap {
  position: relative;
  min-height: 280px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
}

.chart-box {
  width: 100%;
  height: 280px;
}

.chart-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-size: 13px;
  color: var(--kc-muted);
}

.kpi-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kpi-card {
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--kc-card-elevated);
}

.kpi-label {
  display: block;
  font-size: 12px;
  color: var(--kc-muted);
  margin-bottom: 6px;
}

.kpi-val {
  font-size: 20px;
  color: var(--kc-text);
  font-weight: 700;
}

.analytics-note {
  font-size: 12px;
  color: var(--kc-muted);
  margin: 0 0 16px;
}

.sub-title {
  margin: 0 0 12px;
  font-size: 16px;
  color: var(--kc-text);
}

.shop-strips {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shop-strip {
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
  overflow: hidden;
}

.shop-strip-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
}

.shop-strip-head:hover {
  background: var(--kc-card);
}

.shop-mini-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
  flex-shrink: 0;
}

.shop-mini-cover.ph {
  background: linear-gradient(135deg, #e8e4d8, #ddd8cc);
}

.shop-strip-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.shop-name {
  font-weight: 600;
  color: var(--kc-text);
}

.shop-sub {
  font-size: 12px;
  color: var(--kc-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chev {
  font-size: 12px;
  color: var(--kc-muted);
  flex-shrink: 0;
}

.shop-strip-body {
  padding: 0 14px 14px;
  border-top: 1px solid var(--kc-border-soft);
}

.mo-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 12px;
  margin: 12px 0;
}

.filter-rg {
  flex-shrink: 0;
}

.mo-filters .status-select {
  width: 140px;
}

.pager {
  margin-top: 12px;
  justify-content: flex-end;
}

.mo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.mo-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 8px;
  background: var(--kc-card);
}

.mo-thumb-wrap {
  flex-shrink: 0;
}
.mo-thumb {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
}
.mo-main {
  flex: 1;
  min-width: 0;
}
.mo-main p {
  margin: 2px 0;
  font-size: 12px;
  color: var(--kc-text);
}
.mo-title {
  font-weight: 600;
  margin-bottom: 4px !important;
}

.mo-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.mo-detail-goods {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--kc-border-soft);
}
.mo-detail-imgs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.mo-detail-thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--kc-border-soft);
}
.mo-detail-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--kc-text);
}
.mo-detail-meta p {
  margin: 6px 0;
  font-size: 14px;
  color: var(--kc-text);
}

.mo-dialog-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
