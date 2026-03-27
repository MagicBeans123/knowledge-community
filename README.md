# Knowledge Community (Vue3)

基于 `vue.mdc` 约束实现：

- Vue 3 + SFC（每个组件独立 `.vue` 文件）
- Composition API
- Pinia（用户全局状态）
- Vue Router（业务页面路由）
- Element Plus（桌面端 UI）

## 业务页面映射（仿 hmdp）

- `/` -> 首页（`index.html`）
- `/blog/:id` -> 博客详情（`blog-detail.html`）
- `/blog-edit` -> 发布博客（`blog-edit.html`）
- `/shop-list` -> 店铺列表（`shop-list.html`）
- `/shop/:id` -> 店铺详情（`shop-detail.html`）
- `/info` -> 我的信息（`info.html`）
- `/other-info/:id` -> 他人信息（`other-info.html`）
- `/info-edit` -> 编辑信息（`info-edit.html`）
- `/login` -> 手机验证码登录（`login.html`）
- `/login2` -> 账号密码登录（`login2.html`）

## 运行

```bash
npm install
npm run dev
```

默认开发端口：`5173`
