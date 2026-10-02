import { NextResponse } from "next/server";

export async function GET() {
  const templates = [
    {
      id: "tmpl_solar_telemetry",
      title: "Clean Energy & Solar Telemetry Ingestor",
      category: "IoT & Telemetry",
      description: "Parses solar inverter telemetry streams, filters under-voltage spikes, and routes metrics to Neon PostgreSQL.",
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

  destination "neon_db" {
    target = "telemetry_records"
  }
}`,
    },
    {
      id: "tmpl_stripe_webhook",
      title: "Stripe Payment Webhook Relay",
      category: "Financial / E-Commerce",
      description: "Validates incoming Stripe webhooks, drops failed transactions under $10, and formats order records.",
      dsl: `pipeline "StripePaymentRelay" {
  version = "1.0"

  source "stripe_webhook" {
    type = "http_endpoint"
    path = "/v1/ingest/stripe"
  }

  transform "FilterAndNormalize" {
    filter = "payload.status == 'succeeded' && payload.amount >= 1000"
    map = {
      charge_id = "payload.id"
      amount_usd = "payload.amount / 100"
      customer_email = "payload.billing_details.email"
    }
  }

  destination "neon_db" {
    target = "stripe_transactions"
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

  destination "neon_db" {
    target = "security_audit_logs"
  }
}`,
    },
  ];

  return NextResponse.json({ templates });
}