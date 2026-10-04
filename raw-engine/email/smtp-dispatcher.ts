import net from "node:net";
import tls from "node:tls";
import crypto from "node:crypto";

export interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  dkimPrivateKey?: string;
  dkimSelector?: string;
}

export class NativeEmailEngine {
  // Signs outgoing emails with DKIM cryptographic headers directly in raw engine
  private signDKIM(rawEmail: string, domain: string, selector: string, privateKey: string): string {
    const headersToSign = "from:to:subject:date:message-id";
    const bodyHash = crypto.createHash("sha256").update(rawEmail.split("\r\n\r\n")[1] || "").digest("base64");
    
    const dkimHeaderValue = `v=1; a=rsa-sha256; c=relaxed/relaxed; d=${domain}; s=${selector}; h=${headersToSign}; bh=${bodyHash}; b=`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(`dkim-signature:${dkimHeaderValue}`);
    const signature = signer.sign(privateKey, "base64");

    return `DKIM-Signature: ${dkimHeaderValue}${signature}\r\n${rawEmail}`;
  }

  // Direct TCP socket delivery to recipient MX server without third-party APIs
  public async sendDirect(mxHost: string, payload: EmailPayload): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(25, mxHost, () => {
        let step = 0;
        const domain = payload.from.split("@")[1];

        socket.on("data", (data) => {
          const response = data.toString();
          
          if (response.startsWith("220") && step === 0) {
            socket.write(`EHLO ${domain}\r\n`);
            step++;
          } else if (response.startsWith("250") && step === 1) {
            socket.write(`MAIL FROM:<${payload.from}>\r\n`);
            step++;
          } else if (response.startsWith("250") && step === 2) {
            socket.write(`RCPT TO:<${payload.to}>\r\n`);
            step++;
          } else if (response.startsWith("250") && step === 3) {
            socket.write(`DATA\r\n`);
            step++;
          } else if (response.startsWith("354") && step === 4) {
            const rawBody = `From: ${payload.from}\r\nTo: ${payload.to}\r\nSubject: ${payload.subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n${payload.html}`;
            
            const finalEmail = payload.dkimPrivateKey && payload.dkimSelector
              ? this.signDKIM(rawBody, domain, payload.dkimSelector, payload.dkimPrivateKey)
              : rawBody;

            socket.write(`${finalEmail}\r\n.\r\n`);
            step++;
          } else if (response.startsWith("250") && step === 5) {
            socket.write(`QUIT\r\n`);
            resolve(true);
          }
        });

        socket.on("error", (err) => reject(err));
      });
    });
  }
}