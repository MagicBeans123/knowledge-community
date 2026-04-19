<template>
  <section class="wrap">
    <div v-if="loading" class="card state">加载中…</div>
    <div v-else-if="loadError" class="card state muted">{{ loadError }}</div>
    <div v-else class="card">
      <h2>编辑商户</h2>
      <el-form label-width="100px" class="form">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" maxlength="128" show-word-limit placeholder="店铺名称" />
        </el-form-item>
        <el-form-item label="分类" required>
          <el-select v-model="form.typeId" placeholder="选择分类" style="width: 100%">
            <el-option v-for="t in types" :key="t.id" :label="t.name || `分类${t.id}`" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="店铺图片">
          <div class="upload-block">
            <input
              ref="imageInputRef"
              type="file"
              accept="image/*"
              multiple
              class="hidden-input"
              @change="onImagesSelected"
            />
            <div class="upload-actions">
              <el-button type="primary" plain :loading="imageUploading" @click="pickImages">选择图片</el-button>
              <span class="upload-hint">最多 5 张，横向展示（{{ uploadedImages.length }}/5）</span>
            </div>
            <div v-if="uploadedImages.length" class="img-row">
              <div v-for="(img, idx) in uploadedImages" :key="img + idx" class="img-item">
                <img :src="img" alt="" />
                <button type="button" class="img-del" @click="removeImage(idx)">删除</button>
              </div>
            </div>
            <p v-else class="img-empty">暂未上传图片</p>
          </div>
        </el-form-item>
        <el-form-item label="地址" required>
          <el-input v-model="form.address" maxlength="255" placeholder="详细地址" />
        </el-form-item>
        <el-form-item>
          <div class="form-actions">
            <div class="form-actions-main">
              <el-button type="primary" :loading="submitting" @click="submit">保存</el-button>
              <el-button @click="goBackToList">取消</el-button>
            </div>
            <el-button type="danger" plain :loading="shopDeleting" @click="deleteShop">删除店铺</el-button>
          </div>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { useUserStore } from "../stores/user";
import { normalizeShop } from "../utils/dto";

defineProps({
  keyword: { type: String, default: "" }
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);

const shopId = route.params.id;
const loading = ref(true);
const loadError = ref("");
const types = ref([]);
const submitting = ref(false);
const shopDeleting = ref(false);
const shopOwnerUserId = ref("");
const imageInputRef = ref(null);
const imageUploading = ref(false);
const uploadedImages = ref([]);

const form = reactive({
  name: "",
  typeId: null,
  images: "",
  address: ""
});

function unwrapUploadUrl(data) {
  if (typeof data === "string") return data.trim();
  if (data && typeof data === "object") {
    const u = data.url ?? data.path ?? data.src ?? data.data;
    if (typeof u === "string") return u.trim();
  }
  return "";
}

const syncImagesField = () => {
  form.images = uploadedImages.value.join(",");
};

const pickImages = () => imageInputRef.value?.click();

const onImagesSelected = async (event) => {
  const input = event.target;
  const files = Array.from(input.files || []);
  input.value = "";
  if (!files.length) return;
  const remain = 5 - uploadedImages.value.length;
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
      uploadedImages.value = [...uploadedImages.value, url];
    }
    syncImagesField();
    ElMessage.success("图片上传完成");
  } catch (e) {
    ElMessage.error(e.message || "图片上传失败");
  } finally {
    imageUploading.value = false;
  }
};

const removeImage = (index) => {
  uploadedImages.value = uploadedImages.value.filter((_, i) => i !== index);
  syncImagesField();
};

watch(
  () => form.images,
  (val) => {
    const list = String(val || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 5);
    uploadedImages.value = list;
    if (list.join(",") !== val) {
      form.images = list.join(",");
    }
  }
);

const goBackToList = () => {
  const id = shopOwnerUserId.value;
  if (id) router.push(`/community/user/${id}/shops`);
  else router.back();
};

const deleteShop = async () => {
  if (!shopId) return;
  try {
    await ElMessageBox.confirm("确定删除该店铺吗？删除后不可恢复。", "删除店铺", {
      type: "warning",
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      confirmButtonClass: "el-button--danger"
    });
  } catch {
    return;
  }
  shopDeleting.value = true;
  try {
    await http.delete(`/shop/${shopId}`);
    ElMessage.success("已删除店铺");
    const id = shopOwnerUserId.value;
    if (id) router.replace(`/community/user/${id}/shops`);
    else router.replace("/community/shops");
  } catch (e) {
    ElMessage.error(e.message || "删除失败");
  } finally {
    shopDeleting.value = false;
  }
};

onMounted(async () => {
  loading.value = true;
  loadError.value = "";
  shopOwnerUserId.value = "";
  try {
    if (me.value?.id == null || me.value?.id === "") {
      await userStore.fetchMe();
    }
  } catch {
    /* ignore */
  }
  try {
    const [typesData, raw] = await Promise.all([http.get("/type/list"), http.get(`/shop/${shopId}`)]);
    types.value = Array.isArray(typesData) ? typesData : [];
    const shop = normalizeShop(raw);
    if (!shop?.id) {
      loadError.value = "未找到该商户";
      return;
    }
    shopOwnerUserId.value = shop.userId != null ? String(shop.userId) : "";
    const mid = me.value?.id;
    if (mid == null || mid === "" || String(shop.userId ?? "") !== String(mid)) {
      loadError.value = "仅店主可编辑该商户";
      return;
    }
    form.name = String(shop.name || "").trim();
    form.typeId = shop.typeId ?? null;
    form.address = String(shop.address || "").trim();
    const imgs = shop.imageList?.length ? shop.imageList : [];
    uploadedImages.value = imgs.slice(0, 5);
    form.images = uploadedImages.value.join(",");
  } catch (e) {
    loadError.value = e.message || "加载失败";
  } finally {
    loading.value = false;
  }
});

const submit = async () => {
  if (!form.name.trim()) {
    ElMessage.warning("请填写名称");
    return;
  }
  if (form.typeId == null) {
    ElMessage.warning("请选择分类");
    return;
  }
  if (!form.address.trim()) {
    ElMessage.warning("请填写地址");
    return;
  }
  submitting.value = true;
  try {
    await http.put(`/shop/${shopId}`, {
      name: form.name.trim(),
      typeId: form.typeId,
      images: form.images.trim() || " ",
      address: form.address.trim()
    });
    ElMessage.success("已保存");
    router.push(`/community/shop/${shopId}`);
  } catch (e) {
    ElMessage.error(e.message || "保存失败");
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.wrap {
  max-width: 640px;
  margin: 0 auto;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  padding: 24px 28px 32px;
  box-shadow: var(--kc-shadow);
}

.state {
  text-align: center;
  padding: 40px 20px;
  font-size: 14px;
  color: var(--kc-text);
}

.state.muted {
  color: var(--kc-muted);
}

h2 {
  margin: 0 0 20px;
  font-size: 26px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.form :deep(.el-form-item__label) {
  color: var(--kc-text);
}

.upload-block {
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
  gap: 12px;
}

.upload-hint {
  font-size: 12px;
  color: var(--kc-muted);
}

.img-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.img-item {
  min-width: 140px;
  width: 140px;
}

.img-item img {
  width: 100%;
  height: 90px;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
  border-radius: 8px;
  display: block;
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

.img-empty {
  margin: 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.form-actions-main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
