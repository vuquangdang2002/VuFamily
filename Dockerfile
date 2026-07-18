FROM node:22-slim

WORKDIR /app

# Copy root configuration and install backend tools
COPY package.json tsconfig.json wrangler.toml ./
RUN npm install

# Copy frontend config and install dependencies
COPY frontend/package.json ./frontend/
RUN cd frontend && npm install

# Copy all source files
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY database/ ./database/

# Build frontend static files
RUN cd frontend && npm run build

# Expose port 8787 for the unified Worker + Assets server
EXPOSE 8787

# Run wrangler dev emulating Cloudflare Workers locally
CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0", "--port", "8787"]
