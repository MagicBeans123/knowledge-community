import { defineStore } from "pinia";
import http from "../api/http";
import { normalizeCurrentUser } from "../utils/dto";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null
  }),
  actions: {
    async fetchMe() {
      try {
        const data = await http.get("/user/me");
        this.user = normalizeCurrentUser(data);
      } catch (error) {
        this.user = null;
      }
    },
    /** 调用 POST /user/logout 后清除本地登录态；接口失败时仍清理客户端，避免卡在半登出状态 */
    async logout() {
      try {
        await http.post("/user/logout");
      } catch {
        /* ignore：后端未实现或网络错误时仍执行本地清理 */
      }
      sessionStorage.removeItem("token");
      this.user = null;
      import("../services/stompService.js")
        .then((m) => m.disconnect())
        .catch(() => {});
    }
  }
});
