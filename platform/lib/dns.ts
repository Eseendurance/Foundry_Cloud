import { promises as dns } from "dns";

const DOMAIN_RE = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

export function isValidDomain(domain: string): boolean {
  return DOMAIN_RE.test(domain);
}

async function txtRecords(hostname: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(hostname);
    return records.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

export type DomainAuth = {
  domain: string;
  spf: { found: boolean; record: string | null };
  dmarc: { found: boolean; record: string | null; policy: string | null };
};

/** Real DNS lookups for SPF and DMARC — no API key, no third party. */
export async function checkDomainAuth(domain: string): Promise<DomainAuth> {
  const [rootTxt, dmarcTxt] = await Promise.all([
    txtRecords(domain),
    txtRecords(`_dmarc.${domain}`),
  ]);

  const spfRecord = rootTxt.find((r) => r.startsWith("v=spf1")) || null;
  const dmarcRecord = dmarcTxt.find((r) => r.startsWith("v=DMARC1")) || null;

  let policy: string | null = null;
  if (dmarcRecord) {
    const match = dmarcRecord.match(/p=([a-zA-Z]+)/);
    policy = match ? match[1] : null;
  }

  return {
    domain,
    spf: { found: Boolean(spfRecord), record: spfRecord },
    dmarc: { found: Boolean(dmarcRecord), record: dmarcRecord, policy },
  };
}

export type DnsSnapshot = {
  domain: string;
  a: string[];
  mx: { priority: number; exchange: string }[];
  ns: string[];
  txt: string[];
};

/** Real, live DNS records for a domain — A, MX, NS, TXT. */
export async function lookupDns(domain: string): Promise<DnsSnapshot> {
  const [a, mx, ns, txt] = await Promise.all([
    dns.resolve4(domain).catch(() => [] as string[]),
    dns.resolveMx(domain).catch(() => [] as { priority: number; exchange: string }[]),
    dns.resolveNs(domain).catch(() => [] as string[]),
    txtRecords(domain),
  ]);

  return { domain, a, mx: mx.sort((x, y) => x.priority - y.priority), ns, txt };
}
