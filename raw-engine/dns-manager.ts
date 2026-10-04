import fs from "node:fs/promises";
import path from "node:path";

export interface DNSRecord {
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX";
  name: string;
  value: string;
  ttl?: number;
}

export class RawDNSManager {
  private zoneFilesDir: string;

  constructor(zoneFilesDir: string = "/var/lib/bind/zones") {
    this.zoneFilesDir = zoneFilesDir;
  }

  // Generates authoritative DNS Zone files directly on the host server
  public async createZoneFile(domain: string, targetIp: string, records: DNSRecord[]): Promise<void> {
    const recordsText = records
      .map((r) => `${r.name.padEnd(15)} ${r.ttl || 3600} IN ${r.type.padEnd(6)} ${r.value}`)
      .join("\n");

    const zoneContent = `
$TTL 3600
@   IN  SOA ns1.${domain}. admin.${domain}. (
        ${Date.now()} ; Serial
        7200        ; Refresh
        3600        ; Retry
        1209600     ; Expire
        3600 )      ; Minimum TTL

@   IN  NS  ns1.${domain}.
@   IN  NS  ns2.${domain}.
@   IN  A   ${targetIp}
${recordsText}
    `;

    const filePath = path.join(this.zoneFilesDir, `db.${domain}`);
    await fs.writeFile(filePath, zoneContent.trim(), "utf-8");
    console.log(`[Raw Pipeline] Created native DNS zone file at: ${filePath}`);
  }
}