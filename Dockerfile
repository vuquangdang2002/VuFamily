FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./server/
COPY database/ ./database/

# Tạo client/dist rỗng — tránh Express crash khi serve static
RUN mkdir -p ./client/dist && echo '<html><body>VuFamily Hub</body></html>' > ./client/dist/index.html

ENV NODE_ENV=production

# Railway tự inject PORT vào process.env.PORT
EXPOSE 3000

CMD ["node", "server/index.js"]
