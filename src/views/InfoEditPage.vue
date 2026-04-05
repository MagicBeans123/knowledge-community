<template>
  <section class="card form-wrap" v-if="form">
    <div class="head">
      <h2>编辑个人信息</h2>
      <el-button @click="goBack">返回个人中心</el-button>
    </div>

    <div class="avatar-upload">
      <input ref="avatarInputRef" class="hidden-input" type="file" accept="image/*" @change="onAvatarSelected" />
      <img
        class="avatar-img"
        :src="form.icon || '/image/default.png'"
        alt="avatar"
        title="点击上传头像"
        @click="pickAvatar"
      />
      <span class="avatar-tip">点击头像上传</span>
    </div>

    <el-form label-width="100px" class="form-grid">
      <el-form-item label="昵称">
        <el-input v-model="form.nickName" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="头像链接">
        <el-input v-model="form.icon" placeholder="请输入头像 URL" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" placeholder="请输入邮箱（选填）" />
      </el-form-item>
      <el-form-item label="性别">
        <el-select v-model="form.gender" placeholder="请选择性别">
          <el-option label="保密" :value="0" />
          <el-option label="男" :value="1" />
          <el-option label="女" :value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="城市">
        <el-input v-model="form.city" placeholder="所在城市" />
      </el-form-item>
      <el-form-item label="生日">
        <el-date-picker
          v-model="form.birthday"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="选择生日"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="新密码">
        <el-input v-model="form.password" show-password placeholder="留空则不修改密码" />
      </el-form-item>
      <el-form-item label="确认密码">
        <el-input v-model="form.confirmPassword" show-password placeholder="修改密码时再次输入" />
      </el-form-item>
      <el-form-item label="个人简介" class="full-line">
        <el-input v-model="form.introduce" type="textarea" :rows="5" placeholder="介绍一下你自己" />
      </el-form-item>
      <el-form-item class="full-line">
        <el-button type="primary" @click="save">保存修改</el-button>
      </el-form-item>
    </el-form>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
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
const router = useRouter();
const form = ref(null);
const avatarInputRef = ref(null);
const nickNameRegex = /^[\u4e00-\u9fa5A-Za-z0-9_]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const goBack = () => {
  router.push("/community/info");
};

const pickAvatar = () => avatarInputRef.value?.click();

const onAvatarSelected = async (event) => {
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  try {
    const fd = new FormData();
    fd.append("file", file);
    const data = await http.post("/user/avatar", fd);
    const url =
      typeof data === "string" ? data : data?.url ?? data?.path ?? data?.data ?? "";
    if (!url) {
      ElMessage.warning("头像上传成功但未返回地址");
      return;
    }
    form.value.icon = url;
    await userStore.fetchMe();
    ElMessage.success("头像已上传");
  } catch (e) {
    ElMessage.error(e.message || "头像上传失败");
  }
};

const validateForm = () => {
  if (!form.value.nickName?.trim()) {
    ElMessage.warning("昵称不能为空");
    return false;
  }
  if (!nickNameRegex.test(form.value.nickName.trim())) {
    ElMessage.warning("昵称仅支持中文、英文、数字和下划线");
    return false;
  }
  if (form.value.gender === null || form.value.gender === undefined || form.value.gender === "") {
    ElMessage.warning("请选择性别");
    return false;
  }
  const email = form.value.email?.trim() || "";
  if (email && !emailRegex.test(email)) {
    ElMessage.warning("邮箱格式不正确");
    return false;
  }
  const pwd = form.value.password?.trim() || "";
  const pwd2 = form.value.confirmPassword?.trim() || "";
  if (pwd || pwd2) {
    if (!pwd || !pwd2) {
      ElMessage.warning("修改密码时请同时填写新密码与确认密码");
      return false;
    }
    if (pwd.length < 6) {
      ElMessage.warning("新密码至少 6 位");
      return false;
    }
    if (pwd !== pwd2) {
      ElMessage.warning("两次输入的密码不一致");
      return false;
    }
  }
  return true;
};

const save = async () => {
  if (!validateForm()) return;

  const pwd = form.value.password?.trim() || "";
  const payload = {
    nickName: form.value.nickName.trim(),
    icon: form.value.icon?.trim() || "",
    email: form.value.email?.trim() || "",
    introduce: form.value.introduce?.trim() || "",
    city: form.value.city?.trim() || "",
    gender: form.value.gender,
    birthday: form.value.birthday || ""
  };
  if (pwd) {
    payload.password = pwd;
  }

  await http.put("/user/info", payload);
  await userStore.fetchMe();
  ElMessage.success("个人信息已更新");
  router.push("/community/info");
};

onMounted(async () => {
  await userStore.fetchMe();
  const u = userStore.user || {};
  form.value = reactive({
    nickName: u.nickName || "",
    icon: u.icon || "",
    email: u.email || "",
    gender: u.gender !== undefined && u.gender !== null ? Number(u.gender) : 0,
    city: u.city || "",
    birthday: typeof u.birthday === "string" ? u.birthday.slice(0, 10) : "",
    password: "",
    confirmPassword: "",
    introduce: u.introduce || ""
  });
});
</script>

<style scoped>
.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow-soft);
  max-width: 900px;
  margin: 0 auto;
}

.form-wrap {
  padding: 24px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 16px;
}

.avatar-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
  cursor: pointer;
}

.avatar-tip {
  color: var(--kc-muted);
  font-size: 13px;
}

.hidden-input {
  display: none;
}

h2 {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
}

.form-grid :deep(.el-form-item) {
  margin-bottom: 16px;
}

.full-line {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
