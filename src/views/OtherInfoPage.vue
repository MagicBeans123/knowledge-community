<template>
  <section class="card user-page" v-if="user">
    <div class="profile">
      <img :src="user.icon || defaultIcon" alt="avatar" />
      <div class="profile-main">
        <h2>{{ user.nickName || "用户" }}</h2>
        <p class="uid">用户 ID：{{ user.id }}</p>
        <p v-if="user.city" class="muted">城市：{{ user.city }}</p>
        <p v-if="user.introduce" class="intro">{{ user.introduce }}</p>
        <div class="counts">
          <span>关注 {{ user.followee ?? 0 }}</span>
          <span>粉丝 {{ user.fans ?? 0 }}</span>
        </div>
      </div>
      <el-button type="primary" plain @click="toggleFollow">{{ followText }}</el-button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import http from "../api/http";
import { normalizePublicUser } from "../utils/dto";

const props = defineProps({
  id: {
    type: [String, Number],
    required: false,
    default: ""
  },
  keyword: {
    type: String,
    required: false,
    default: ""
  }
});

const route = useRoute();
const user = ref(null);
const followed = ref(false);
const defaultIcon = "/imgs/icons/default-icon.png";
const targetId = props.id || route.params.id;

const followText = computed(() => (followed.value ? "取消关注" : "关注"));

const fetchUser = async () => {
  const raw = await http.get(`/user/${targetId}`);
  user.value = normalizePublicUser(raw);
  const flag = await http.get(`/follow/or/not/${targetId}`);
  followed.value = Boolean(flag);
};

const toggleFollow = async () => {
  await http.put(`/follow/${targetId}/${!followed.value}`);
  followed.value = !followed.value;
  ElMessage.success(followed.value ? "关注成功" : "已取消关注");
  try {
    const raw = await http.get(`/user/${targetId}`);
    user.value = normalizePublicUser(raw);
  } catch (error) {
    /* ignore refresh failure */
  }
};

onMounted(async () => {
  try {
    await fetchUser();
  } catch (error) {
    ElMessage.error(error.message);
  }
});
</script>

<style scoped>
.card {
  background: var(--kc-card);
  border: 1px solid var(--kc-border);
  border-radius: 14px;
  box-shadow: var(--kc-shadow-soft);
}

.user-page {
  padding: 20px;
}

.profile {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.profile img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

h2 {
  margin: 0 0 4px;
  font-family: Georgia, "Times New Roman", serif;
  color: var(--kc-text);
}

.uid {
  margin: 0 0 6px;
  color: var(--kc-muted);
  font-size: 14px;
}

.muted {
  margin: 0 0 8px;
  color: var(--kc-muted);
  font-size: 14px;
}

.intro {
  margin: 0 0 10px;
  line-height: 1.6;
  color: var(--kc-muted);
  font-size: 14px;
}

.counts {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--kc-muted);
}
</style>
