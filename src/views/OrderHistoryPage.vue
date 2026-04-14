<template>
  <section class="page">
    <div class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>历史订单</h2>
    </div>

    <div class="card body">
      <div v-if="loading" class="state">加载中…</div>
      <div v-else-if="!orders.length" class="state muted">暂无历史订单</div>
      <template v-else>
        <ul class="list">
          <li v-for="item in orders" :key="item.id" class="row">
            <div class="main">
              <p><b>订单号：</b>{{ item.id }}</p>
              <p><b>商品ID：</b>{{ item.goodsId }}</p>
              <p><b>地址：</b>{{ item.address || "--" }}</p>
              <p><b>数量：</b>{{ item.sum ?? 1 }}</p>
              <p><b>支付方式：</b>{{ payTypeText(item.payType) }}</p>
              <p><b>状态：</b>{{ statusText(item.status) }}</p>
              <p><b>下单时间：</b>{{ item.createTime || "--" }}</p>
            </div>
            <el-button size="small" @click="showDetail(item.id)">订单详情</el-button>
          </li>
        </ul>

        <el-pagination
          class="pager"
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="current"
          :page-size="size"
          :page-sizes="[5, 10, 20, 30]"
          @current-change="onPageChange"
          @size-change="onSizeChange"
        />
      </template>
    </div>

    <el-dialog v-model="detailVisible" title="订单详情" width="560px">
      <div v-if="detailLoading" class="state">加载中…</div>
      <template v-else-if="detail">
        <p><b>订单号：</b>{{ detail.id }}</p>
        <p><b>用户ID：</b>{{ detail.userId }}</p>
        <p><b>商品ID：</b>{{ detail.goodsId }}</p>
        <p><b>地址：</b>{{ detail.address || "--" }}</p>
        <p><b>数量：</b>{{ detail.sum ?? 1 }}</p>
        <p><b>支付方式：</b>{{ payTypeText(detail.payType) }}</p>
        <p><b>状态：</b>{{ statusText(detail.status) }}</p>
        <p><b>下单时间：</b>{{ detail.createTime || "--" }}</p>
        <p><b>支付时间：</b>{{ detail.payTime || "--" }}</p>
      </template>
      <p v-else class="muted">未查到订单详情</p>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

const router = useRouter();
const loading = ref(true);
const orders = ref([]);
const current = ref(1);
const size = ref(10);
const total = ref(0);

const detailVisible = ref(false);
const detailLoading = ref(false);
const detail = ref(null);

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

const parsePagedOrders = (data, page, pageSize) => {
  if (Array.isArray(data)) {
    return {
      records: data,
      total: data.length,
      current: page,
      size: pageSize
    };
  }
  const records = Array.isArray(data?.records)
    ? data.records
    : Array.isArray(data?.list)
      ? data.list
      : [];
  return {
    records,
    total: Number(data?.total ?? records.length) || 0,
    current: Number(data?.current ?? page) || page,
    size: Number(data?.size ?? pageSize) || pageSize
  };
};

const loadOrders = async (page = current.value, pageSize = size.value) => {
  loading.value = true;
  try {
    const data = await http.get(`/goods/order/history?current=${page}&size=${pageSize}`);
    const parsed = parsePagedOrders(data, page, pageSize);
    orders.value = parsed.records;
    total.value = parsed.total;
    current.value = parsed.current;
    size.value = parsed.size;
  } catch (e) {
    ElMessage.error(e.message || "加载历史订单失败");
    orders.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
};

const onPageChange = async (page) => {
  current.value = page;
  await loadOrders(page, size.value);
};

const onSizeChange = async (newSize) => {
  size.value = newSize;
  current.value = 1;
  await loadOrders(1, newSize);
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

onMounted(async () => {
  await loadOrders(current.value, size.value);
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
.state.muted, .muted { color: var(--kc-muted); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.row { display: flex; justify-content: space-between; gap: 12px; border: 1px solid var(--kc-border-soft); border-radius: 10px; background: var(--kc-card-elevated); padding: 12px; }
.main p { margin: 2px 0; font-size: 13px; color: var(--kc-text); }
.pager { margin-top: 14px; display: flex; justify-content: flex-end; }
</style>
