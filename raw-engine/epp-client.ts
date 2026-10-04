import tls from "node:tls";

export class NativeEPPClient {
  private socket: tls.TLSSocket | null = null;

  constructor(
    private host: string,
    private port: number = 700,
    private cert: string,
    private key: string
  ) {}

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect(
        {
          host: this.host,
          port: this.port,
          cert: this.cert,
          key: this.key,
          rejectUnauthorized: true,
        },
        () => {
          console.log("[Raw Engine EPP] Connected directly to TLD Registry TCP Socket");
          resolve();
        }
      );

      this.socket.on("error", (err) => reject(err));
    });
  }

  // XML Frame Generator for Native Domain Availability Check
  public checkDomain(domainName: string): void {
    const xmlFrame = `
      <?xml version="1.0" encoding="UTF-8" standalone="no"?>
      <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
        <command>
          <check>
            <domain:check xmlns:domain="urn:ietf:params:xml:ns:domain-1.0">
              <domain:name>${domainName}</domain:name>
            </domain:check>
          </check>
          <clTRID>FOUNDRY-${Date.now()}</clTRID>
        </command>
      </epp>
    `;

    if (this.socket) {
      // Send framing header (4 bytes length prefix) followed by EPP XML payload
      const payloadLength = Buffer.byteLength(xmlFrame) + 4;
      const buffer = Buffer.alloc(payloadLength);
      buffer.writeUInt32BE(payloadLength, 0);
      buffer.write(xmlFrame, 4);

      this.socket.write(buffer);
    }
  }
}