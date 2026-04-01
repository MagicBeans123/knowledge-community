import { createRouter, createWebHistory } from "vue-router";
import AppDesktopLayoutV2 from "./layouts/AppDesktopLayoutV2.vue";
import LandingPage from "./views/LandingPage.vue";
import ExplorePageV2 from "./views/ExplorePageV2.vue";
import BlogDetailPage from "./views/BlogDetailPage.vue";
import BlogEditPageV2 from "./views/BlogEditPageV2.vue";
import UserInfoPageV2 from "./views/UserInfoPageV2.vue";
import OtherInfoPage from "./views/OtherInfoPage.vue";
import InfoEditPage from "./views/InfoEditPage.vue";
import ShopListPage from "./views/ShopListPage.vue";
import ShopDetailPage from "./views/ShopDetailPage.vue";
import ShopCreatePage from "./views/ShopCreatePage.vue";
import UserBlogsPage from "./views/UserBlogsPage.vue";
import UserShopsPage from "./views/UserShopsPage.vue";
import LoginPage from "./views/LoginPage.vue";
import RegisterPage from "./views/RegisterPage.vue";

const routes = [
  { path: "/", name: "landing", component: LandingPage },
  {
    path: "/community",
    component: AppDesktopLayoutV2,
    children: [
      { path: "", redirect: "/community/explore" },
      { path: "explore", name: "explore", component: ExplorePageV2 },
      { path: "shops", name: "shops", component: ShopListPage },
      { path: "shop-create", name: "shop-create", component: ShopCreatePage },
      { path: "shop/:id", name: "shop-detail", component: ShopDetailPage, props: true },
      { path: "user/:userId/blogs", name: "user-blogs", component: UserBlogsPage, props: true },
      { path: "user/:userId/shops", name: "user-shops", component: UserShopsPage, props: true },
      { path: "blog/:id", name: "blog-detail", component: BlogDetailPage, props: true },
      { path: "blog-edit", name: "blog-edit", component: BlogEditPageV2 },
      { path: "info", name: "info", component: UserInfoPageV2 },
      { path: "other-info/:id", name: "other-info", component: OtherInfoPage, props: true },
      { path: "info-edit", name: "info-edit", component: InfoEditPage }
    ]
  },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/register", name: "register", component: RegisterPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
