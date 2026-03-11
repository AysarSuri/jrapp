const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("erp-data-updates") : null;

export function broadcastDataUpdate(type: string) {
  channel?.postMessage({ type, timestamp: Date.now() });
}

export function onDataUpdate(callback: (type: string) => void): () => void {
  if (!channel) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type) {
      callback(event.data.type);
    }
  };
  channel.addEventListener("message", handler);
  return () => channel.removeEventListener("message", handler);
}
