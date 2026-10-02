import { NextResponse } from "next/server";
import { databaseConfigured } from "@/lib/db";
import { authConfigured } from "@/lib/auth";
import { smtpConfigured } from "@/lib/email";
import { availableProviders } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    modules: {
      appBuilder: availableProviders(),
      accountsAndDatabase: databaseConfigured() && authConfigured(),
      email: smtpConfigured(),
      voice: Boolean(process.env.ELEVENLABS_API_KEY),
      search: databaseConfigured() && authConfigured(),
      domainLookup: true,
      ide: true,
    },
  });
}
