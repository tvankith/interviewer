# Stage 1: Base — install dependencies
FROM node:24-alpine3.21 AS base

WORKDIR /app

COPY package*.json ./

RUN npm ci

# Stage 2: Dev — hot-reload (source mounted as volume)
FROM base AS dev

EXPOSE 3000

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "dev"]

# Stage 3: Builder — compile the Next.js standalone build
FROM base AS builder

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# they must be supplied as build args rather than runtime env vars.
ARG NEXT_PUBLIC_API_SERVER_URL
ARG NEXT_PUBLIC_AI_SERVER_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_SERVER_URL=${NEXT_PUBLIC_API_SERVER_URL}
ENV NEXT_PUBLIC_AI_SERVER_URL=${NEXT_PUBLIC_AI_SERVER_URL}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .

RUN npm run build

# Stage 4: Prod — minimal runtime image (Next.js standalone output)
FROM node:24-alpine3.21 AS prod

WORKDIR /app

RUN addgroup -g 1001 nodejs && \
    adduser -D -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

CMD ["node", "server.js"]
