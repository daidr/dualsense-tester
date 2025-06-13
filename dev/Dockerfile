FROM oven/bun:alpine

RUN apk add git=2.45.3-r0 --no-cache

WORKDIR /app

RUN git config --global --add safe.directory /app

CMD [ "bun", "run", "--bun", "dev" ]

