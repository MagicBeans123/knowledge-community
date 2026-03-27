import { createRouter, createWebHistory } from "vue-router";
import AppDesktopLayout from "../layouts/AppDesktopLayout.vue";
import LandingPage from "../views/LandingPage.vue";
import HomePage from "../views/HomePage.vue";
import BlogDetailPage from "../views/BlogDetailPage.vue";
import BlogEditPage from "../views/BlogEditPage.vue";
import UserInfoPage from "../views/UserInfoPage.vue";
import OtherInfoPage from "../views/OtherInfoPage.vue";
import InfoEditPage from "../views/InfoEditPage.vue";
import LoginPage from "../views/LoginPage.vue";
import RegisterPage from "../views/RegisterPage.vue";

const routes = [
  { path: "/", name: "landing", component: LandingPage },
  {
    path: "/community",
    component: AppDesktopLayout,
    children: [
      { path: "", name: "home", component: HomePage },
      { path: "blog/:id", name: "blog-detail", component: BlogDetailPage, props: true },
      { path: "blog-edit", name: "blog-edit", component: BlogEditPage },
      { path: "info", name: "info", component: UserInfoPage },
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
