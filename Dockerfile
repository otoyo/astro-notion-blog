FROM node:18.16.0-bookworm

ENV NODE_ENV=production
EXPOSE 4321

WORKDIR /home/app

COPY . .

RUN npm install