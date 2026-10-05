import { NextResponse } from "next/server";

export async function GET() {
  const templates = [
    {
      id: "tmpl_solar_telemetry",
      title: "Clean Energy & Solar Telemetry Ingestor",
      category: "IoT & Telemetry",
      description: "Parses sample telemetry, filters under-voltage spikes, and routes metrics to the configured PostgreSQL database.",
      dsl: `pipeline "SolarTelemetryPipeline" {
  version = "1.0"

  source "solar_inverter_stream" {
    type = "telemetry_http"
    path = "/v1/ingest/solar"
  }

  transform "VoltageFilter" {
    filter = "payload.voltage >= 12.0"
    map = {
      device_id = "payload.inverter_id"
      voltage = "payload.voltage"
      current = "payload.current"
      power_kw = "payload.voltage * payload.current / 1000"
    }
  }

  destination "postgres_db" {
    target = "telemetry_records"
  }
}`,
    },
    {
      id: "tmpl_webhook_events",
      title: "Webhook Event Logger",
      category: "Webhooks",
      description: "Filters incoming status and amount fields, then maps selected values into a database record.",
      dsl: `pipeline "WebhookEventLogger" {
  version = "1.0"

  source "webhook_events" {
    type = "http_endpoint"
    path = "/v1/ingest/events"
  }

  transform "FilterAndMap" {
    filter = "payload.status == 'succeeded' && payload.amount >= 1000"
    map = {
      event_id = "payload.id"
      amount = "payload.amount"
      event_type = "payload.type"
    }
  }

  destination "postgres_db" {
    target = "webhook_events"
  }
}`,
    },
    {
      id: "tmpl_user_activity",
      title: "User Audit & Security Event Logger",
      category: "Analytics & Logs",
      description: "Ingests real-time user behavior events and routes critical security alerts.",
      dsl: `pipeline "UserAuditPipeline" {
  version = "1.0"

  source "app_audit_stream" {
    type = "json_stream"
    path = "/v1/ingest/logs"
  }

  transform "SecurityFilter" {
    filter = "payload.severity == 'WARN' || payload.severity == 'ERROR'"
    map = {
      event = "payload.action"
      user_id = "payload.user_id"
      ip_address = "payload.ip"
      timestamp = "payload.time"
    }
  }

  destination "postgres_db" {
    target = "security_audit_logs"
  }
}`,
    },
  ];

  return NextResponse.json({ templates });
}