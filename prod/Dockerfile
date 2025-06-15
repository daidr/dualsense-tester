# build stage
FROM node:current-alpine3.22 AS build

RUN apk add git=2.49.0-r0 --no-cache && npm install -g bun@1.2.16

WORKDIR /app

# These doesn't work. I need help for making dockerfile build time faster.
# COPY ../package.json ./
# COPY ../bun.lock ./
# COPY ../packages/ ./

COPY ../. .
RUN bun i && bun run --bun build-only

# production stage
FROM nginx:alpine3.21 AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
