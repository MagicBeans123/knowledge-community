import axios from "axios";

const http = axios.create({
  baseURL: "/api",
  timeout: 6000
});

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.authorization = token;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload.success !== "undefined") {
      if (!payload.success) {
        return Promise.reject(new Error(payload.errorMsg || "请求失败"));
      }
      return payload.data;
    }
    return payload;
  },
  (error) => {
    if (error?.response?.status === 401) {
      window.location.href = "/login";
      return Promise.reject(new Error("请先登录"));
    }
    return Promise.reject(new Error("服务器异常，请稍后重试"));
  }
);

export default http;
