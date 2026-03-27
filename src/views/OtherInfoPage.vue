<template>
  <section class="card user-page" v-if="user">
    <div class="profile">
      <img :src="user.icon || defaultIcon" alt="avatar" />
      <div>
        <h2>{{ user.nickName }}</h2>
        <p>ID：{{ user.id }}</p>
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
  user.value = await http.get(`/user/${targetId}`);
  followed.value = await http.get(`/follow/or/not/${targetId}`);
};

const toggleFollow = async () => {
  await http.put(`/follow/${targetId}/${!followed.value}`);
  followed.value = !followed.value;
  ElMessage.success(followed.value ? "关注成功" : "已取消关注");
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
</style>
