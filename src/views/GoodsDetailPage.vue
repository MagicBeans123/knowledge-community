<template>
  <div class="page">
    <section class="card head">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <h2>商品详情</h2>
      <div class="head-right">
        <router-link v-if="goods?.shopId" class="shop-link" :to="`/community/shop/${goods.shopId}`">所属商店</router-link>
        <el-button
          v-if="isShopOwner"
          type="danger"
          plain
          size="small"
          :loading="deletingGoods"
          @click="deleteGoods"
        >
          删除商品
        </el-button>
      </div>
    </section>

    <section v-if="loading" class="card state">加载中…</section>
    <section v-else-if="!goods" class="card state muted">商品不存在或已下架</section>
    <section v-else class="card detail">
      <div class="detail-grid">
        <div class="goods-side">
          <h1>
            {{ goods.title || "未命名商品" }}
            <span v-if="Number(goods.type) === 1" class="tag">秒杀</span>
            <span v-if="Number(goods.type) === 1 && goods.out" class="expired-tag">已过期</span>
          </h1>
          <p class="desc-title">商品描述</p>
          <p class="desc">{{ goods.description || "暂无描述" }}</p>
          <div class="price-row">
            <span class="pay-line">
              <span class="price-label">标价</span>
              <span class="pay">¥{{ goods.payValue }}</span>
            </span>
            <span class="actual-line">
              <span class="price-label">实际金额</span>
              <span class="actual-amt">¥{{ goods.actualValue }}</span>
            </span>
            <el-button class="buy-btn" type="primary" @click="openOrderForm">
              立即购买
            </el-button>
          </div>
          <p class="meta">库存：{{ goods.stock ?? 0 }}</p>
          <p v-if="Number(goods.type) === 1" class="meta">时间：{{ goods.beginTime || "-" }} ~ {{ goods.endTime || "-" }}</p>

          <div v-if="goods.imageList?.length" class="img-row">
            <div v-for="(img, idx) in goods.imageList" :key="img + idx" class="img-item" @click="openImagePreview(img)">
              <img :src="img" alt="" />
              <div v-if="Number(goods.type) === 1 && goods.out" class="img-watermark">已过期</div>
            </div>
          </div>
        </div>

        <aside v-if="showOrderForm" class="order-side">
          <h3>下单信息</h3>
          <el-form label-width="74px">
            <el-form-item label="姓名" required>
              <el-input v-model="orderForm.name" placeholder="请输入收货人姓名" />
            </el-form-item>
            <el-form-item label="省份" required>
              <el-select v-model="orderForm.province" placeholder="请选择省份" style="width: 100%">
                <el-option v-for="p in provinceOptions" :key="p" :label="p" :value="p" />
              </el-select>
            </el-form-item>
            <el-form-item label="城市" required>
              <el-select v-model="orderForm.city" placeholder="请选择城市" style="width: 100%">
                <el-option v-for="c in cityOptions" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
            <el-form-item label="详址" required>
              <el-input v-model="orderForm.detailAddress" placeholder="请输入详细地址" />
            </el-form-item>
            <el-form-item label="数量" required>
              <el-input-number v-model="orderForm.sum" :min="1" :step="1" :disabled="Number(goods.type) === 1" />
            </el-form-item>
            <el-form-item label="实际金额">
              <span class="order-actual-total">¥{{ formatOrderYuan(orderActualTotal) }}</span>
              <span v-if="Number(goods.type) !== 1" class="order-actual-hint">
                （单价 ¥{{ formatOrderYuan(unitActual) }} × {{ orderForm.sum }}）
              </span>
            </el-form-item>
            <el-form-item label="支付方式">
              <span class="pay-hint">下单后在支付页选择：微信/支付宝</span>
            </el-form-item>
            <el-form-item>
              <el-button class="submit-btn" type="primary" :loading="buying" @click="buyGoods">提交订单</el-button>
            </el-form-item>
          </el-form>
        </aside>
      </div>
    </section>

    <el-dialog v-model="imagePreviewVisible" width="840px" class="img-preview-dialog" destroy-on-close>
      <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="preview-img" alt="" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { normalizeGoods, normalizeShop } from "../utils/dto";
import { useUserStore } from "../stores/user";

const props = defineProps({
  id: { type: [String, Number], default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);
const goodsId = props.id || route.params.id;
const goodsType = Number(route.query.type ?? route.query.detailType ?? route.query.goodsType ?? route.query.queryType);

const loading = ref(true);
const goods = ref(null);
const shopOwnerId = ref("");
const deletingGoods = ref(false);
const buying = ref(false);
const showOrderForm = ref(false);
const imagePreviewVisible = ref(false);
const imagePreviewUrl = ref("");
const regionMap = {
  北京市: ["北京市"],
  天津市: ["天津市"],
  上海市: ["上海市"],
  重庆市: ["重庆市"],
  河北省: ["石家庄市", "唐山市", "保定市", "邯郸市"],
  山西省: ["太原市", "大同市"],
  辽宁省: ["沈阳市", "大连市"],
  吉林省: ["长春市", "吉林市"],
  黑龙江省: ["哈尔滨市", "齐齐哈尔市"],
  江苏省: ["南京市", "苏州市", "无锡市", "常州市"],
  浙江省: ["杭州市", "宁波市", "温州市"],
  安徽省: ["合肥市", "芜湖市"],
  福建省: ["福州市", "厦门市", "泉州市"],
  江西省: ["南昌市", "赣州市"],
  山东省: ["济南市", "青岛市", "烟台市"],
  河南省: ["郑州市", "洛阳市", "南阳市"],
  湖北省: ["武汉市", "宜昌市", "襄阳市"],
  湖南省: ["长沙市", "株洲市"],
  广东省: ["广州市", "深圳市", "佛山市"],
  广西壮族自治区: ["南宁市", "桂林市"],
  海南省: ["海口市", "三亚市"],
  四川省: ["成都市", "绵阳市", "德阳市"],
  贵州省: ["贵阳市", "遵义市"],
  云南省: ["昆明市", "曲靖市"],
  西藏自治区: ["拉萨市"],
  陕西省: ["西安市", "咸阳市"],
  甘肃省: ["兰州市", "天水市"],
  青海省: ["西宁市"],
  宁夏回族自治区: ["银川市"],
  新疆维吾尔自治区: ["乌鲁木齐市", "喀什市"],
  内蒙古自治区: ["呼和浩特市", "包头市"],
  香港特别行政区: ["香港"],
  澳门特别行政区: ["澳门"],
  台湾省: ["台北市", "高雄市"]
};
const provinceOptions = Object.keys(regionMap);
const orderForm = reactive({
  name: "",
  province: "",
  city: "",
  detailAddress: "",
  sum: 1
});
const cityOptions = computed(() => (orderForm.province ? regionMap[orderForm.province] || [] : []));

const isShopOwner = computed(() => {
  const mid = me.value?.id;
  const oid = shopOwnerId.value;
  if (mid == null || mid === "" || oid == null || oid === "") return false;
  return String(mid) === String(oid);
});

/** 商品实际单价（与后端 actual_value 一致，即应付价） */
const unitActual = computed(() => {
  const v = Number(goods.value?.actualValue);
  return Number.isFinite(v) ? v : 0;
});

/** 下单侧展示：实际应付 = 实际单价 × 数量（秒杀固定 1 件） */
const orderActualTotal = computed(() => {
  if (!goods.value) return 0;
  const unit = unitActual.value;
  if (Number(goods.value.type) === 1) return unit;
  const n = Number(orderForm.sum);
  const qty = Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
  return unit * qty;
});

const formatOrderYuan = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
};

watch(
  () => orderForm.province,
  () => {
    orderForm.city = "";
  }
);

const openImagePreview = (url) => {
  const u = String(url || "").trim();
  if (!u) return;
  imagePreviewUrl.value = u;
  imagePreviewVisible.value = true;
};

const deleteGoods = async () => {
  if (!goods.value?.id) return;
  const gid = String(goods.value.id);
  try {
    await ElMessageBox.confirm("删除后不可恢复，确定删除该商品？", "删除商品", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消"
    });
  } catch {
    return;
  }
  deletingGoods.value = true;
  try {
    await http.delete(`/goods/${gid}`);
    ElMessage.success("已删除商品");
    const sid = goods.value.shopId;
    if (sid != null && sid !== "") {
      router.replace(`/community/shop/${sid}/goods`);
    } else {
      router.replace("/community/explore");
    }
  } catch (e) {
    ElMessage.error(e.message || "删除失败");
  } finally {
    deletingGoods.value = false;
  }
};

const openOrderForm = () => {
  if (Number(goods.value?.type) === 1 && goods.value?.out) {
    ElMessage.warning("该秒杀商品已过期");
    return;
  }
  showOrderForm.value = true;
};

const normalizeIdString = (value) => {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text) return "";
  return /^\d+$/.test(text) ? text : "";
};

const extractOrderId = (result) => {
  if (result == null) return null;
  if (typeof result === "number" || typeof result === "string") return normalizeIdString(result) || null;
  if (typeof result === "object") {
    const direct = normalizeIdString(result.orderId ?? result.id);
    if (direct) return direct;
    const nested = result.data;
    if (typeof nested === "number" || typeof nested === "string") {
      const nestedId = normalizeIdString(nested);
      if (nestedId) return nestedId;
    }
    if (nested && typeof nested === "object") {
      const nestedObjId = normalizeIdString(nested.orderId ?? nested.id);
      if (nestedObjId) return nestedObjId;
    }
  }
  return null;
};

const buyGoods = async () => {
  if (!goods.value?.id) return;
  if (Number(goods.value.type) === 1 && goods.value.out) {
    ElMessage.warning("该秒杀商品已过期");
    return;
  }
  const name = orderForm.name.trim();
  const province = orderForm.province.trim();
  const city = orderForm.city.trim();
  const detailAddress = orderForm.detailAddress.trim();
  if (!name || !province || !city || !detailAddress) {
    ElMessage.warning("请填写完整收货信息");
    return;
  }
  const address = `${province}${city}${detailAddress}`;
  const orderTitle = String(goods.value.title || "").trim();
  const orderImages =
    String(goods.value.images || "").trim() ||
    (Array.isArray(goods.value.imageList) && goods.value.imageList.length
      ? goods.value.imageList.join(",")
      : "");

  const isSeckill = Number(goods.value.type) === 1;
  const sum = isSeckill ? 1 : Number(orderForm.sum);
  if (!Number.isInteger(sum) || sum < 1) {
    ElMessage.warning("数量需为正整数");
    return;
  }
  buying.value = true;
  try {
    let result = null;
    if (isSeckill) {
      result = await http.post(`/goods/order/seckill/${goods.value.id}`, {
        goodsId: Number(goods.value.id),
        status: 1,
        payTime: null,
        address,
        sum: 1,
        name,
        title: orderTitle,
        images: orderImages
      });
    } else {
      result = await http.post(`/goods/order/normal/${goods.value.id}`, {
        goodsId: Number(goods.value.id),
        status: 1,
        payTime: null,
        address,
        sum,
        name,
        title: orderTitle,
        images: orderImages
      });
    }
    const orderId = extractOrderId(result);
    if (!orderId) {
      ElMessage.error("下单成功但未获取到订单号");
      return;
    }
    ElMessage.success("下单成功，正在进入支付页");
    router.push(`/community/order/pay/${orderId}`);
  } catch (e) {
    ElMessage.error(e.message || "购买失败");
  } finally {
    buying.value = false;
  }
};

onMounted(async () => {
  if (goodsType !== 0 && goodsType !== 1) {
    ElMessage.error("缺少商品类型参数");
    loading.value = false;
    goods.value = null;
    return;
  }
  loading.value = true;
  shopOwnerId.value = "";
  try {
    await userStore.fetchMe();
  } catch {
    /* ignore */
  }
  try {
    const data = await http.get(`/goods/detail/${goodsId}/${goodsType}`);
    const goodsRaw = data?.goods ?? data;
    goods.value = goodsRaw ? normalizeGoods(goodsRaw) : null;
    const sid = goods.value?.shopId;
    if (sid != null && sid !== "") {
      try {
        const shopRaw = await http.get(`/shop/${sid}`);
        const shop = normalizeShop(shopRaw);
        shopOwnerId.value = shop?.userId != null ? String(shop.userId) : "";
      } catch {
        shopOwnerId.value = "";
      }
    }
  } catch (e) {
    ElMessage.error(e.message || "加载商品详情失败");
    goods.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.page { max-width: 920px; margin: 0 auto; display: grid; gap: 14px; }
.card { background: var(--kc-card); border: 1px solid var(--kc-border); border-radius: 14px; box-shadow: var(--kc-shadow); }
.head { padding: 16px 20px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.back { padding: 0; color: var(--kc-muted); }
.head h2 { margin: 0; font-size: 22px; color: var(--kc-text); flex: 1 1 auto; min-width: 0; }
.head-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.shop-link { color: var(--el-color-primary); text-decoration: none; }
.shop-link:hover { text-decoration: underline; }
.state { padding: 24px; text-align: center; color: var(--kc-text); }
.state.muted { color: var(--kc-muted); }
.detail { padding: 20px; }
.detail-grid { display: grid; grid-template-columns: 1.3fr 0.9fr; gap: 16px; align-items: start; }
.order-side { border: 1px solid var(--kc-border-soft); border-radius: 12px; background: var(--kc-card-elevated); padding: 14px; }
.order-side h3 { margin: 0 0 12px; font-size: 16px; color: var(--kc-text); }
.order-side :deep(.el-input-number) { width: 100%; }
.detail h1 { margin: 0; font-size: 24px; color: var(--kc-text); }
.tag { margin-left: 8px; font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #fff3e6; color: #b54708; border: 1px solid #ffd8a8; }
.expired-tag { margin-left: 8px; font-size: 11px; padding: 1px 6px; border-radius: 999px; background: #fee4e2; color: #b42318; border: 1px solid #fecdca; }
.desc-title { margin: 12px 0 0; font-size: 13px; color: var(--kc-muted); }
.desc { margin: 6px 0 0; color: var(--kc-text); line-height: 1.7; white-space: pre-wrap; }
.price-row { margin-top: 14px; display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
.price-label { font-size: 12px; color: var(--kc-muted); margin-right: 4px; }
.pay-line, .actual-line { display: inline-flex; align-items: baseline; gap: 4px; }
.pay { font-size: 24px; font-weight: 700; color: var(--el-color-primary); }
.actual-amt { font-size: 18px; font-weight: 600; color: var(--kc-text); }
.buy-btn { margin-left: auto; }
.order-actual-total { font-size: 18px; font-weight: 600; color: var(--el-color-primary); }
.order-actual-hint { margin-left: 8px; font-size: 12px; color: var(--kc-muted); }
.submit-btn { width: 100%; }
.pay-hint { color: var(--kc-muted); font-size: 13px; }
.meta { margin: 10px 0 0; font-size: 13px; color: var(--kc-muted); }
.img-row { margin-top: 14px; display: flex; gap: 10px; overflow-x: auto; }
.img-item { position: relative; width: 180px; height: 120px; flex: 0 0 auto; cursor: zoom-in; }
.img-item img { width: 100%; height: 100%; object-fit: cover; border: 1px solid var(--kc-border-soft); border-radius: 10px; display: block; }
.img-watermark {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  pointer-events: none;
}
.preview-img { display: block; width: 100%; max-height: 70vh; object-fit: contain; border-radius: 10px; }
@media (max-width: 960px) {
  .detail-grid { grid-template-columns: 1fr; }
}
</style>
