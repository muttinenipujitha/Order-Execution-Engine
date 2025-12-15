import type WebSocket from "ws";
export type StatusPayload = {
  orderId: string;
  status: "pending" | "routing" | "building" | "submitted" | "confirmed" | "failed";
  timestamp: string;
  data?: any;
};

class WsHub {
  private subs = new Map<string, Set<WebSocket>>();
  subscribe(orderId: string, ws: WebSocket) {
    if (!this.subs.has(orderId)) this.subs.set(orderId, new Set());
    this.subs.get(orderId)!.add(ws);
    ws.on("close", () => this.unsubscribe(orderId, ws));
    ws.on("error", () => this.unsubscribe(orderId, ws));
  }
  unsubscribe(orderId: string, ws: WebSocket) {
    const set = this.subs.get(orderId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) this.subs.delete(orderId);
  }
  publish(msg: StatusPayload) {
    const set = this.subs.get(msg.orderId);
    if (!set) return;
    const payload = JSON.stringify(msg);
    for (const ws of set) {
      try { ws.send(payload); } catch {}
    }
  }
}
export const wsHub = new WsHub();
