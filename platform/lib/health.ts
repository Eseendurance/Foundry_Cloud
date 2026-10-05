import { access } from "node:fs/promises";
import { constants } from "node:fs";
import net from "node:net";
import path from "node:path";
import { smtpConfigured } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export type ServiceHealth = {
  status: "online" | "offline";
  detail: string;
};

export type PlatformHealth = {
  status: "healthy" | "degraded" | "offline";
  checkedAt: string;
  services: {
    database: ServiceHealth;
    engine: ServiceHealth;
    smtp: ServiceHealth;
    storage: ServiceHealth;
  };
};

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

    socket.setTimeout(2_500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function checkDatabase(): Promise<ServiceHealth> {
  if (!process.env.DATABASE_URL) {
    return { status: "offline", detail: "DATABASE_URL is not configured." };
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "online", detail: "PostgreSQL connection succeeded." };
  } catch {
    return { status: "offline", detail: "PostgreSQL connection failed." };
  }
}

async function checkTcpService(
  host: string | undefined,
  portText: string | undefined,
  label: string
): Promise<ServiceHealth> {
  if (!host || !portText) {
    return { status: "offline", detail: `${label} host and port are not configured.` };
  }
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return { status: "offline", detail: `${label} port is invalid.` };
  }
  const online = await tcpReachable(host, port);
  return online
    ? { status: "online", detail: `${label} accepted a TCP connection.` }
    : { status: "offline", detail: `${label} did not accept a TCP connection.` };
}

async function checkStorage(): Promise<ServiceHealth> {
  const storagePath =
    process.env.FOUNDRY_STORAGE_DIR || path.join(process.cwd(), "raw-engine", "storage", "data");
  try {
    await access(storagePath, constants.R_OK | constants.W_OK);
    return { status: "online", detail: "Configured storage directory is readable and writable." };
  } catch {
    return {
      status: "offline",
      detail: "Storage directory is missing or not readable and writable.",
    };
  }
}

async function checkSmtp(): Promise<ServiceHealth> {
  if (!smtpConfigured()) {
    return {
      status: "offline",
      detail: "SMTP sender, HELO hostname, public IP, port, or credentials are not configured.",
    };
  }
  const socket = await checkTcpService(
    process.env.SMTP_HOST,
    process.env.SMTP_PORT || "587",
    "SMTP server"
  );
  return socket.status === "online"
    ? {
        status: "online",
        detail: "SMTP socket and warm-up settings are reachable. SPF, DKIM, DMARC, PTR, and blocklist status are not verified here.",
      }
    : socket;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  const [database, engine, smtp, storage] = await Promise.all([
    checkDatabase(),
    checkTcpService(process.env.RAW_ENGINE_HOST, process.env.RAW_ENGINE_PORT, "Raw engine"),
    checkSmtp(),
    checkStorage(),
  ]);
  const services = { database, engine, smtp, storage };
  const allOnline = Object.values(services).every((service) => service.status === "online");

  return {
    status: database.status === "offline" ? "offline" : allOnline ? "healthy" : "degraded",
    checkedAt: new Date().toISOString(),
    services,
  };
}
