FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package*.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY . .
RUN npm run build

# Production stage - use bun to run
FROM oven/bun:1 AS runner

WORKDIR /app

# Copy built artifacts and deps
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 5000

CMD ["bun", "build/server/index.js"]
