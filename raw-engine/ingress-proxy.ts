import http from "node:http";
import httpProxy from "http-proxy"; // Native Node HTTP proxy stream engine

export class NativeHostingEngine {
  private proxy = httpProxy.createProxyServer({});
  private routingTable: Map<string, number> = new Map();

  // Register local dynamic port bindings for user projects
  public registerHostedApp(domain: string, internalPort: number): void {
    this.routingTable.set(domain.toLowerCase(), internalPort);
    console.log(`[Hosting Pipeline] Bound ${domain} -> http://127.0.0.1:${internalPort}`);
  }

  public startIngressServer(port: number = 80): void {
    const server = http.createServer((req, res) => {
      const hostHeader = req.headers.host?.split(":")[0].toLowerCase();
      const targetPort = hostHeader ? this.routingTable.get(hostHeader) : null;

      if (targetPort) {
        this.proxy.web(req, res, { target: `http://127.0.0.1:${targetPort}` }, (err) => {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Bad Gateway: Host application is starting or unreachable.");
        });
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`No hosted instance configured for domain: ${hostHeader}`);
      }
    });

    server.listen(port, () => {
      console.log(`[Raw Engine] Native Hosting Reverse Proxy running on port ${port}`);
    });
  }
}