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
    }
  }
});
