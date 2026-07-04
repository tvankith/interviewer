# Stage 1: Base — install dependencies and generate Prisma client
FROM node:24-alpine3.21 AS base

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci
RUN npx prisma generate

# Stage 2: Dev — hot-reload with tsx watch (source mounted as volume)
FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3002

CMD ["sh", "-c", "npm install && npx prisma generate && npx prisma db push && npx tsx watch src/main.ts"]

# Stage 3: Builder — compile TypeScript
FROM base AS builder

COPY tsconfig.json ./
COPY tsup.config.ts ./
COPY src ./src

RUN npm run build

# Stage 4: Prod — minimal runtime image
FROM node:24-alpine3.21 AS prod

WORKDIR /app

RUN apk add --no-cache openssl curl

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

RUN npm ci --omit=dev
RUN npx prisma generate

RUN addgroup -g 1001 nodejs && \
    adduser -D -u 1001 -G nodejs nodejs

USER nodejs

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "dist/main.js"]
