// Minimal client for public MCP servers (JSON-RPC over HTTP), used server-side only.
export async function mcpSession(url: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  const init = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "shaz-does-holidays", version: "1" } } }) });
  const sid = init.headers.get("mcp-session-id");
  await init.text();
  if (sid) headers["mcp-session-id"] = sid;
  await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) }).then(r => r.text()).catch(() => "");
  let n = 10;
  return async function call(name: string, args: Record<string, unknown>) {
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: n++, method: "tools/call", params: { name, arguments: args } }) });
    let text = await r.text();
    // Some servers answer as server-sent events
    if (text.startsWith("event:") || text.startsWith("data:")) {
      const line = text.split("\n").filter(l => l.startsWith("data:")).pop() || "";
      text = line.slice(5).trim();
    }
    const j = JSON.parse(text);
    if (j.error) throw new Error(j.error.message || "MCP error");
    return j.result;
  };
}
