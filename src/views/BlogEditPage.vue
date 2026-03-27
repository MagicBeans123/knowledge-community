<template>
  <section class="card form-wrap">
    <h2>发布知识笔记</h2>
    <el-form label-width="90px">
      <el-form-item label="标题">
        <el-input v-model="form.title" placeholder="请输入标题" />
      </el-form-item>
      <el-form-item label="图片链接">
        <el-input v-model="form.images" placeholder="多张图片用英文逗号分隔" />
      </el-form-item>
      <el-form-item label="正文">
        <el-input v-model="form.content" type="textarea" :rows="10" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitBlog">立即发布</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script setup>
import { reactive } from "vue";
import { ElMessage } from "element-plus";
import http from "../api/http";

defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const form = reactive({
  title: "",
  images: "",
  content: ""
});

const submitBlog = async () => {
  if (!form.title.trim()) {
    ElMessage.warning("标题不能为空");
    return;
  }
  if (!form.content.trim()) {
    ElMessage.warning("正文不能为空");
    return;
  }
  await http.post("/blog", form);
  ElMessage.success("发布成功");
  form.title = "";
  form.images = "";
  form.content = "";
};
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 45, 80, 0.08);
}

.form-wrap {
  padding: 24px;
}

h2 {
  margin: 0 0 18px;
}
</style>
