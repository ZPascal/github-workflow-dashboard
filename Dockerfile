FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# GWD_ENCRYPTION_KEY: required, 32-byte hex string (64 hex chars)
#   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# GWD_DB_PATH: path to SQLite database file (default: ./data/gwd.db)
#   Mount a persistent volume at the directory containing this file.

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

VOLUME /data
EXPOSE 3000
CMD ["npm", "start"]
