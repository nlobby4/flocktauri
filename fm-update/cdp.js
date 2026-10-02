// Evaluate JS in the live WebView2 page: node cdp.js "<expression>"
(async () => {
  const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
  const page = pages.find((p) => p.type === "page" && p.url.startsWith("https://flockmod"));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id !== 1) return;
    const r = d.result;
    if (r.exceptionDetails) console.log("EXCEPTION:", r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    else console.log(typeof r.result.value === "string" ? r.result.value : JSON.stringify(r.result.value, null, 1));
    ws.close();
  };
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: `(async()=>{ ${process.argv[2]} })()`, awaitPromise: true, returnByValue: true } }));
})();
