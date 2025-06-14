# build stage
FROM node:current-alpine3.22 as build

RUN apk add git --no-cache && npm install -g bun@1.2.16

WORKDIR /app

# These doesn't work. I need help for making dockerfile build time faster.
# COPY ../package.json ./
# COPY ../bun.lock ./
# COPY ../packages/ ./

COPY ../. .
# RUN bun install && bun run --bun build |this is not working sorry|
RUN bun i && bun run build

# production stage
FROM nginx:alpine3.21 as production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
