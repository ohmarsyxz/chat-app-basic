FROM node:18-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    libc-dev \
    bash

WORKDIR /app

COPY package*.json ./

RUN npm install --build-from-source

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
