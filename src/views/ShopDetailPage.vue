<template>
  <div v-if="shopLoading" class="card plain state">加载中…</div>
  <div v-else-if="!shop" class="card plain state">未找到该商户</div>
  <div class="detail" v-else-if="shop">
    <section class="card hero">
      <el-button text class="back" @click="router.back()">返回</el-button>
      <div class="hero-main">
        <h1>{{ shop.name }}</h1>
        <p class="addr">{{ shop.address }}</p>
        <div v-if="shop.userId" class="owner-card">
          <img class="owner-avatar" :src="shop.ownerIcon || '/image/default.png'" alt="" />
          <div class="owner-text">
            <div class="owner-name">{{ shop.ownerNickName || "店主" }}</div>
            <div class="owner-email">{{ shop.ownerEmail || "未提供邮箱" }}</div>
          </div>
          <el-button
            v-if="showFollow"
            size="small"
            type="primary"
            plain
            :loading="followLoading"
            @click="toggleFollowOwner"
          >
            {{ followOwnerText }}
          </el-button>
        </div>
        <div v-if="shop.imageList?.length" class="gallery">
          <p class="gallery-title">店铺图片</p>
          <div class="img-row">
            <img v-for="(url, idx) in shop.imageList" :key="url + idx" :src="url" alt="" @click="openImagePreview(url)" />
          </div>
        </div>
        <div class="stats">
          <span>评分 {{ shop.score ?? "—" }}</span>
          <span>销量 {{ shop.sold ?? 0 }}</span>
        </div>
        <div v-if="shop.userId" class="owner-row">
          <router-link class="link" :to="`/community/other-info/${shop.userId}`">店主主页</router-link>
          <router-link class="link" :to="`/community/user/${shop.userId}/shops`">店主全部商店</router-link>
          <router-link class="link" :to="`/community/user/${shop.userId}/blogs`">店主博客</router-link>
        </div>
      </div>
    </section>

    <section class="card block">
      <div class="block-head">
        <h2>商品列表</h2>
        <div class="block-actions">
          <el-select v-model="goodsTypeFilter" size="small" class="goods-type-select">
            <el-option label="全部类型" value="all" />
            <el-option label="普通商品" value="0" />
            <el-option label="秒杀商品" value="1" />
          </el-select>
          <router-link class="all-link" :to="`/community/shop/${shopId}/goods`">全部</router-link>
          <el-button v-if="isShopOwner" size="small" type="primary" @click="openPublishDialog">发布商品</el-button>
        </div>
      </div>
      <div v-if="goodsLoading" class="muted">加载中…</div>
      <ul v-else-if="filteredGoodsList.length" class="v-list">
        <li v-for="g in filteredGoodsList" :key="g.id" class="v-item">
          <div>
            <strong>
              {{ g.title }}
              <span v-if="Number(g.type) === 1" class="seckill-tag">秒杀</span>
            </strong>
            <p v-if="g.description" class="sub">{{ g.description }}</p>
            <div v-if="g.imageList?.length" class="goods-img-row">
              <img v-for="(img, idx) in g.imageList" :key="img + idx" :src="img" alt="" @click="openImagePreview(img)" />
            </div>
            <p v-if="Number(g.type) === 1" class="rules">
              库存 {{ g.stock ?? 0 }} · {{ g.beginTime || "-" }} ~ {{ g.endTime || "-" }}
            </p>
          </div>
          <div class="price">
            <span class="pay">¥{{ g.payValue }}</span>
            <span class="actual">抵 ¥{{ g.actualValue }}</span>
          </div>
        </li>
      </ul>
      <p v-else class="muted">暂无商品</p>
    </section>

    <el-dialog v-model="publishDialogVisible" title="发布商品" width="560px">
      <el-form label-width="96px" class="publish-form">
        <el-form-item label="标题" required>
          <el-input v-model="publishForm.title" maxlength="255" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="publishForm.description" maxlength="255" />
        </el-form-item>
        <el-form-item label="商品图片">
          <div class="goods-upload-wrap">
            <input
              ref="goodsImageInputRef"
              type="file"
              accept="image/*"
              multiple
              class="hidden-input"
              @change="onGoodsImagesSelected"
            />
            <div class="upload-actions">
              <el-button size="small" type="primary" plain :loading="imageUploading" @click="pickGoodsImages">
                选择图片
              </el-button>
              <span class="upload-hint">最多 5 张，横向展示</span>
            </div>
            <div v-if="uploadedGoodsImages.length" class="goods-upload-row">
              <div v-for="(img, idx) in uploadedGoodsImages" :key="img + idx" class="goods-upload-item">
                <img :src="img" alt="" />
                <button type="button" class="img-del" @click="removeGoodsImage(idx)">删除</button>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="支付金额" required>
          <el-input-number v-model="publishForm.payValue" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="抵扣金额" required>
          <el-input-number v-model="publishForm.actualValue" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="publishForm.type" style="width: 100%">
            <el-option :value="0" label="普通商品" />
            <el-option :value="1" label="秒杀商品" />
          </el-select>
        </el-form-item>
        <el-form-item label="库存" required>
          <el-input-number v-model="publishForm.stock" :min="1" :step="1" />
        </el-form-item>
        <template v-if="Number(publishForm.type) === 1">
          <el-form-item label="开始时间" required>
            <el-date-picker
              v-model="publishForm.beginTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
          <el-form-item label="结束时间" required>
            <el-date-picker
              v-model="publishForm.endTime"
              type="datetime"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 100%"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishSubmitting" @click="submitPublish">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="imagePreviewVisible" width="840px" class="img-preview-dialog" destroy-on-close>
      <img v-if="imagePreviewUrl" :src="imagePreviewUrl" class="preview-img" alt="" />
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { useUserStore } from "../stores/user";
import { normalizeGoods, normalizeShop } from "../utils/dto";

const props = defineProps({
  id: { type: [String, Number], default: "" },
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);

const shop = ref(null);
const shopLoading = ref(true);
const goodsList = ref([]);
const goodsLoading = ref(true);
const followedOwner = ref(false);
const followLoading = ref(false);
const publishDialogVisible = ref(false);
const publishSubmitting = ref(false);
const goodsImageInputRef = ref(null);
const imageUploading = ref(false);
const uploadedGoodsImages = ref([]);
const imagePreviewVisible = ref(false);
const imagePreviewUrl = ref("");
const viewerId = ref("");
const goodsTypeFilter = ref("all");
const publishForm = reactive({
  title: "",
  description: "",
  images: "",
  payValue: 0,
  actualValue: 0,
  type: 0,
  stock: 1,
  beginTime: "",
  endTime: ""
});

const shopId = props.id || route.params.id;

const showFollow = computed(() => {
  const uid = shop.value?.userId;
  const mid = viewerId.value;
  if (uid == null || uid === "" || mid == null || mid === "") return false;
  // 使用字符串比较，避免 Long 在 JS Number 下精度丢失
  return String(mid) !== String(uid);
});
const isShopOwner = computed(() => {
  const uid = shop.value?.userId;
  const mid = viewerId.value;
  if (uid == null || uid === "" || mid == null || mid === "") return false;
  return String(mid) === String(uid);
});

const followOwnerText = computed(() => (followedOwner.value ? "取消关注店主" : "关注店主"));
const filteredGoodsList = computed(() => {
  if (goodsTypeFilter.value === "all") return goodsList.value;
  return goodsList.value.filter((g) => String(g.type ?? 0) === String(goodsTypeFilter.value));
});

const load = async () => {
  shopLoading.value = true;
  try {
    const raw = await http.get(`/shop/${shopId}`);
    shop.value = normalizeShop(raw);
  } catch (e) {
    ElMessage.error(e.message || "加载失败");
    shop.value = null;
  } finally {
    shopLoading.value = false;
  }
};

const loadFollowStatus = async () => {
  const uid = shop.value?.userId;
  const mid = viewerId.value;
  if (uid == null || uid === "" || mid == null || mid === "" || String(mid) === String(uid)) return;
  try {
    const flag = await http.get(`/follow/or/not/${uid}`);
    followedOwner.value = Boolean(flag);
  } catch {
    followedOwner.value = false;
  }
};

const toggleFollowOwner = async () => {
  const uid = shop.value?.userId;
  if (!uid) return;
  followLoading.value = true;
  try {
    await http.put(`/follow/${uid}/${!followedOwner.value}`);
    followedOwner.value = !followedOwner.value;
    ElMessage.success(followedOwner.value ? "已关注店主" : "已取消关注");
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
  } finally {
    followLoading.value = false;
  }
};

const loadGoods = async () => {
  goodsLoading.value = true;
  try {
    const data = await http.get(`/goods/of/shop/${shopId}`);
    goodsList.value = (Array.isArray(data) ? data : []).map((x) => normalizeGoods(x));
  } catch {
    goodsList.value = [];
  } finally {
    goodsLoading.value = false;
  }
};

function unwrapUploadUrl(data) {
  if (typeof data === "string") return data.trim();
  if (data && typeof data === "object") {
    const u = data.url ?? data.path ?? data.src ?? data.data;
    if (typeof u === "string") return u.trim();
  }
  return "";
}

const syncGoodsImageField = () => {
  publishForm.images = uploadedGoodsImages.value.join(",");
};

const pickGoodsImages = () => goodsImageInputRef.value?.click();

const onGoodsImagesSelected = async (event) => {
  const input = event.target;
  const files = Array.from(input.files || []);
  input.value = "";
  if (!files.length) return;
  const remain = 5 - uploadedGoodsImages.value.length;
  if (remain <= 0) {
    ElMessage.warning("最多上传 5 张图片");
    return;
  }
  const picked = files.slice(0, remain);
  if (files.length > remain) {
    ElMessage.warning("最多上传 5 张图片，超出部分已忽略");
  }
  imageUploading.value = true;
  try {
    for (const file of picked) {
      const fd = new FormData();
      fd.append("file", file);
      const data = await http.post("/shop/image/upload", fd);
      const url = unwrapUploadUrl(data);
      if (!url) continue;
      uploadedGoodsImages.value = [...uploadedGoodsImages.value, url];
    }
    syncGoodsImageField();
    ElMessage.success("图片上传完成");
  } catch (e) {
    ElMessage.error(e.message || "图片上传失败");
  } finally {
    imageUploading.value = false;
  }
};

const removeGoodsImage = (index) => {
  uploadedGoodsImages.value = uploadedGoodsImages.value.filter((_, i) => i !== index);
  syncGoodsImageField();
};

const openImagePreview = (url) => {
  const u = String(url || "").trim();
  if (!u) return;
  imagePreviewUrl.value = u;
  imagePreviewVisible.value = true;
};

const openPublishDialog = () => {
  publishForm.title = "";
  publishForm.description = "";
  publishForm.images = "";
  publishForm.payValue = 0;
  publishForm.actualValue = 0;
  publishForm.type = 0;
  publishForm.stock = 1;
  publishForm.beginTime = "";
  publishForm.endTime = "";
  uploadedGoodsImages.value = [];
  publishDialogVisible.value = true;
};

const submitPublish = async () => {
  if (!publishForm.title.trim()) {
    ElMessage.warning("请输入商品标题");
    return;
  }
  if (publishForm.payValue == null || publishForm.actualValue == null) {
    ElMessage.warning("请填写价格");
    return;
  }
  if (!publishForm.stock || publishForm.stock < 1) {
    ElMessage.warning("库存需大于0");
    return;
  }
  if (Number(publishForm.type) === 1) {
    if (!publishForm.beginTime || !publishForm.endTime) {
      ElMessage.warning("请填写秒杀开始和结束时间");
      return;
    }
  }
  publishSubmitting.value = true;
  try {
    const now = new Date();
    const nowText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
    const payload = {
      title: publishForm.title.trim(),
      description: publishForm.description.trim(),
      images: publishForm.images.trim(),
      payValue: Number(publishForm.payValue),
      actualValue: Number(publishForm.actualValue),
      type: Number(publishForm.type),
      stock: Number(publishForm.stock),
      beginTime: publishForm.beginTime || null,
      endTime: publishForm.endTime || null,
      createTime: nowText,
      updateTime: nowText
    };
    await http.post(`/goods/of/shop/${shopId}`, payload);
    publishDialogVisible.value = false;
    ElMessage.success("发布成功");
    await loadGoods();
  } catch (e) {
    ElMessage.error(e.message || "发布失败");
  } finally {
    publishSubmitting.value = false;
  }
};

onMounted(async () => {
  try {
    await userStore.fetchMe();
    viewerId.value = String(me.value?.id ?? "");
  } catch {
    viewerId.value = "";
  }
  await load();
  if (shop.value) {
    await loadFollowStatus();
    await loadGoods();
  }
});
</script>

<style scoped>
.plain.state {
  padding: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--kc-muted);
}

.detail {
  display: grid;
  gap: 16px;
  max-width: 920px;
  margin: 0 auto;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow);
}

.hero {
  padding: 20px 24px 24px;
}

.hero-main {
  width: min(760px, 100%);
  margin: 0 auto;
}

.back {
  padding: 0;
  margin-bottom: 8px;
  color: var(--kc-muted);
}

.hero-main h1 {
  margin: 0 0 8px;
  font-size: 26px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.addr,
.hours {
  margin: 0 0 6px;
  font-size: 14px;
  color: var(--kc-muted);
}

.owner-card {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 12px;
  background: var(--kc-card-elevated);
  display: flex;
  align-items: center;
  gap: 10px;
}

.owner-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.owner-text {
  flex: 1;
  min-width: 0;
}

.owner-name {
  font-size: 14px;
  color: var(--kc-text);
  font-weight: 600;
}

.owner-email {
  font-size: 12px;
  color: var(--kc-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery {
  margin-top: 12px;
}

.gallery-title {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--kc-muted);
}

.img-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0 6px;
  scroll-snap-type: x mandatory;
}

.img-row img {
  width: 220px;
  height: 132px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--kc-border-soft);
  flex: 0 0 auto;
  box-shadow: var(--kc-shadow-soft);
  scroll-snap-align: start;
  cursor: zoom-in;
}

.stats {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  font-size: 13px;
  color: var(--kc-muted);
}

.owner-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.link {
  font-size: 14px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.block {
  padding: 20px 24px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.block-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.goods-type-select {
  width: 120px;
}

.all-link {
  font-size: 13px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.all-link:hover {
  text-decoration: underline;
}

.block h2 {
  margin: 0 0 14px;
  font-size: 18px;
  color: var(--kc-text);
}

.publish-form :deep(.el-input-number) {
  width: 100%;
}

.goods-upload-wrap {
  width: 100%;
  display: grid;
  gap: 10px;
}

.hidden-input {
  display: none;
}

.upload-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.upload-hint {
  font-size: 12px;
  color: var(--kc-muted);
}

.goods-upload-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.goods-upload-item {
  min-width: 140px;
  width: 140px;
}

.goods-upload-item img {
  width: 100%;
  height: 88px;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
  border-radius: 8px;
}

.img-del {
  margin-top: 6px;
  border: none;
  background: transparent;
  color: var(--el-color-danger);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.muted {
  margin: 0;
  font-size: 14px;
  color: var(--kc-muted);
}

.v-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}

.v-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  background: var(--kc-card-elevated);
}

.v-item strong {
  font-size: 15px;
  color: var(--kc-text);
}

.seckill-tag {
  margin-left: 8px;
  display: inline-block;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
  color: #b54708;
  background: #fff3e6;
  border: 1px solid #ffd8a8;
}

.sub,
.rules {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.goods-img-row {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}

.goods-img-row img {
  width: 96px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--kc-border-soft);
  flex: 0 0 auto;
  cursor: zoom-in;
}

.preview-img {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 10px;
}

.price {
  flex-shrink: 0;
  text-align: right;
}

.pay {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-primary);
}

.actual {
  font-size: 12px;
  color: var(--kc-muted);
}
</style>
