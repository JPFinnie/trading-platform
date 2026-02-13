# Single-stage build — simpler, ensures all deps available
FROM node:20-slim

WORKDIR /app

# Install all dependencies (including dev for build tools)
COPY package.json package-lock.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runtime config
ENV PORT=5000
EXPOSE 5000

# Start: run migration (tolerant of failure), then start server
CMD ["sh", "-c", "NODE_ENV=production npx drizzle-kit push; NODE_ENV=production node dist/index.cjs"]
