<template>
  <div class="login-shell">
    <section class="card login-card">
      <h2>登录 Knowledge Community</h2>
      <div class="form">
        <div class="field">
          <label>手机号</label>
          <el-input v-model="phone" maxlength="11" placeholder="请输入11位手机号" @input="checkPhone" />
          <span class="counter" :class="{ warn: phone.length > 0 && phone.length !== 11 }">
            {{ phone.length }} / 11
          </span>
          <span v-if="errors.phone" class="err">{{ errors.phone }}</span>
        </div>
        <div class="field">
          <label>验证码</label>
          <div class="code-row">
            <el-input v-model="code" maxlength="6" placeholder="请输入验证码" />
            <el-button @click="sendCode">发送验证码</el-button>
          </div>
          <span v-if="errors.code" class="err">{{ errors.code }}</span>
        </div>
      </div>
      <el-button type="primary" class="full" @click="login">登录</el-button>
      <div class="jump-links">
        <el-button link @click="router.push('/register')">还没注册？去注册</el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";

const phone = ref("");
const code = ref("");
const router = useRouter();
const phoneRegex = /^1\d{10}$/;

const errors = reactive({
  phone: "",
  code: ""
});

const checkPhone = () => {
  const val = phone.value.trim();
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

const checkCode = () => {
  if (!code.value.trim()) {
    errors.code = "验证码不能为空";
  } else {
    errors.code = "";
  }
};

const sendCode = async () => {
  checkPhone();
  if (!phone.value.trim()) {
    errors.phone = "手机号不能为空";
    return;
  }
  if (!phoneRegex.test(phone.value.trim())) {
    errors.phone = "请输入正确的11位手机号";
    return;
  }
  await http.post("/user/code", null, { params: { phone: phone.value } });
  ElMessage.success("验证码已发送");
};

const login = async () => {
  checkPhone();
  checkCode();

  if (!phone.value.trim()) {
    errors.phone = "手机号不能为空";
  } else if (!phoneRegex.test(phone.value.trim())) {
    errors.phone = "请输入正确的11位手机号";
  }

  if (errors.phone || errors.code) {
    ElMessage.warning("请修正表单中的错误");
    return;
  }

  const data = await http.post("/user/login", {
    phone: phone.value,
    code: code.value
  });
  sessionStorage.setItem("token", data.token);
  ElMessage.success("登录成功");
  router.push("/community");
};
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background: radial-gradient(circle at top, #f6e2c7, #f3f0e9 55%);
}

.card {
  background: #f7f3e8;
  border: 1px solid #d8d1c1;
  border-radius: 14px;
  box-shadow: 0 10px 28px rgba(58, 67, 44, 0.14);
}

.login-card {
  width: min(560px, 100%);
  padding: 28px;
}

h2 {
  margin: 0 0 18px;
  font-size: 34px;
  font-family: Georgia, "Times New Roman", serif;
  color: #2d3423;
}

.form {
  margin-bottom: 14px;
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

.code-row {
  display: grid;
  grid-template-columns: 1fr 110px;
  gap: 8px;
}

.full {
  width: 100%;
}

.jump-links {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
}
</style>
