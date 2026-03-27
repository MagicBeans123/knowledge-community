<template>
  <section class="card form-wrap" v-if="form">
    <h2>编辑个人资料</h2>
    <el-form label-width="90px">
      <el-form-item label="昵称">
        <el-input v-model="form.nickName" />
      </el-form-item>
      <el-form-item label="头像链接">
        <el-input v-model="form.icon" />
      </el-form-item>
      <el-form-item label="个人简介">
        <el-input v-model="form.introduce" type="textarea" :rows="4" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { useUserStore } from "../stores/user";

defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const userStore = useUserStore();
const form = ref(null);

const save = async () => {
  await http.put("/user/info", form.value);
  await userStore.fetchMe();
  ElMessage.success("保存成功");
};

onMounted(async () => {
  await userStore.fetchMe();
  form.value = { ...(userStore.user || {}) };
});
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 45, 80, 0.08);
}

.form-wrap {
  padding: 20px;
}

h2 {
  margin: 0 0 14px;
}
</style>
