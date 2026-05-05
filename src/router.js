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
import ShopGoodsPage from "./views/ShopGoodsPage.vue";
import GoodsDetailPage from "./views/GoodsDetailPage.vue";
import OrderManagementPage from "./views/OrderManagementPage.vue";
import OrderPayPage from "./views/OrderPayPage.vue";
import ShopCreatePage from "./views/ShopCreatePage.vue";
import ShopEditPage from "./views/ShopEditPage.vue";
import UserBlogsPage from "./views/UserBlogsPage.vue";
import UserShopsPage from "./views/UserShopsPage.vue";
import FollowListPage from "./views/FollowListPage.vue";
import ReadingHistoryListPage from "./views/ReadingHistoryListPage.vue";
import ReadingHistoryRedirect from "./views/ReadingHistoryRedirect.vue";
import LoginPage from "./views/LoginPage.vue";
import RegisterPage from "./views/RegisterPage.vue";
import { useReadingGraphStore } from "./stores/readingGraph.js";
import {
  stashReadingGraphNavigationFrom,
  syncReadingGraphPopNavigationFlag
} from "./utils/readingGraphSession.js";

const routes = [
  { path: "/", name: "landing", component: LandingPage },
  {
    path: "/community",
    component: AppDesktopLayoutV2,
    children: [
      { path: "", redirect: "/community/explore" },
      { path: "explore", name: "explore", component: ExplorePageV2 },
      { path: "shops", name: "shops", component: ShopListPage },
      { path: "shop-create", redirect: "/community/info" },
      { path: "shop/:id/edit", name: "shop-edit", component: ShopEditPage, props: true },
      { path: "shop/:id", name: "shop-detail", component: ShopDetailPage, props: true },
      { path: "shop/:id/goods", name: "shop-goods", component: ShopGoodsPage, props: true },
      { path: "goods/:id", name: "goods-detail", component: GoodsDetailPage, props: true },
      { path: "orders", name: "order-management", component: OrderManagementPage },
      { path: "order/pay/:orderId", name: "order-pay", component: OrderPayPage, props: true },
      { path: "user/:userId/blogs", name: "user-blogs", component: UserBlogsPage, props: true },
      { path: "user/:userId/shops/create", name: "user-shop-create", component: ShopCreatePage, props: true },
      { path: "user/:userId/shops", name: "user-shops", component: UserShopsPage, props: true },
      { path: "user/:userId/following", name: "user-following", component: FollowListPage, props: true },
      { path: "user/:userId/followers", name: "user-followers", component: FollowListPage, props: true },
      { path: "blog/:id", name: "blog-detail", component: BlogDetailPage, props: true },
      { path: "graph/history", name: "graph-history", component: ReadingHistoryListPage },
      {
        path: "graph/history/:historyId",
        name: "graph-history-detail",
        component: ReadingHistoryRedirect,
        props: true
      },
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

router.beforeEach((to, from) => {
  syncReadingGraphPopNavigationFlag();
  stashReadingGraphNavigationFrom(from);
});

/** 离开博文详情页时清空本地轨迹图（再进博文会重新 POST from:null） */
router.afterEach((to) => {
  if (to.name !== "blog-detail") {
    try {
      useReadingGraphStore().reset();
    } catch {
      /* Pinia 未就绪时跳过 */
    }
  }
});

export default router;
