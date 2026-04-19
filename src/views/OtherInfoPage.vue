<template>
  <div v-if="user" class="wrap">
    <section class="card user-page">
      <div class="profile">
        <img :src="user.icon || defaultIcon" alt="avatar" />
        <div class="profile-main">
          <h2>{{ user.nickName || "用户" }}</h2>
          <p v-if="user.city" class="muted">城市：{{ user.city }}</p>
          <p v-if="user.introduce" class="intro">{{ user.introduce }}</p>
          <div class="counts">
            <router-link class="count-link" :to="`/community/user/${displayUserId}/following`">
              关注 {{ user.followee ?? 0 }}
            </router-link>
            <span class="count-sep">·</span>
            <router-link class="count-link" :to="`/community/user/${displayUserId}/followers`">
              粉丝 {{ user.fans ?? 0 }}
            </router-link>
          </div>
        </div>
        <el-button v-if="!isSelf" type="primary" plain @click="toggleFollow">{{ followText }}</el-button>
      </div>
      <div class="quick-nav">
        <router-link class="qn-link" :to="`/community/user/${displayUserId}/shops`">{{ shopLinkLabel }}</router-link>
        <router-link class="qn-link" :to="`/community/user/${displayUserId}/blogs`">{{ blogLinkLabel }}</router-link>
      </div>
    </section>

    <section class="card blog-box">
      <div class="blog-head">
        <h3>博客</h3>
        <router-link class="all-link" :to="`/community/user/${displayUserId}/blogs`">全部</router-link>
      </div>
      <div v-if="blogsLoading" class="muted">加载中…</div>
      <div v-else class="blog-scroll" @scroll="onBlogScroll">
        <ul class="blog-ul">
          <li v-for="b in blogs" :key="b.id" @click="goBlog(b.id)">
            <div class="blog-row">
              <div class="blog-main">
                <p class="blog-title">{{ b.title || "无标题" }}</p>
                <p class="blog-time" v-if="b.createTime">{{ String(b.createTime).slice(0, 10) }}</p>
              </div>
              <div class="blog-meta">
                <div class="blog-author">
                  <img :src="b.icon || user?.icon || defaultIcon" alt="author" />
                  <span>{{ b.nickName || user?.nickName || "用户" }}</span>
                </div>
                <div class="blog-stats">
                  <span>赞 {{ b.liked ?? 0 }}</span>
                  <span>评 {{ b.comments ?? 0 }}</span>
                </div>
              </div>
            </div>
          </li>
        </ul>
        <p v-if="!blogs.length && !blogsLoadingMore && !blogsHasMore" class="load-more end">没有更多了</p>
        <p v-else-if="!blogs.length" class="load-more end">暂无</p>
        <p v-else-if="blogsLoadingMore" class="load-more">加载中…</p>
        <p v-else-if="!blogsHasMore" class="load-more end">没有更多了</p>
      </div>
    </section>

    <section class="card blog-box">
      <div class="blog-head">
        <h3>商店</h3>
        <router-link class="all-link" :to="`/community/user/${displayUserId}/shops`">全部</router-link>
      </div>
      <div v-if="shopsLoading" class="muted">加载中…</div>
      <ul v-else-if="shops.length" class="shop-ul">
        <li v-for="s in shops" :key="s.id" @click="goShop(s.id)">
          <div class="shop-row">
            <img :src="s.cover || defaultIcon" alt="shop" />
            <div class="shop-main">
              <p class="shop-title">{{ s.name || "未命名商店" }}</p>
              <p class="shop-sub">{{ s.address || "暂无地址" }}</p>
            </div>
            <div class="shop-meta">
              <span>评分 {{ s.score ?? 0 }}</span>
              <span>销量 {{ s.sold ?? 0 }}</span>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="muted">暂无商店</p>
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
import { normalizeBlogCard, normalizePublicUser, normalizeShop } from "../utils/dto";

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
const blogsLoadingMore = ref(false);
const blogsHasMore = ref(true);
const blogCursorSeconds = ref(0);
const shops = ref([]);
const shopsLoading = ref(false);
function parseCursorPayload(payload) {
  if (Array.isArray(payload)) {
    return { list: payload, nextSeconds: 0 };
  }
  const p = payload && typeof payload === "object" ? payload : {};
  const list = Array.isArray(p.list) ? p.list : Array.isArray(p.records) ? p.records : Array.isArray(p.items) ? p.items : [];
  const nextSeconds = Number(p.seconds ?? p.nextSeconds ?? p.cursor ?? 0) || 0;
  return { list, nextSeconds };
}

function toSeconds(value) {
  if (!value) return 0;
  if (Array.isArray(value)) {
    const [y, m, d, hh = 0, mm = 0, ss = 0] = value;
    const ts = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
    return Number.isFinite(ts) ? Math.floor(ts / 1000) : 0;
  }
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? Math.floor(ts / 1000) : 0;
}

const defaultIcon = "/image/default.png";
const targetId = props.id || route.params.id;
const isPreviewMe = computed(() => String(targetId) === "me");
const displayUserId = computed(() => (isPreviewMe.value ? String(user.value?.id ?? "") : String(targetId ?? "")));

const followText = computed(() => (followed.value ? "取消关注" : "关注"));

const isSelf = computed(() => {
  if (isPreviewMe.value) return true;
  const mid = me.value?.id;
  if (mid == null || targetId == null || targetId === "") return false;
  return String(mid) === String(targetId);
});

const shopLinkLabel = computed(() => (isSelf.value ? "我的商店" : "Ta 的商店"));
const blogLinkLabel = computed(() => (isSelf.value ? "我的博客" : "Ta 的博客"));

const fetchUser = async () => {
  const raw = isPreviewMe.value ? await http.get("/user/preview") : await http.get(`/user/${targetId}`);
  user.value = normalizePublicUser(raw);
  if (!isPreviewMe.value) {
    const flag = await http.get(`/follow/or/not/${targetId}`);
    followed.value = Boolean(flag);
  } else {
    followed.value = false;
  }
};

const goBlog = (id) => {
  router.push(`/community/blog/${id}`);
};

const goShop = (id) => {
  router.push(`/community/shop/${id}`);
};

const loadShopsPreview = async () => {
  shopsLoading.value = true;
  try {
    const uid = isPreviewMe.value ? user.value?.id : targetId;
    if (!uid) {
      shops.value = [];
      return;
    }
    const data = await http.get(`/shop/of/user/${uid}`);
    const list = Array.isArray(data) ? data : [];
    shops.value = list.map((x) => normalizeShop(x)).slice(0, 3);
  } catch {
    shops.value = [];
  } finally {
    shopsLoading.value = false;
  }
};

const loadBlogs = async () => {
  if (blogsLoading.value || blogsLoadingMore.value || !blogsHasMore.value) return;
  if (!blogs.value.length) blogsLoading.value = true;
  else blogsLoadingMore.value = true;
  try {
    const uid = isPreviewMe.value ? user.value?.id : targetId;
    if (!uid) {
      blogs.value = [];
      return;
    }
    const offset = blogs.value.length === 0 ? 0 : 1;
    const data = await http.get(`/blog/of/user/${uid}?seconds=${blogCursorSeconds.value}&offset=${offset}`);
    const { list, nextSeconds } = parseCursorPayload(data);
    if (!list.length) {
      blogsHasMore.value = nextSeconds !== 0 ? blogsHasMore.value : false;
      return;
    }
    blogs.value = blogs.value.concat(list.map((x) => normalizeBlogCard(x)));
    if (list.length < 10) {
      blogsHasMore.value = false;
    }
    if (list.length) {
      const mapped = list.map((x) => normalizeBlogCard(x));
      const tail = mapped[mapped.length - 1];
      blogCursorSeconds.value = nextSeconds > 0 ? nextSeconds : toSeconds(tail.createTime || tail.updateTime);
    }
  } catch {
    blogs.value = [];
  } finally {
    blogsLoading.value = false;
    blogsLoadingMore.value = false;
  }
};

const resetBlogsAndLoad = async () => {
  // 首次请求要求 seconds 为当前秒数
  blogCursorSeconds.value = Math.floor(Date.now() / 1000);
  blogsHasMore.value = true;
  blogs.value = [];
  await loadBlogs();
};

const onBlogScroll = async (event) => {
  const target = event.target;
  if (target.scrollTop + target.clientHeight < target.scrollHeight - 20) return;
  if (!blogsHasMore.value || blogsLoading.value || blogsLoadingMore.value) return;
  await loadBlogs();
};

const toggleFollow = async () => {
  if (isPreviewMe.value) return;
  try {
    await http.put(`/follow/${targetId}/${!followed.value}`);
    followed.value = !followed.value;
    ElMessage.success(followed.value ? "关注成功" : "已取消关注");
    import("../services/stompService.js")
      .then((m) => m.resyncSellerSeckillSubscriptions())
      .catch(() => {});
  } catch (e) {
    ElMessage.error(e.message || "操作失败");
    return;
  }
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
    await resetBlogsAndLoad();
    await loadShopsPreview();
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
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: var(--kc-muted);
}

.count-link {
  color: var(--kc-muted);
  text-decoration: none;
}

.count-link:hover {
  color: var(--el-color-primary);
}

.count-sep {
  user-select: none;
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

.shop-ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.shop-ul li {
  cursor: pointer;
}

.shop-row {
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--kc-border-soft);
  border-radius: 10px;
  padding: 10px;
}

.shop-row img {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--kc-border-soft);
}

.shop-main {
  flex: 1;
  min-width: 0;
}

.shop-title {
  margin: 0;
  font-size: 14px;
  color: var(--kc-text);
}

.shop-sub {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--kc-muted);
}

.shop-meta {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--kc-muted);
  text-align: right;
}

.blog-scroll {
  max-height: min(62vh, 560px);
  overflow-y: auto;
}

.blog-ul li {
  padding: 14px 0;
  border-bottom: 1px solid var(--kc-border-soft);
  cursor: pointer;
}

.blog-ul li:last-child {
  border-bottom: none;
}

.blog-ul li:hover {
  background: rgba(77, 92, 66, 0.05);
}

.blog-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
}

.blog-main {
  min-width: 0;
  flex: 1;
}

.blog-title {
  margin: 0;
  font-size: 15px;
  color: var(--kc-text);
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.blog-time {
  margin: 5px 0 0;
  font-size: 12px;
  color: var(--kc-muted);
}

.blog-meta {
  display: grid;
  gap: 6px;
  flex-shrink: 0;
  min-width: 170px;
}

.blog-author {
  display: flex;
  align-items: center;
  gap: 8px;
}

.blog-author img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--kc-border-soft);
}

.blog-author span {
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--kc-text);
}

.blog-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--kc-muted);
}

.load-more {
  margin: 0;
  padding: 10px 0 4px;
  text-align: center;
  color: var(--kc-muted);
  font-size: 13px;
}

.load-more.end {
  opacity: 0.85;
}
</style>
