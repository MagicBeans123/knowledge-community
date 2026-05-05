<template>
  <section class="user-page" v-if="profileReady">
    <div class="user-page-layout" :class="{ 'user-page-layout--no-checkin': profile.id == null }">
      <div class="user-page-main">
        <div class="hero card hero-profile">
          <div class="hero-ribbon" aria-hidden="true" />
          <div class="hero-layout">
            <div class="hero-main">
              <div class="avatar-wrap">
                <img class="avatar" :src="profile.icon || defaultIcon" alt="avatar" />
              </div>
              <div class="hero-info">
                <p class="hero-welcome">个人主页</p>
                <h2>{{ profile.nickName || "未设置昵称" }}</h2>
                <div class="hero-meta">
                  <p><span class="meta-dot" aria-hidden="true" />手机号 {{ profile.phone || "—" }}</p>
                  <p><span class="meta-dot" aria-hidden="true" />城市 {{ profile.city || "未设置" }}</p>
                </div>
              </div>
            </div>
            <div class="hero-actions">
              <el-button plain @click="goOrderManage">订单管理</el-button>
              <el-button v-if="profile.id != null" plain @click="goMyBlogs">我的博客</el-button>
              <el-button v-if="profile.id != null" plain @click="goMyShops">我的店铺</el-button>
              <el-button v-if="profile.id != null" plain @click="goPublicView">他人视角</el-button>
              <el-button type="primary" @click="goEdit">修改资料</el-button>
              <el-button v-if="profile.id != null" :loading="loggingOut" @click="handleLogout">登出</el-button>
            </div>
          </div>
        </div>

        <div class="grid">
          <div class="card block block-elevated">
            <h3 class="section-title">个人概览</h3>
            <div class="metrics">
              <div
                class="metric-item metric-item--warm metric-click"
                role="button"
                tabindex="0"
                @click="goFollowing"
                @keydown.enter.prevent="goFollowing"
              >
                <strong>{{ profile.followee ?? 0 }}</strong>
                <span>关注</span>
              </div>
              <div
                class="metric-item metric-item--moss metric-click"
                role="button"
                tabindex="0"
                @click="goFollowers"
                @keydown.enter.prevent="goFollowers"
              >
                <strong>{{ profile.fans ?? 0 }}</strong>
                <span>粉丝</span>
              </div>
              <div class="metric-item metric-item--sand">
                <strong>{{ profile.blogCount ?? 0 }}</strong>
                <span>博客</span>
              </div>
            </div>
            <div class="tier-strip">
              <span class="tier-strip__badge" title="当前签到等级">Lv.{{ checkInTier.tier }}</span>
              <div class="tier-strip__content">
                <p class="tier-strip__main">
                  积分 <em>{{ profile.credits ?? 0 }}</em> · {{ checkInTier.tier }} 级（{{ checkInTier.tierName }}）· 累计签到
                  <em>{{ checkInTier.days }}</em> 天
                </p>
                <p v-if="checkInTier.nextAt != null" class="tier-strip__hint">
                  距离下一等级还需 <strong>{{ checkInTier.daysToNext }}</strong> 天
                </p>
                <p v-else class="tier-strip__hint tier-strip__hint--max">已达最高等级，感谢坚持</p>
              </div>
            </div>
            <p class="bio">
              {{ profile.introduce || "这个人很低调，还没有写个人简介。" }}
            </p>
          </div>

          <div class="card block block-elevated">
            <h3 class="section-title">个人信息</h3>
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
      </div>

      <aside v-if="profile.id != null" class="user-checkin-aside" aria-label="每日签到">
        <div class="user-checkin-aside__column">
          <CheckInPanel />
          <div class="user-checkin-aside__fill" aria-hidden="true" />
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useUserStore } from "../stores/user";
import { genderLabel } from "../utils/dto";
import { getCheckInTierInfo } from "../utils/checkInLevel";
import CheckInPanel from "../components/CheckInPanel.vue";

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
const loggingOut = ref(false);

const profile = computed(() => userStore.user || {});

/** 后端 level 字段：累计签到天数 → 展示等级 1～6 */
const checkInTier = computed(() => getCheckInTierInfo(profile.value?.level));

const handleLogout = async () => {
  loggingOut.value = true;
  try {
    await userStore.logout();
    ElMessage.success("已登出");
    router.push("/login");
  } finally {
    loggingOut.value = false;
  }
};

const goEdit = () => {
  router.push("/community/info-edit");
};

const goPublicView = () => {
  // 当前用户“他人视角”统一走后端 /user/preview，不再从前端传 id
  router.push("/community/other-info/me");
};

const goMyShops = () => {
  if (profile.value?.id == null) return;
  router.push(`/community/user/${profile.value.id}/shops`);
};

const goMyBlogs = () => {
  if (profile.value?.id == null) return;
  router.push(`/community/user/${profile.value.id}/blogs`);
};

const goOrderManage = () => {
  router.push("/community/orders");
};

const goFollowing = () => {
  if (profile.value?.id == null) return;
  router.push(`/community/user/${profile.value.id}/following`);
};

const goFollowers = () => {
  if (profile.value?.id == null) return;
  router.push(`/community/user/${profile.value.id}/followers`);
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
  padding: 4px 0 8px;
  box-sizing: border-box;
}

.user-page-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(228px, 272px);
  gap: 16px;
  align-items: stretch;
  min-height: 0;
}

.user-page-layout--no-checkin {
  grid-template-columns: 1fr;
}

.user-page-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.user-checkin-aside {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  min-height: 0;
}

.user-checkin-aside__column {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 100%;
  border-radius: 16px;
  border: 1px solid var(--kc-border);
  overflow: hidden;
  background: var(--kc-card);
  box-shadow: var(--kc-shadow-soft);
}

.user-checkin-aside__column :deep(.check-in-panel) {
  border-radius: 16px 16px 0 0;
  border: none;
  box-shadow: none;
}

.user-checkin-aside__fill {
  flex: 1 1 auto;
  min-height: 24px;
  background: linear-gradient(
    180deg,
    rgba(255, 253, 247, 0.55) 0%,
    var(--kc-page-bg) 72%
  );
  border-top: 1px solid var(--kc-border-soft);
}

.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 16px;
  box-shadow: var(--kc-shadow-soft);
}

.hero-profile {
  position: relative;
  overflow: hidden;
  background: var(--kc-hero-surface);
  border-color: rgba(var(--kc-primary-rgb), 0.12);
  box-shadow: var(--kc-shadow-lift);
}

.hero-ribbon {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 4px;
  background: var(--kc-ribbon);
  opacity: 0.92;
}

.hero {
  padding: 16px 20px 10px;
  padding-top: 18px;
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas:
    "main"
    "actions";
  align-items: start;
  row-gap: 4px;
}

.hero-main {
  grid-area: main;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 14px;
  min-width: 0;
}

.hero-actions {
  grid-area: actions;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
  margin: 2px -4px 0;
  border-top: 1px solid rgba(var(--kc-primary-rgb), 0.08);
}

.hero-actions :deep(.el-button) {
  border-radius: 10px;
  font-weight: 500;
}

.hero-actions :deep(.el-button--primary) {
  box-shadow: 0 4px 14px rgba(var(--kc-primary-rgb), 0.28);
}

.avatar-wrap {
  flex-shrink: 0;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(145deg, rgba(255, 253, 247, 0.95), rgba(var(--kc-primary-rgb), 0.2));
  box-shadow: 0 6px 20px rgba(45, 52, 35, 0.12);
}

.avatar {
  display: block;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--kc-card-elevated);
}

.hero-welcome {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--kc-subtle);
  font-weight: 600;
}

.hero-info h2 {
  margin: 0 0 10px;
  font-size: 28px;
  line-height: 1.25;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
  letter-spacing: 0.01em;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 22px;
}

.hero-meta p {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  line-height: 1.45;
  color: var(--kc-muted);
  font-size: 14px;
}

.meta-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(145deg, #6b7d5c, #4d5c42);
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--kc-primary-soft);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.block {
  padding: 22px 24px;
}

.block-elevated {
  background: linear-gradient(180deg, var(--kc-card-elevated) 0%, var(--kc-card) 100%);
  border-color: rgba(var(--kc-primary-rgb), 0.08);
}

.section-title {
  margin: 0 0 18px;
  font-size: 17px;
  font-weight: 700;
  color: var(--kc-text);
  letter-spacing: 0.02em;
  padding-left: 14px;
  border-left: 4px solid #4d5c42;
  line-height: 1.3;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.metric-item {
  border: 1px solid var(--kc-border-soft);
  border-radius: 14px;
  padding: 16px 12px;
  text-align: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.metric-item--warm {
  background: var(--kc-metric-warm);
}

.metric-item--moss {
  background: var(--kc-metric-moss);
}

.metric-item--sand {
  background: var(--kc-metric-sand);
}

.metric-click {
  cursor: pointer;
}

.metric-click:hover {
  border-color: rgba(var(--kc-primary-rgb), 0.35);
  box-shadow: 0 8px 22px rgba(58, 67, 44, 0.1);
  transform: translateY(-2px);
}

.metric-click:active {
  transform: translateY(0);
}

.metric-item strong {
  display: block;
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--kc-text);
  line-height: 1.15;
}

.metric-item span {
  display: block;
  margin-top: 6px;
  color: var(--kc-muted);
  font-size: 13px;
  font-weight: 500;
}

.tier-strip {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(120deg, var(--kc-primary-soft) 0%, rgba(255, 253, 247, 0.9) 55%, var(--kc-primary-soft) 100%);
  border: 1px solid rgba(var(--kc-primary-rgb), 0.12);
}

.tier-strip__badge {
  flex-shrink: 0;
  min-width: 44px;
  padding: 8px 10px;
  border-radius: 12px;
  background: linear-gradient(145deg, #4d5c42, #5f6f52);
  color: #faf9f4;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgba(var(--kc-primary-rgb), 0.25);
}

.tier-strip__content {
  min-width: 0;
}

.tier-strip__main {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--kc-text);
}

.tier-strip__main em {
  font-style: normal;
  font-weight: 700;
  color: #3d4a35;
}

.tier-strip__hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--kc-muted);
}

.tier-strip__hint strong {
  color: var(--kc-text);
  font-weight: 700;
}

.tier-strip__hint--max {
  color: var(--kc-subtle);
}

.bio {
  margin: 18px 0 0;
  padding: 14px 16px;
  color: var(--kc-muted);
  line-height: 1.75;
  background: rgba(255, 253, 247, 0.65);
  border-radius: 12px;
  border-left: 3px solid rgba(var(--kc-primary-rgb), 0.35);
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
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--kc-card-elevated);
  border: 1px solid var(--kc-border-soft);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.info-list li:hover {
  border-color: rgba(var(--kc-primary-rgb), 0.2);
  box-shadow: 0 4px 16px rgba(58, 67, 44, 0.06);
}

.info-list span {
  color: var(--kc-muted);
  font-size: 13px;
  flex-shrink: 0;
}

.info-list b {
  text-align: right;
  font-weight: 600;
  color: var(--kc-text);
  word-break: break-all;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .user-page-layout:not(.user-page-layout--no-checkin) {
    grid-template-columns: 1fr;
  }

  .user-checkin-aside__fill {
    min-height: 12px;
    flex: 0 0 auto;
  }
}
</style>
