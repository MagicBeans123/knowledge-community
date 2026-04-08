<template>
  <section class="wrap">
    <div class="card">
      <h2>创建商户</h2>
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
          <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

defineProps({
  keyword: { type: String, default: "" }
});

const router = useRouter();
const types = ref([]);
const submitting = ref(false);
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

onMounted(async () => {
  try {
    const data = await http.get("/type/list");
    types.value = Array.isArray(data) ? data : [];
  } catch {
    types.value = [];
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
    await http.post("/shop", {
      name: form.name.trim(),
      typeId: form.typeId,
      images: form.images.trim() || " ",
      address: form.address.trim()
    });
    ElMessage.success("创建成功");
    router.push("/community/shops");
  } catch (e) {
    ElMessage.error(e.message || "创建失败");
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
</style>
