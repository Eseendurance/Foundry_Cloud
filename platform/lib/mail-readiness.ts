import { promises as dns } from "node:dns";
import net from "node:net";
import { query } from "@/lib/db";
import { isValidDomain } from "@/lib/dns";

export type ReadinessStatus = "pass" | "fail" | "unknown";
export type ReadinessCheck = {
  status: ReadinessStatus;
  detail: string;
  fix: string;
};

export type MailReadiness = {
  domain: string;
  checkedAt: string;
  checks: {
    outboundPort25: ReadinessCheck;
    reverseDns: ReadinessCheck;
    spf: ReadinessCheck;
    dkim: ReadinessCheck;
    dmarc: ReadinessCheck;
    blocklists: ReadinessCheck & { lists: Array<{ name: string; listed: boolean | null }> };
    warmup: ReadinessCheck & { dailyLimit: number; sentLast24Hours: number; remaining: number };
  };
};

function dnsCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error &&
    typeof error.code === "string"
    ? error.code
    : undefined;
}

async function txt(host: string): Promise<string[]> {
  try {
    return (await dns.resolveTxt(host)).map((chunks) => chunks.join(""));
  } catch (error) {
    const code = dnsCode(error);
    if (code === "ENODATA" || code === "ENOTFOUND") return [];
    throw error;
  }
}

function tcpReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (reachable: boolean) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(5_000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function outboundPort25(): Promise<ReadinessCheck> {
  try {
    const mailExchangers = (await dns.resolveMx("gmail.com"))
      .sort((left, right) => left.priority - right.priority);
    const target = mailExchangers[0]?.exchange.replace(/\.$/, "");
    if (!target) throw new Error("No MX record was returned for the outbound test domain.");
    const connected = await tcpReachable(target, 25);
    return connected
      ? {
          status: "pass",
          detail: `TCP port 25 accepted a connection to ${target}.`,
          fix: "No action required for basic port reachability.",
        }
      : {
          status: "fail",
          detail: `Could not connect to ${target} on TCP port 25 from this runtime.`,
          fix: "Ask the VPS provider to unblock outbound TCP port 25 and check host firewall egress rules.",
        };
  } catch (error) {
    return {
      status: "unknown",
      detail: error instanceof Error ? error.message : "Could not resolve a mail exchanger for the port test.",
      fix: "Check DNS resolver access, then run the readiness check again.",
    };
  }
}

async function reverseDnsCheck(): Promise<ReadinessCheck> {
  const ip = process.env.SMTP_PUBLIC_IP || "";
  const helo = (process.env.SMTP_HELO_HOST || "").replace(/\.$/, "").toLowerCase();
  if (!net.isIP(ip) || !helo) {
    return {
      status: "fail",
      detail: "SMTP_PUBLIC_IP or SMTP_HELO_HOST is not configured.",
      fix: "Set the sending server's public IP and its fully qualified HELO hostname.",
    };
  }
  try {
    const ptrNames = (await dns.reverse(ip)).map((name) => name.replace(/\.$/, "").toLowerCase());
    if (!ptrNames.includes(helo)) {
      return {
        status: "fail",
        detail: `PTR records are ${ptrNames.join(", ") || "missing"}; none matches ${helo}.`,
        fix: "Set the IP's reverse DNS/PTR record to SMTP_HELO_HOST with the VPS provider.",
      };
    }
    const addresses = net.isIP(helo) === 4
      ? await dns.resolve4(helo)
      : net.isIP(helo) === 6
        ? await dns.resolve6(helo)
        : [
            ...(await dns.resolve4(helo).catch(() => [])),
            ...(await dns.resolve6(helo).catch(() => [])),
          ];
    if (!addresses.includes(ip)) {
      return {
        status: "fail",
        detail: `${helo} does not resolve back to ${ip}.`,
        fix: "Add or correct the A/AAAA record so the HELO hostname resolves to the sending IP.",
      };
    }
    return {
      status: "pass",
      detail: `PTR for ${ip} matches ${helo}, and the hostname resolves back to the IP.`,
      fix: "No action required for forward-confirmed reverse DNS.",
    };
  } catch (error) {
    return {
      status: "fail",
      detail: error instanceof Error ? error.message : "PTR or forward DNS lookup failed.",
      fix: "Set matching PTR and forward A/AAAA records, then retry.",
    };
  }
}

async function blocklistCheck(ip: string): Promise<MailReadiness["checks"]["blocklists"]> {
  if (net.isIP(ip) !== 4) {
    return {
      status: "unknown",
      detail: "DNS-based blocklist checks currently support IPv4 only.",
      fix: "Use an IPv4 sending address or check IPv6 reputation with each list operator.",
      lists: [],
    };
  }
  const reversed = ip.split(".").reverse().join(".");
  const lists = ["zen.spamhaus.org", "bl.spamcop.net", "b.barracudacentral.org"];
  const checks = await Promise.all(
    lists.map(async (name) => {
      try {
        const answers = await dns.resolve4(`${reversed}.${name}`);
        const providerError = answers.some((answer) => answer.startsWith("127.255.255."));
        return { name, listed: providerError ? null : answers.some((answer) => answer.startsWith("127.")) };
      } catch (error) {
        const code = dnsCode(error);
        return {
          name,
          listed: code === "ENODATA" || code === "ENOTFOUND" ? false : null,
        };
      }
    })
  );
  const listed = checks.filter((check) => check.listed === true);
  const unknown = checks.filter((check) => check.listed === null);
  return {
    status: listed.length ? "fail" : unknown.length ? "unknown" : "pass",
    detail: listed.length
      ? `The sending IP is listed by ${listed.map((check) => check.name).join(", ")}.`
      : unknown.length
        ? `Could not get a reliable response from ${unknown.map((check) => check.name).join(", ")}.`
        : "The sending IP was not listed by the checked DNS blocklists.",
    fix: listed.length
      ? "Follow the listed provider's delisting process and investigate the sending source before resuming."
      : unknown.length
        ? "Check DNS resolver access or query the list operators directly; unknown is not treated as a clean result."
        : "No action required for the checked lists.",
    lists: checks,
  };
}

export async function checkMailReadiness(
  domain: string,
  selector: string | null
): Promise<MailReadiness> {
  const normalizedDomain = domain.trim().toLowerCase();
  if (!isValidDomain(normalizedDomain)) throw new Error("A valid sending domain is required.");

  const [rootRecords, dmarcRecords, outbound, reverseDns] = await Promise.all([
    txt(normalizedDomain),
    txt(`_dmarc.${normalizedDomain}`),
    outboundPort25(),
    reverseDnsCheck(),
  ]);
  const spfRecords = rootRecords.filter((record) => /^v=spf1(?:\s|$)/i.test(record));
  const spfRecord = spfRecords[0];
  const dmarcRecordsFound = dmarcRecords.filter((record) => /^v=DMARC1(?:\s|$)/i.test(record));
  const dmarcRecord = dmarcRecordsFound[0];
  const dkimSelector = selector?.trim();
  let dkimRecord: string | undefined;
  if (dkimSelector && /^[A-Za-z0-9_-]{1,63}$/.test(dkimSelector)) {
    const records = await txt(`${dkimSelector}._domainkey.${normalizedDomain}`);
    dkimRecord = records.find((record) => /(?:^|;)\s*v=DKIM1(?:;|$)/i.test(record) || /(?:^|;)\s*p=[A-Za-z0-9+/=]+/.test(record));
  }

  const publicIp = process.env.SMTP_PUBLIC_IP || "";
  const blocklists = await blocklistCheck(publicIp);
  const dailyLimit = Number(process.env.SMTP_WARMUP_DAILY_LIMIT || 50);
  const validLimit = Number.isInteger(dailyLimit) && dailyLimit > 0 && dailyLimit <= 100_000;
  const sender = process.env.EMAIL_FROM || "";
  const senderMailbox = sender.match(/<([^<>]+)>/)?.[1] || sender;
  const senderDomain = senderMailbox.match(/^[^\s@]+@([^\s@]+)$/)?.[1]?.toLowerCase();
  const senderDomainMatches = senderDomain === normalizedDomain;
  const warmupDomain = senderDomain || normalizedDomain;
  const buckets =
    net.isIP(publicIp) && validLimit
      ? await query<{ bucket_key: string; request_count: number; window_started_at: Date }>(
          `SELECT bucket_key, request_count, window_started_at
           FROM rate_limit_buckets WHERE bucket_key = ANY($1::text[])`,
          [`smtp-domain:${warmupDomain}`, `smtp-ip:${publicIp}`]
        )
      : [];
  const activeBuckets = buckets.filter(
    (bucket) => bucket.window_started_at.getTime() > Date.now() - 24 * 60 * 60_000
  );
  const domainCount = activeBuckets.find((bucket) => bucket.bucket_key === `smtp-domain:${warmupDomain}`)?.request_count || 0;
  const ipCount = activeBuckets.find((bucket) => bucket.bucket_key === `smtp-ip:${publicIp}`)?.request_count || 0;
  const sentLast24Hours = Math.max(domainCount, ipCount);
  const warmupReady = validLimit && senderDomainMatches && sentLast24Hours < dailyLimit;

  const selectorValid = Boolean(dkimSelector && /^[A-Za-z0-9_-]{1,63}$/.test(dkimSelector));
  const checks = {
    outboundPort25: outbound,
    reverseDns,
    spf: {
      status: spfRecords.length === 1 ? "pass" as const : "fail" as const,
      detail: spfRecords.length > 1
        ? "Multiple SPF records were found; receivers require a single SPF policy."
        : spfRecord || "No SPF record was found at the sending domain.",
      fix: spfRecords.length === 1 ? "No action required." : "Publish exactly one v=spf1 TXT record that authorizes only your legitimate sending infrastructure.",
    },
    dkim: {
      status: dkimRecord ? "pass" as const : "fail" as const,
      detail: dkimRecord
        ? `A DKIM TXT record exists at ${dkimSelector}._domainkey.${normalizedDomain}.`
        : selectorValid
          ? `No valid DKIM TXT record was found at ${dkimSelector}._domainkey.${normalizedDomain}.`
          : "DKIM selector is not configured or invalid.",
      fix: dkimRecord
        ? "No action required for DNS presence; verify signatures on delivered messages separately."
        : "Configure DKIM signing on the MTA and publish its public key at selector._domainkey.domain.",
    },
    dmarc: {
      status: dmarcRecordsFound.length === 1 ? "pass" as const : "fail" as const,
      detail: dmarcRecordsFound.length > 1
        ? "Multiple DMARC records were found."
        : dmarcRecord || "No DMARC record was found at _dmarc.",
      fix: dmarcRecordsFound.length === 1 ? "Review aggregate reports and gradually strengthen the policy." : "Publish exactly one DMARC TXT record at _dmarc.domain, initially with a monitored policy.",
    },
    blocklists,
    warmup: {
      status: !validLimit ? "fail" as const : warmupReady ? "pass" as const : "fail" as const,
      detail: !validLimit
        ? "SMTP_WARMUP_DAILY_LIMIT is invalid."
        : !senderDomainMatches
          ? `The checked domain ${normalizedDomain} does not match EMAIL_FROM domain ${senderDomain || "not configured"}.`
          : `${sentLast24Hours} of ${dailyLimit} send attempts used in the 24-hour warm-up window for ${warmupDomain}.`,
      fix: senderDomainMatches
        ? "Increase the cap gradually only after monitoring bounce and complaint rates."
        : "Check the exact domain used by EMAIL_FROM.",
      dailyLimit,
      sentLast24Hours,
      remaining: Math.max(0, dailyLimit - sentLast24Hours),
    },
  };
  return { domain: normalizedDomain, checkedAt: new Date().toISOString(), checks };
}
