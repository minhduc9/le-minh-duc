FROM node:22-alpine AS builder
WORKDIR /app

# install build dependencies
COPY package*.json ./
RUN npm install

# copy source files and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app

ENV NODE_ENV=production

# install only production deps
COPY package*.json ./
RUN npm install --omit=dev

# copy compiled output
COPY --from=builder /app/dist ./dist

# copy environment defaults (not recommended for secrets, but mirrors existing .env)
COPY .env .env

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/app.js"]
