FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production || npm install --production
COPY . ./
EXPOSE 4000
CMD ["node", "index.js"]

