import { defineStore } from "pinia";
import http from "../api/http";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null
  }),
  actions: {
    async fetchMe() {
      try {
        this.user = await http.get("/user/me");
      } catch (error) {
        this.user = null;
      }
    }
  }
});
