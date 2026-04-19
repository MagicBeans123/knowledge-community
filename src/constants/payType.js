/**
 * 与后端 PayType 对齐：支付方式
 */
export const PAY_TYPE = {
  /** 未选择支付方式；展示为「去支付」 */
  NONE: 0,
  WECHAT_PAY: 1,
  ALI_PAY: 2
};

/**
 * 与后端订单状态对齐（含配送、完成）
 */
export const ORDER_STATUS = {
  UNPAID: 1,
  PAID: 2,
  CANCEL: 3,
  REFUNDING: 4,
  FUNDED: 5,
  /** 商户已发货/配送中，买家可确认收货 */
  SHIPPING: 6,
  /** 买家已确认收货，交易完成 */
  COMPLETED: 7
};

/**
 * 订单列表「处理进度」筛选（买家历史、商户店铺订单与后端 query `filter` 对齐）。
 * all=不按未处理/已处理过滤；pending=未完结；complete=终态。
 */
export const ORDER_PROCESS_FILTER = {
  ALL: "all",
  PENDING: "pending",
  COMPLETE: "complete"
};

/** @alias ORDER_PROCESS_FILTER */
export const MERCHANT_ORDER_FILTER = ORDER_PROCESS_FILTER;

/** 供下拉框：按 status 精确筛选（1～7） */
export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: 1, label: "未支付" },
  { value: 2, label: "已支付" },
  { value: 3, label: "已取消" },
  { value: 4, label: "退款中" },
  { value: 5, label: "已退款" },
  { value: 6, label: "配送中" },
  { value: 7, label: "已完成" }
];

/** 与 filter=pending 一致：未完结态 */
export const ORDER_STATUS_VALUES_PENDING = [1, 2, 4, 6];

/** 与 filter=complete 一致：终态 */
export const ORDER_STATUS_VALUES_COMPLETE = [3, 5, 7];

/**
 * 根据「全部 / 未处理 / 已处理」返回状态下拉可选项，避免与 pending、complete 语义冲突。
 * @param {string} processFilter ORDER_PROCESS_FILTER.ALL | PENDING | COMPLETE
 */
export function orderStatusOptionsForProcessFilter(processFilter) {
  if (processFilter === ORDER_PROCESS_FILTER.PENDING) {
    return ORDER_STATUS_FILTER_OPTIONS.filter((o) => ORDER_STATUS_VALUES_PENDING.includes(o.value));
  }
  if (processFilter === ORDER_PROCESS_FILTER.COMPLETE) {
    return ORDER_STATUS_FILTER_OPTIONS.filter((o) => ORDER_STATUS_VALUES_COMPLETE.includes(o.value));
  }
  return ORDER_STATUS_FILTER_OPTIONS;
}

/** 商户视角「未处理」：待跟进（含未付、待发货、退款中、配送中等） */
export function isMerchantPending(order) {
  if (!order) return false;
  const s = Number(order.status);
  return (
    s === ORDER_STATUS.UNPAID ||
    s === ORDER_STATUS.PAID ||
    s === ORDER_STATUS.REFUNDING ||
    s === ORDER_STATUS.SHIPPING
  );
}

/** 商户视角「完成」：终态（已收货、已退款、已取消等） */
export function isMerchantCompleted(order) {
  if (!order) return false;
  const s = Number(order.status);
  return (
    s === ORDER_STATUS.FUNDED || s === ORDER_STATUS.COMPLETED || s === ORDER_STATUS.CANCEL
  );
}

/** 商户：支付成功后、尚未发货前，可点击「配送」 */
export function canMerchantShipOrder(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.PAID;
}

/**
 * 商户：仅「未支付」可取消 → 已取消(3)（与 POST merchant/cancel 一致）
 */
export function canMerchantCancelOrder(order) {
  return orderIsUnpaid(order);
}

/**
 * 商户：「退款中」可操作完成退款 → 已退款(5)（与 POST merchant/refund/complete 一致）
 */
export function canMerchantCompleteRefund(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.REFUNDING;
}

/** 买家：配送中可确认收货 */
export function canBuyerConfirmReceive(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.SHIPPING;
}

export function formatPayType(payType) {
  try {
    if (payType === null || typeof payType === "undefined") {
      return "待选择（去支付）";
    }
    if (typeof payType === "object") {
      return "未知";
    }
    const s = String(payType).trim();
    if (s === "") return "待选择（去支付）";
    const n = Number(payType);
    if (Number.isNaN(n)) return "未知";
    if (n === PAY_TYPE.NONE) return "去支付";
    if (n === PAY_TYPE.WECHAT_PAY) return "微信支付";
    if (n === PAY_TYPE.ALI_PAY) return "支付宝支付";
    return "未知";
  } catch {
    return "未知";
  }
}

export function formatOrderStatus(status) {
  const s = Number(status);
  if (s === ORDER_STATUS.UNPAID) return "未支付";
  if (s === ORDER_STATUS.PAID) return "已支付";
  if (s === ORDER_STATUS.CANCEL) return "已取消";
  if (s === ORDER_STATUS.REFUNDING) return "退款中";
  if (s === ORDER_STATUS.FUNDED) return "已退款";
  if (s === ORDER_STATUS.SHIPPING) return "配送中";
  if (s === ORDER_STATUS.COMPLETED) return "已完成";
  return "未知";
}

/** 未付款（待支付） */
export function orderIsUnpaid(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.UNPAID;
}

/** 已付款成功（仅严格「已支付」态；不含配送中/已完成） */
export function orderIsPaidSuccess(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.PAID;
}

/**
 * 买家：仅「未支付」可取消订单 → 已取消(3)（DELETE /goods/order/cancel）
 */
export function canBuyerCancelUnpaidOrder(order) {
  return orderIsUnpaid(order);
}

/**
 * 买家：「已支付」可申请退款 → 退款中(4)（POST /goods/order/buyer/refund/apply）；未发货前等条件由后端校验。
 * 后端需回滚商户营业额、Redis/DB 库存等。
 */
export function canBuyerApplyRefundWhenPaid(order) {
  if (!order) return false;
  return Number(order.status) === ORDER_STATUS.PAID;
}

/** @alias canBuyerCancelUnpaidOrder */
export function canCancelOrder(order) {
  return canBuyerCancelUnpaidOrder(order);
}
