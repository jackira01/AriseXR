# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install

COPY tsconfig.json ./
COPY src ./src

RUN bun run build

# Production stage
FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock* ./

RUN bun install --production

EXPOSE 4000

CMD ["bun", "run", "dist/index.js"]
