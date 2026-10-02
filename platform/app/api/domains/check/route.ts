import { NextRequest, NextResponse } from "next/server";
import { isValidDomain } from "@/lib/dns";

export const runtime = "nodejs";

type RdapEntity = {
  roles?: string[];
  vcardArray?: [string, [string, unknown, string, string][]];
};

type RdapEvent = { eventAction: string; eventDate: string };

type RdapResponse = {
  ldhName?: string;
  status?: string[];
  entities?: RdapEntity[];
  events?: RdapEvent[];
  nameservers?: { ldhName: string }[];
};

function registrarName(entities: RdapEntity[] = []): string | null {
  const registrar = entities.find((e) => e.roles?.includes("registrar"));
  if (!registrar?.vcardArray) return null;
  const fields = registrar.vcardArray[1] || [];
  const fn = fields.find((f) => f[0] === "fn");
  return fn ? String(fn[3]) : null;
}

function eventDate(events: RdapEvent[] = [], action: string): string | null {
  return events.find((e) => e.eventAction === action)?.eventDate || null;
}

export async function GET(req: NextRequest) {
  const domain = (req.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase();

  if (!isValidDomain(domain)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid domain." },
      { status: 400 }
    );
  }

  try {
    // rdap.org is the public IANA-backed bootstrap: it looks at the TLD
    // and redirects to that registry's authoritative RDAP server. No key,
    // no signup — this is a real, live protocol lookup.
    const res = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
    });

    if (res.status === 404) {
      return NextResponse.json({
        domain,
        registered: false,
        note: "The registry has no record of this domain. That usually means it's available, but it isn't a purchase guarantee — some names are reserved, and registrars can still decline.",
      });
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Registry lookup returned ${res.status}.` },
        { status: 502 }
      );
    }

    const data: RdapResponse = await res.json();

    return NextResponse.json({
      domain,
      registered: true,
      registrar: registrarName(data.entities),
      registeredOn: eventDate(data.events, "registration"),
      expiresOn: eventDate(data.events, "expiration"),
      nameservers: (data.nameservers || []).map((ns) => ns.ldhName),
      status: data.status || [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Lookup failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
