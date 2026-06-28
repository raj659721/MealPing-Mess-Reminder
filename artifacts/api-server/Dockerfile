FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --include=dev --ignore-scripts --legacy-peer-deps

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:24-slim

WORKDIR /app

# Copy built output
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Port is set by Render via PORT env var
EXPOSE 8080

CMD ["npm", "start"]
