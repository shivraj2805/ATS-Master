
# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# ============================================================
# Stage 2: Production image
# ============================================================
FROM node:20-bookworm-slim AS production

# Create non-root user for security
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --create-home nodeuser

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=nodeuser:nodejs . .

# Create uploads directory with correct permissions
RUN mkdir -p uploads && chown -R nodeuser:nodejs uploads

# Switch to non-root user
USER nodeuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
