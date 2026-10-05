FROM node:20-alpine AS builder

WORKDIR /app
RUN apk add --no-cache ffmpeg espeak-ng python3 make g++

COPY package*.json ./
COPY platform/package*.json ./platform/
RUN npm install --foreground-scripts

COPY . .
WORKDIR /app/platform
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache ffmpeg espeak-ng bind-tools

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/platform/.next ./platform/.next
COPY --from=builder /app/platform/package.json ./platform/package.json
COPY --from=builder /app/platform/prisma ./platform/prisma
COPY --from=builder /app/raw-engine ./raw-engine

EXPOSE 3000

CMD ["node", "node_modules/next/dist/bin/next", "start", "platform"]
