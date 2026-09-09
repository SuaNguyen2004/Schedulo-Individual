# ==========================================
# Stage 1: Build Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/Front_end

# Install frontend dependencies
COPY Front_end/package*.json ./
RUN npm ci || npm install

# Copy frontend source and build
COPY Front_end/ ./
RUN npm run build

# ==========================================
# Stage 2: Prepare Backend & Production Image
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Install backend dependencies
COPY Back_end/package*.json ./Back_end/
RUN cd Back_end && npm ci --only=production || npm install --production

# Copy backend source code
COPY Back_end/ ./Back_end/

# Copy built frontend dist files
COPY --from=frontend-builder /app/Front_end/dist ./Front_end/dist

# Expose backend port
EXPOSE 4000

# Start backend server
CMD ["node", "Back_end/index.js"]

