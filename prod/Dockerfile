# build environment
FROM oven/bun:1 AS base
WORKDIR /app
RUN apt-get update  && \
    apt-get install --no-install-recommends -y git=1:2.39.5-0+deb12u2 && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
COPY packages/fancy-controller/package.json /temp/dev/packages/fancy-controller/
WORKDIR /temp/dev
RUN bun install --frozen-lockfile

# build stage
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run --bun build-only

# production stage
FROM nginx:alpine3.21-slim AS production
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
