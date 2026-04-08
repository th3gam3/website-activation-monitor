FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY api/ ./api/
COPY public/ ./public/
COPY test-server.js ./
EXPOSE 3000
CMD ["node", "test-server.js"]
