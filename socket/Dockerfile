FROM node:18-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends libc6

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install


COPY . .

EXPOSE 3000

CMD ["node", "index.js"]