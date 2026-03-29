<template>
  <div class="register-shell">
    <section class="register-card">
      <div class="head">
        <h1>创建你的账号</h1>
        <p>注册后即可进入知识社区，发布与探索内容。</p>
      </div>

      <div class="form">
        <div class="field">
          <label>昵称</label>
          <el-input v-model="form.nickName" placeholder="中文、英文、数字或下划线" @blur="checkNickName" />
          <span v-if="errors.nickName" class="err">{{ errors.nickName }}</span>
        </div>
        <div class="field">
          <label>手机号</label>
          <el-input v-model="form.phone" maxlength="11" placeholder="请输入11位手机号" @input="checkPhone" />
          <span class="counter" :class="{ warn: form.phone.length > 0 && form.phone.length !== 11 }">
            {{ form.phone.length }} / 11
          </span>
          <span v-if="errors.phone" class="err">{{ errors.phone }}</span>
        </div>
        <div class="field">
          <label>密码</label>
          <el-input v-model="form.password" show-password placeholder="设置登录密码" @blur="checkPassword" />
          <span v-if="errors.password" class="err">{{ errors.password }}</span>
        </div>
        <div class="field">
          <label>确认密码</label>
          <el-input v-model="form.confirmPassword" show-password placeholder="再次输入密码" @blur="checkConfirm" />
          <span v-if="errors.confirmPassword" class="err">{{ errors.confirmPassword }}</span>
        </div>
      </div>

      <div class="actions">
        <el-button class="full" type="primary" @click="submitRegister">注册</el-button>
        <el-button class="full" @click="goLogin">已有账号，去登录</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

const router = useRouter();
const phoneRegex = /^1\d{10}$/;
const nickNameRegex = /^[\u4e00-\u9fa5A-Za-z0-9_]+$/;

const form = reactive({
  nickName: "",
  phone: "",
  password: "",
  confirmPassword: ""
});

const errors = reactive({
  nickName: "",
  phone: "",
  password: "",
  confirmPassword: ""
});

const checkNickName = () => {
  const val = form.nickName.trim();
  if (!val) {
    errors.nickName = "昵称不能为空";
  } else if (!nickNameRegex.test(val)) {
    errors.nickName = "仅支持中文、英文、数字和下划线";
  } else {
    errors.nickName = "";
  }
};

const checkPhone = () => {
  const val = form.phone.trim();
  if (!val) {
    errors.phone = "手机号不能为空";
  } else if (val.length === 11 && !phoneRegex.test(val)) {
    errors.phone = "手机号格式不正确，需以1开头";
  } else if (val.length === 11 && phoneRegex.test(val)) {
    errors.phone = "";
  } else {
    errors.phone = "";
  }
};

const checkPassword = () => {
  if (!form.password) {
    errors.password = "密码不能为空";
  } else {
    errors.password = "";
  }
  if (form.confirmPassword && form.password !== form.confirmPassword) {
    errors.confirmPassword = "两次密码不一致";
  }
};

const checkConfirm = () => {
  if (!form.confirmPassword) {
    errors.confirmPassword = "请再次输入密码";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "两次密码不一致";
  } else {
    errors.confirmPassword = "";
  }
};

const submitRegister = async () => {
  checkNickName();
  checkPhone();
  checkPassword();
  checkConfirm();

  if (!form.phone.trim()) {
    errors.phone = "手机号不能为空";
  } else if (!phoneRegex.test(form.phone.trim())) {
    errors.phone = "请输入正确的11位手机号";
  }

  if (errors.nickName || errors.phone || errors.password || errors.confirmPassword) {
    ElMessage.warning("请修正表单中的错误");
    return;
  }

  try {
    await http.post("/user/register", {
      nickName: form.nickName.trim(),
      phone: form.phone.trim(),
      password: form.password
    });
    ElMessage.success("注册成功，请前往登录");
    router.push("/login");
  } catch (error) {
    ElMessage.error(error.message || "注册失败");
  }
};

const goLogin = () => {
  router.push("/login");
};
</script>

<style scoped>
.register-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: radial-gradient(circle at top, #f6e2c7, #f3f0e9 55%);
}

.register-card {
  width: min(560px, 100%);
  background: #f7f3e8;
  border: 1px solid #d8d1c1;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 10px 28px rgba(58, 67, 44, 0.14);
}

.head h1 {
  margin: 0;
  font-size: 34px;
  font-family: Georgia, "Times New Roman", serif;
  color: #2d3423;
}

.head p {
  margin: 10px 0 0;
  color: #656753;
}

.form {
  margin-top: 22px;
}

.field {
  margin-bottom: 16px;
}

.field label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #3a3d2e;
}

.counter {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #8a8d7a;
}

.counter.warn {
  color: #c0392b;
}

.err {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #c0392b;
}

.actions {
  margin-top: 8px;
  display: grid;
  gap: 10px;
}

.full {
  width: 100%;
}
</style>
