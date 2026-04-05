<template>
  <section class="user-page" v-if="profileReady">
    <div class="hero card">
      <img class="avatar" :src="profile.icon || defaultIcon" alt="avatar" />
      <div class="hero-info">
        <h2>{{ profile.nickName || "No nickname" }}</h2>
        <p>Phone: {{ profile.phone || "--" }}</p>
        <p>Address: {{ profile.address || "Not set" }}</p>
      </div>
      <div class="hero-actions">
        <span class="gender-tag">{{ profile.gender || "Not set" }}</span>
        <el-button type="primary" @click="goEdit">Edit Profile</el-button>
      </div>
    </div>

    <div class="grid">
      <div class="card block">
        <h3>Overview</h3>
        <div class="metrics">
          <div class="metric-item">
            <strong>{{ profile.followeeCount || 0 }}</strong>
            <span>Following</span>
          </div>
          <div class="metric-item">
            <strong>{{ profile.fansCount || 0 }}</strong>
            <span>Followers</span>
          </div>
          <div class="metric-item">
            <strong>{{ profile.blogCount || 0 }}</strong>
            <span>Posts</span>
          </div>
        </div>
        <p class="bio">{{ profile.introduce || "No bio yet." }}</p>
      </div>

      <div class="card block">
        <h3>Profile Details</h3>
        <ul class="info-list">
          <li><span>Nickname</span><b>{{ profile.nickName || "--" }}</b></li>
          <li><span>Phone</span><b>{{ profile.phone || "--" }}</b></li>
          <li><span>Gender</span><b>{{ profile.gender || "--" }}</b></li>
          <li><span>Address</span><b>{{ profile.address || "--" }}</b></li>
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

const profile = computed(() => {
  const base = userStore.user || {};
  const extRaw = localStorage.getItem("kc_profile_ext");
  let ext = {};
  if (extRaw) {
    try {
      ext = JSON.parse(extRaw);
    } catch (error) {
      ext = {};
    }
  }
  return { ...base, ...ext };
});

const goEdit = () => {
  router.push("/community/info-edit");
};

onMounted(async () => {
  try {
    await userStore.fetchMe();
    profileReady.value = true;
  } catch (error) {
    ElMessage.error("Failed to load user profile");
  }
});
</script>

<style scoped>
.user-page {
  display: grid;
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 8px 22px rgba(30, 45, 80, 0.08);
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
}

.hero-info p {
  margin: 0 0 4px;
  color: #6e7a93;
}

.hero-actions {
  display: grid;
  gap: 10px;
  justify-items: end;
}

.gender-tag {
  padding: 4px 10px;
  border-radius: 999px;
  background: #f3f6fb;
  color: #4f5d7a;
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
  background: #f5f8fe;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}

.metric-item strong {
  display: block;
  font-size: 26px;
}

.metric-item span {
  color: #6e7a93;
  font-size: 13px;
}

.bio {
  margin: 14px 0 0;
  color: #5e6c89;
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
  border-bottom: 1px solid #eff3fa;
  padding-bottom: 8px;
}

.info-list span {
  color: #6e7a93;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
