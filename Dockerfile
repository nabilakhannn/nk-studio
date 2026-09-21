FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.mjs ./
COPY public ./public

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV NK_DATA_DIR=/data

VOLUME ["/data"]
EXPOSE 4180

CMD ["node", "server.mjs"]
