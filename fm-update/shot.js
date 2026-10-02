// Screenshot the live WebView2 page (or a clip of it): node shot.js out.png [x y w h]
(async () => {
  const [, , out, x, y, w, h] = process.argv;
  const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
  const page = pages.find((p) => p.type === "page" && p.url.startsWith("https://flockmod"));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id !== 1) return;
    require("fs").writeFileSync(out, Buffer.from(d.result.data, "base64"));
    ws.close();
  };
  const params = { format: "png" };
  if (w) params.clip = { x: +x, y: +y, width: +w, height: +h, scale: 1 };
  ws.send(JSON.stringify({ id: 1, method: "Page.captureScreenshot", params }));
})();
