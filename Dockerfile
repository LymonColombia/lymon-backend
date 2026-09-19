# Stage 1: build
FROM node:20-alpine AS builder
WORKDIR /app
# pnpm installation
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./src
RUN pnpm run build
RUN pnpm prune --prod

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY --chown=root:root --chmod=644 package.json ./
COPY --chown=root:root --chmod=755 --from=builder /app/node_modules ./node_modules
COPY --chown=root:root --chmod=755 --from=builder /app/dist ./dist

EXPOSE 3000
USER node
CMD ["node", "dist/main"]