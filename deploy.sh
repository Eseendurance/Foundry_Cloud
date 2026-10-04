#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

required=(DATABASE_URL JWT_SECRET SITE_DOMAIN SMTP_HOST EMAIL_FROM)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    printf 'Required environment variable %s is not set.\n' "$name" >&2
    exit 1
  fi
done

db_host="${DATABASE_URL#*@}"
db_host="${db_host%%/*}"
db_host="${db_host%%:*}"
if [[ "$db_host" != *.neon.tech ]]; then
  printf 'DATABASE_URL must use a Neon PostgreSQL hostname (*.neon.tech).\n' >&2
  exit 1
fi

if (( ${#JWT_SECRET} < 32 )); then
  printf 'JWT_SECRET must contain at least 32 characters.\n' >&2
  exit 1
fi

if ! compgen -G "platform/prisma/migrations/*/migration.sql" > /dev/null; then
  printf 'No reviewed Prisma migrations exist; refusing to deploy an untracked database schema.\n' >&2
  exit 1
fi

docker compose config --quiet
docker compose pull caddy
docker compose build --pull web
docker compose run --rm --no-deps web npx prisma migrate deploy --schema platform/prisma/schema.prisma
docker compose up -d --remove-orphans --wait --wait-timeout 180

for service in web caddy; do
  container_id="$(docker compose ps -q "$service")"
  if [[ -z "$container_id" ]]; then
    printf 'Service %s did not start.\n' "$service" >&2
    docker compose logs --tail=100 "$service" >&2
    exit 1
  fi

  health="$(docker inspect --format '{{.State.Health.Status}}' "$container_id")"
  if [[ "$health" != "healthy" ]]; then
    printf 'Service %s is not healthy (status: %s).\n' "$service" "$health" >&2
    docker compose logs --tail=100 "$service" >&2
    exit 1
  fi
done

docker compose ps
printf 'Foundry-Cloud deployment is healthy.\n'
