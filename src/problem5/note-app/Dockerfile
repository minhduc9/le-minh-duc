FROM node:22-alpine AS builder
WORKDIR /app

# install dependencies
COPY package*.json ./
RUN npm ci

# copy rest of the sources and build the Angular app
COPY . .
RUN npm run build

FROM nginx:1.29.3-alpine AS runner
WORKDIR /usr/share/nginx/html

# copy nginx configuration and build output
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/note-app/browser ./

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
