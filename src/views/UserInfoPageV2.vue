<template>
  <section class="user-page" v-if="profileReady">
    <div class="hero card">
      <img class="avatar" :src="profile.icon || defaultIcon" alt="avatar" />
      <div class="hero-info">
        <h2>{{ profile.nickName || "未设置昵称" }}</h2>
        <p>手机号：{{ profile.phone || "--" }}</p>
        <p>城市：{{ profile.city || "未设置" }}</p>
      </div>
      <div class="hero-actions">
        <span class="gender-tag">{{ genderLabel(profile.gender) }}</span>
        <el-button v-if="profile.id != null" plain @click="goPublicView">他人视角</el-button>
        <el-button type="primary" @click="goEdit">修改资料</el-button>
      </div>
    </div>

    <div class="grid">
      <div class="card block">
        <h3>个人概览</h3>
        <div class="metrics">
          <div class="metric-item">
            <strong>{{ profile.followee ?? 0 }}</strong>
            <span>关注</span>
          </div>
          <div class="metric-item">
            <strong>{{ profile.fans ?? 0 }}</strong>
            <span>粉丝</span>
          </div>
          <div class="metric-item">
            <strong>{{ profile.blogCount ?? 0 }}</strong>
            <span>博客</span>
          </div>
        </div>
        <p class="sub-metrics">
          积分 {{ profile.credits ?? 0 }} · 等级 {{ profile.level ?? 0 }}
        </p>
        <p class="bio">{{ profile.introduce || "这个人很低调，还没有写个人简介。" }}</p>
      </div>

      <div class="card block">
        <h3>个人信息</h3>
        <ul class="info-list">
          <li><span>昵称</span><b>{{ profile.nickName || "--" }}</b></li>
          <li><span>手机号</span><b>{{ profile.phone || "--" }}</b></li>
          <li><span>邮箱</span><b>{{ profile.email || "--" }}</b></li>
          <li><span>性别</span><b>{{ genderLabel(profile.gender) }}</b></li>
          <li><span>城市</span><b>{{ profile.city || "--" }}</b></li>
          <li><span>生日</span><b>{{ profile.birthday || "--" }}</b></li>
          <li><span>个性签名</span><b>{{ profile.sign || "--" }}</b></li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "../stores/user";
import { genderLabel } from "../utils/dto";

defineProps({
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const userStore = useUserStore();
const router = useRouter();
const defaultIcon = "/image/default.png";
const profileReady = ref(false);

const profile = computed(() => userStore.user || {});

const goEdit = () => {
  router.push("/community/info-edit");
};

const goPublicView = () => {
  // 当前用户“他人视角”统一走后端 /user/preview，不再从前端传 id
  router.push("/community/other-info/me");
};

onMounted(async () => {
  try {
    await userStore.fetchMe();
    profileReady.value = true;
  } catch (error) {
    ElMessage.error("加载用户信息失败");
  }
});
</script>

<style scoped>
.user-page {
  display: grid;
  gap: 16px;
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow-soft);
}

.hero {
  display: grid;
  grid-template-columns: 84px 1fr auto;
  gap: 16px;
  align-items: center;
  padding: 20px;
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
}

.hero-info h2 {
  margin: 0 0 8px;
  font-size: 28px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.hero-info p {
  margin: 0 0 4px;
  color: var(--kc-muted);
}

.hero-actions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.gender-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--kc-card-elevated);
  border: 1px solid var(--kc-border-soft);
  color: var(--kc-muted);
  font-size: 12px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.block {
  padding: 20px;
}

.block h3 {
  margin: 0 0 12px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.metric-item {
  background: var(--kc-card-elevated);
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.metric-item strong {
  display: block;
  font-size: 26px;
}

.metric-item span {
  color: var(--kc-muted);
  font-size: 13px;
}

.sub-metrics {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--kc-muted);
}

.bio {
  margin: 14px 0 0;
  color: var(--kc-muted);
  line-height: 1.75;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.info-list li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--kc-border-soft);
  padding-bottom: 8px;
}

.info-list span {
  color: var(--kc-muted);
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
