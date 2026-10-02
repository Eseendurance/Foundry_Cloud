# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies required for native builds and multimedia
RUN apk add --no-libc-dev ffmpeg espeak-ng python3 make g++

# Copy package descriptors
COPY package*.json ./
COPY platform/package*.json ./platform/

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Generate Prisma client and build Next.js application
WORKDIR /app/platform
RUN npx prisma generate
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install runtime tools (FFmpeg & eSpeak for avatar audio-video composition)
RUN apk add --no-cache ffmpeg espeak-ng bind-tools

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/platform/node_modules ./platform/node_modules
COPY --from=builder /app/platform/.next ./platform/.next
COPY --from=builder /app/platform/public ./platform/public
COPY --from=builder /app/platform/package.json ./platform/package.json
COPY --from=builder /app/raw-engine ./raw-engine

EXPOSE 3000 25 700 80 443

CMD ["node", "platform/node_modules/next/dist/bin/next", "start", "platform"]