# Dev stage only — production builds go through CI/CD (Vercel or cloud).
FROM node:24-alpine3.21 AS dev

WORKDIR /app

COPY package*.json ./

RUN npm ci

EXPOSE 3000

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["npm", "run", "dev"]
