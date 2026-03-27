<template>
  <section class="card user-page" v-if="userStore.user">
    <div class="profile">
      <img :src="userStore.user.icon || defaultIcon" alt="avatar" />
      <div>
        <h2>{{ userStore.user.nickName }}</h2>
        <p>账号：{{ userStore.user.phone }}</p>
      </div>
      <el-button @click="goEdit">编辑资料</el-button>
    </div>
    <el-divider />
    <div class="stats">
      <div class="stat-item">
        <strong>{{ userStore.user.followeeCount || 0 }}</strong>
        <span>关注</span>
      </div>
      <div class="stat-item">
        <strong>{{ userStore.user.fansCount || 0 }}</strong>
        <span>粉丝</span>
      </div>
      <div class="stat-item">
        <strong>{{ userStore.user.blogCount || 0 }}</strong>
        <span>笔记</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
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
const defaultIcon = "/imgs/icons/default-icon.png";

const goEdit = () => {
  router.push("/info-edit");
};

onMounted(async () => {
  try {
    await userStore.fetchMe();
  } catch (error) {
    ElMessage.error("加载用户信息失败");
  }
});
</script>

<style scoped>
.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(28, 45, 80, 0.08);
}

.user-page {
  padding: 20px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

h2 {
  margin: 0 0 4px;
}

p {
  margin: 0;
  color: #75829a;
}

.stats {
  display: flex;
  gap: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-item strong {
  font-size: 24px;
}

.stat-item span {
  color: #75829a;
}
</style>
