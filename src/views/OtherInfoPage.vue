<template>
  <div v-if="user" class="wrap">
    <section class="card user-page">
      <p v-if="isSelf" class="preview-banner">他人视角：这是你对外展示的样子（与访客看到的一致）</p>
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
        <el-button v-if="!isSelf" type="primary" plain @click="toggleFollow">{{ followText }}</el-button>
      </div>
      <div class="quick-nav">
        <router-link class="qn-link" :to="`/community/user/${targetId}/shops`">{{ shopLinkLabel }}</router-link>
        <router-link class="qn-link" :to="`/community/user/${targetId}/blogs`">{{ blogLinkLabel }}</router-link>
      </div>
    </section>

    <section class="card blog-box">
      <div class="blog-head">
        <h3>博客</h3>
        <router-link class="all-link" :to="`/community/user/${targetId}/blogs`">全部</router-link>
      </div>
      <div v-if="blogsLoading" class="muted">加载中…</div>
      <ul v-else-if="blogs.length" class="blog-ul">
        <li v-for="b in blogs" :key="b.id" @click="goBlog(b.id)">
          {{ b.title }}
        </li>
      </ul>
      <p v-else class="muted">暂无</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { storeToRefs } from "pinia";
import http from "../api/http";
import { useUserStore } from "../stores/user";
import { normalizeBlogCard, normalizePublicUser } from "../utils/dto";

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
const router = useRouter();
const userStore = useUserStore();
const { user: me } = storeToRefs(userStore);
const user = ref(null);
const followed = ref(false);
const blogs = ref([]);
const blogsLoading = ref(false);
const defaultIcon = "/imgs/icons/default-icon.png";
const targetId = props.id || route.params.id;

const followText = computed(() => (followed.value ? "取消关注" : "关注"));

const isSelf = computed(() => {
  const mid = me.value?.id;
  if (mid == null || targetId == null || targetId === "") return false;
  return Number(mid) === Number(targetId);
});

const shopLinkLabel = computed(() => (isSelf.value ? "我的商店" : "Ta 的商店"));
const blogLinkLabel = computed(() => (isSelf.value ? "我的博客" : "Ta 的博客"));

const fetchUser = async () => {
  const raw = await http.get(`/user/${targetId}`);
  user.value = normalizePublicUser(raw);
  const flag = await http.get(`/follow/or/not/${targetId}`);
  followed.value = Boolean(flag);
};

const goBlog = (id) => {
  router.push(`/community/blog/${id}`);
};

const loadBlogs = async () => {
  blogsLoading.value = true;
  try {
    const data = await http.get(`/blog/of/user/${targetId}?current=1`);
    const list = Array.isArray(data) ? data : [];
    blogs.value = list.slice(0, 8).map((x) => normalizeBlogCard(x));
  } catch {
    blogs.value = [];
  } finally {
    blogsLoading.value = false;
  }
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
    const token = sessionStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      try {
        await userStore.fetchMe();
      } catch {
        /* 未登录或接口失败不影响公开资料页 */
      }
    }
    await fetchUser();
    await loadBlogs();
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

.preview-banner {
  margin: 0 0 14px;
  padding: 10px 12px;
  font-size: 13px;
  color: var(--kc-muted);
  background: rgba(77, 92, 66, 0.08);
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
}

.quick-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--kc-border-soft);
}

.qn-link {
  font-size: 14px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.qn-link:hover {
  text-decoration: underline;
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

.wrap {
  display: grid;
  gap: 14px;
}

.blog-box {
  padding: 16px 20px 20px;
}

.blog-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.blog-head h3 {
  margin: 0;
  font-size: 16px;
  color: var(--kc-text);
}

.all-link {
  font-size: 13px;
  color: var(--el-color-primary);
  text-decoration: none;
}

.all-link:hover {
  text-decoration: underline;
}

.blog-ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.blog-ul li {
  padding: 10px 0;
  border-bottom: 1px solid var(--kc-border-soft);
  font-size: 14px;
  color: var(--kc-text);
  cursor: pointer;
}

.blog-ul li:last-child {
  border-bottom: none;
}

.blog-ul li:hover {
  color: var(--el-color-primary);
}
</style>
