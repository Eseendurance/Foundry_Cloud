import { NextResponse } from "next/server";

// Mock persistent domains storage (connects to PostgreSQL via Prisma in production)
let domainsList = [
  {
    id: "dom_1",
    domain: "briefgroup.net",
    targetPipeline: "SolarTelemetryPipeline",
    status: "active",
    sslStatus: "issued",
    dnsRecords: [
      { type: "A", name: "@", value: "76.76.21.21", ttl: 300 },
      { type: "CNAME", name: "www", value: "cname.briefgroup.net", ttl: 300 },
      { type: "TXT", name: "@", value: "v=spf1 include:_spf.briefgroup.net ~all", ttl: 3600 },
    ],
  },
  {
    id: "dom_2",
    domain: "omnicore.ai",
    targetPipeline: "StripePaymentRelay",
    status: "active",
    sslStatus: "issued",
    dnsRecords: [
      { type: "A", name: "@", value: "76.76.21.21", ttl: 300 },
      { type: "CNAME", name: "api", value: "gateway.briefgroup.net", ttl: 300 },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ domains: domainsList });
}

export async function POST(req: Request) {
  try {
    const { domain, targetPipeline } = await req.json();

    if (!domain) {
      return NextResponse.json({ error: "Domain name is required" }, { status: 400 });
    }

    const newDomain = {
      id: `dom_${Math.random().toString(36).substring(2, 8)}`,
      domain,
      targetPipeline: targetPipeline || "DefaultIngestPipeline",
      status: "active",
      sslStatus: "issued",
      dnsRecords: [
        { type: "A", name: "@", value: "76.76.21.21", ttl: 300 },
        { type: "CNAME", name: "www", value: `cname.${domain}`, ttl: 300 },
      ],
    };

    domainsList.push(newDomain);

    return NextResponse.json({ success: true, domain: newDomain });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to add domain" }, { status: 500 });
  }
}