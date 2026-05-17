# ============================================================
# Dockerfile — VuFamily Hub Server (Socket.io Real-time)
# Deploy: Railway / Render / Fly.io
# Chỉ chạy server/ (backend Node.js + Socket.io)
# Client build đã được host trên Vercel riêng
# ============================================================

FROM node:20-alpine

# Tạo thư mục làm việc
WORKDIR /app

# Copy package files trước để tận dụng Docker layer cache
COPY package.json package-lock.json ./

# Cài dependencies của server (không cần devDependencies)
RUN npm ci --omit=dev

# Copy source code server
COPY server/ ./server/
COPY database/ ./database/

# Không cần build client — Vercel đã handle
# Biến PORT được Railway tự inject
ENV NODE_ENV=production

EXPOSE 3000

# Khởi động server
CMD ["node", "server/index.js"]
