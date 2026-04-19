import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import http from "../api/http.js";

/** SockJS 握手 URL（不带 token；后端应对 /ws 放行）。鉴权见 STOMP CONNECT 的 authorization。 */
const WS_PATH = "/api/ws";

/** 断线后库自动重连的最多次数（每次 WebSocket close 计一次，STOMP 连上后归零） */
const MAX_STOMP_RECONNECTS = 3;

let stompClient = null;

let wsCloseCountSinceStompConnect = 0;

/** 主动 disconnect 触发的 close 不计入重连次数 */
let ignoreNextWsCloseForCounter = false;

function resetReconnectCounter() {
  wsCloseCountSinceStompConnect = 0;
}

/** sellerUserId -> StompSubscription */
const sellerSeckillSubscriptions = new Map();

/** 同一连接上其它业务（如订单推送）在 CONNECTED 后注册 */
const connectListeners = new Set();

function getToken() {
  const raw = sessionStorage.getItem("token");
  return raw && raw !== "undefined" && raw !== "null" && raw.trim() !== "" ? raw.trim() : "";
}

function clearSellerSeckillSubscriptions() {
  for (const sub of sellerSeckillSubscriptions.values()) {
    try {
      sub.unsubscribe();
    } catch {
      /* ignore */
    }
  }
  sellerSeckillSubscriptions.clear();
}

/**
 * 先 GET /follow/subscribe-users，再对每个 id 订阅 /topic/seller/{id}/seckill。
 * 内部会先清空旧订阅（等价于按新列表整体重绑）。
 */
async function subscribeSellerSeckillTopics() {
  const client = stompClient;
  if (!client?.connected) return;

  clearSellerSeckillSubscriptions();

  let ids = [];
  try {
    const data = await http.get("/follow/subscribe-users");
    ids = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("[stomp] GET /follow/subscribe-users failed", e);
    return;
  }

  if (!stompClient?.connected || stompClient !== client) return;

  for (const raw of ids) {
    const id = String(raw).trim();
    if (!/^\d+$/.test(id)) continue;
    const destination = `/topic/seller/${id}/seckill`;
    const sub = client.subscribe(destination, (message) => {
      let detail;
      try {
        detail = JSON.parse(message.body);
      } catch {
        return;
      }
      window.dispatchEvent(new CustomEvent("kc-seckill", { detail }));
    });
    sellerSeckillSubscriptions.set(id, sub);
  }
}

async function runOnConnected() {
  resetReconnectCounter();
  console.log("[stomp] WebSocket/STOMP 连接成功", { path: WS_PATH });
  await subscribeSellerSeckillTopics();
  const c = stompClient;
  for (const fn of [...connectListeners]) {
    try {
      if (c) fn(c);
    } catch (e) {
      console.error("[stomp] connect listener", e);
    }
  }
}

/**
 * 关注/取消关注成功后调用：按最新 subscribe-users 重建秒杀 topic 订阅。
 */
export async function resyncSellerSeckillSubscriptions() {
  await subscribeSellerSeckillTopics();
}

/**
 * 与订单推送等共用同一 STOMP 连接：在每次 CONNECTED（含重连）后执行。
 * 若已连接，会立即回调一次。
 * @returns 取消注册函数
 */
export function registerStompConnected(handler) {
  connectListeners.add(handler);
  if (stompClient?.connected) {
    try {
      handler(stompClient);
    } catch (e) {
      console.error("[stomp] register immediate", e);
    }
  }
  return () => connectListeners.delete(handler);
}

export function getStompClient() {
  return stompClient?.connected ? stompClient : null;
}

/**
 * 有 token 时建立 SockJS + STOMP；无 token 时断开。
 * 断线后由 @stomp/stompjs 按 reconnectDelay 自动重连，最多约 MAX_STOMP_RECONNECTS 次（见 onWebSocketClose），
 * 超出则 disconnect；需再连可刷新或再次进入社区壳。
 */
export function ensureConnected() {
  const token = getToken();
  if (!token) {
    disconnect();
    return;
  }
  if (stompClient?.connected) {
    return;
  }
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch {
      /* ignore */
    }
    stompClient = null;
  }

  resetReconnectCounter();

  stompClient = new Client({
    webSocketFactory: () => {
      try {
        return new SockJS(WS_PATH);
      } catch (e) {
        console.error("[stomp] SockJS", e);
        throw e;
      }
    },
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: (client) => {
      const t = getToken();
      client.connectHeaders = t ? { authorization: t } : {};
    },
    onConnect: runOnConnected,
    onDisconnect: () => {
      clearSellerSeckillSubscriptions();
    },
    onStompError: (frame) => {
      console.warn("[stomp] STOMP error", frame?.headers?.message || frame);
    },
    onWebSocketClose: () => {
      if (ignoreNextWsCloseForCounter) {
        ignoreNextWsCloseForCounter = false;
        return;
      }
      wsCloseCountSinceStompConnect += 1;
      if (wsCloseCountSinceStompConnect > MAX_STOMP_RECONNECTS) {
        console.warn(`[stomp] 已达最大自动重连次数（${MAX_STOMP_RECONNECTS} 次），停止重连`);
        ignoreNextWsCloseForCounter = true;
        disconnect();
      }
    }
  });
  stompClient.activate();
}

export function disconnect() {
  ignoreNextWsCloseForCounter = true;
  clearSellerSeckillSubscriptions();
  if (stompClient) {
    try {
      stompClient.deactivate();
    } catch {
      /* ignore */
    }
    stompClient = null;
  }
}

if (typeof window !== "undefined") {
  window.__kcStompDisconnect = disconnect;
}
