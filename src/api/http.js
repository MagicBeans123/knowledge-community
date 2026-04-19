import axios, { AxiosHeaders } from "axios";

const http = axios.create({
  baseURL: "/api",
  timeout: 6000
});

/**
 * 所有通过本实例发出的请求都会在这里统一附加鉴权头（若已登录）。
 * 各页面无需再单独写 authorization；未登录时 sessionStorage 无 token，则不会带该头。
 */
http.interceptors.request.use((config) => {
  const raw = sessionStorage.getItem("token");
  const token =
    raw && raw !== "undefined" && raw !== "null" && raw.trim() !== "" ? raw : null;
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("authorization", token);
    config.headers = headers;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    // 后端统一返回 Result：{ code, msg, data }
    if (payload && typeof payload.code !== "undefined") {
      if (payload.code !== 1) {
        return Promise.reject(new Error(payload.msg || "请求失败"));
      }
      return payload.data;
    }
    // 兼容旧接口：直接就是 data
    return payload;
  },
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem("token");
      if (typeof window !== "undefined") {
        if (window.__kcStompDisconnect) {
          window.__kcStompDisconnect();
        } else {
          import("../services/stompService.js")
            .then((m) => m.disconnect())
            .catch(() => {});
        }
      }
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === "/login" || currentPath === "/register";
      if (!isAuthPage) {
        window.location.href = "/";
      }
      return Promise.reject(new Error("请先登录"));
    }
    return Promise.reject(new Error("服务器异常，请稍后重试"));
  }
);

export default http;
