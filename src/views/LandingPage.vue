<template>
  <div class="landing-page">
    <header class="top-bar">
      <div class="brand">
        <span class="logo-dot"></span>
        Knowledge Community
      </div>
      <nav class="actions">
        <button class="btn ghost" @click="toLogin">登录</button>
        <button class="btn solid" @click="toRegister">注册</button>
      </nav>
    </header>

    <main class="hero-grid">
      <section class="hero-copy">
        <p class="eyebrow">Royal Knowledge Space</p>
        <h1>Hand touched by ideas</h1>
        <p class="intro">
          一个为学习者与创作者打造的知识社区。你可以分享笔记、记录探店经验、发现优秀作者，
          用内容连接兴趣与成长。
        </p>
        <div class="cta-group">
          <button class="btn solid" @click="toRegister">开始注册</button>
          <button class="btn outline" @click="toLogin">已有账号登录</button>
        </div>
      </section>

      <section class="hero-art">
        <div class="art-card">
          <div class="blob blob-a"></div>
          <div class="blob blob-b"></div>
          <div class="blob blob-c"></div>
        </div>
      </section>
    </main>

    <section class="feature-grid">
      <article class="feature">
        <h3>内容沉淀</h3>
        <p>支持图文笔记、点赞收藏、作者主页，沉淀个人知识资产。</p>
      </article>
      <article class="feature">
        <h3>主题探索</h3>
        <p>按分类快速浏览，找到你关注的店铺、话题和优质内容。</p>
      </article>
      <article class="feature">
        <h3>社交连接</h3>
        <p>关注创作者，构建你的学习圈层，让成长持续发生。</p>
      </article>
    </section>

    <footer class="contact">
      <div class="contact-title">Contact Us</div>
      <div class="contact-items">
        <span>Email: 13187213716@163.com</span>
        <span>Tel: +86 13187213716</span>
        <span>Address: Suzhou, Jiangsu, China</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const toLogin = () => {
  router.push("/login");
};

const toRegister = () => {
  router.push("/register");
};
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: #f2eee4;
  color: #222017;
  padding: 24px 32px 28px;
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 18px;
}

.top-bar {
  border: 1px solid #d8d1c1;
  background: #f7f3e8;
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #355333;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn {
  border-radius: 999px;
  padding: 8px 16px;
  border: 1px solid #2f4d2f;
  cursor: pointer;
  font-size: 14px;
}

.btn.ghost {
  background: transparent;
  color: #2f4d2f;
}

.btn.solid {
  background: #2f4d2f;
  color: #f7f3e8;
}

.btn.outline {
  background: transparent;
  color: #2f4d2f;
}

.hero-grid {
  border: 1px solid #d8d1c1;
  background: #f7f3e8;
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  min-height: 430px;
}

.hero-copy {
  border-right: 1px solid #d8d1c1;
  padding: 36px 40px;
}

.eyebrow {
  font-size: 14px;
  color: #505247;
  margin: 0 0 12px;
}

h1 {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 78px;
  line-height: 0.95;
  margin: 0;
}

.intro {
  margin-top: 22px;
  font-size: 18px;
  line-height: 1.75;
  max-width: 680px;
  color: #3d3e34;
}

.cta-group {
  margin-top: 28px;
  display: flex;
  gap: 12px;
}

.hero-art {
  display: grid;
  place-items: center;
  padding: 26px;
}

.art-card {
  width: min(88%, 420px);
  aspect-ratio: 3 / 4;
  background: #e5c49a;
  border: 1px solid #cfaf84;
  position: relative;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 42% 58% 63% 37% / 47% 38% 62% 53%;
  background: linear-gradient(140deg, #a96d3f, #cc9564);
}

.blob-a {
  width: 180px;
  height: 210px;
  top: 70px;
  left: 55px;
}

.blob-b {
  width: 120px;
  height: 145px;
  bottom: 80px;
  right: 42px;
}

.blob-c {
  width: 85px;
  height: 100px;
  top: 26px;
  right: 30px;
}

.feature-grid {
  border: 1px solid #d8d1c1;
  background: #f7f3e8;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.feature {
  padding: 22px 20px;
  border-right: 1px solid #d8d1c1;
}

.feature:last-child {
  border-right: none;
}

.feature h3 {
  margin: 0;
  font-size: 24px;
  font-family: Georgia, "Times New Roman", serif;
}

.feature p {
  margin: 12px 0 0;
  color: #505247;
  line-height: 1.7;
}

.contact {
  margin-top: auto;
  border: 1px solid #d8d1c1;
  background: #f7f3e8;
  padding: 18px 20px;
}

.contact-title {
  font-size: 20px;
  font-family: Georgia, "Times New Roman", serif;
}

.contact-items {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  color: #505247;
}

@media (max-width: 1160px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    border-right: none;
    border-bottom: 1px solid #d8d1c1;
  }

  h1 {
    font-size: 62px;
  }
}
</style>
