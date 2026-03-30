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
        <el-form-item label="图片地址">
          <el-input v-model="form.images" type="textarea" :rows="2" placeholder="多张图用英文逗号分隔，对应 know_shop.images" />
        </el-form-item>
        <el-form-item label="区域">
          <el-input v-model="form.area" maxlength="128" placeholder="商圈/区域" />
        </el-form-item>
        <el-form-item label="地址" required>
          <el-input v-model="form.address" maxlength="255" placeholder="详细地址" />
        </el-form-item>
        <el-form-item label="人均">
          <el-input-number v-model="form.avgPrice" :min="0" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="营业时间">
          <el-input v-model="form.openHours" maxlength="32" placeholder="如 10:00-22:00" />
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
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

defineProps({
  keyword: { type: String, default: "" }
});

const router = useRouter();
const types = ref([]);
const submitting = ref(false);

const form = reactive({
  name: "",
  typeId: null,
  images: "",
  area: "",
  address: "",
  avgPrice: undefined,
  openHours: ""
});

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
      area: form.area.trim() || "",
      address: form.address.trim(),
      avgPrice: form.avgPrice ?? null,
      openHours: form.openHours.trim() || ""
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
</style>
