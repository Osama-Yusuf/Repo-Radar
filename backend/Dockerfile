FROM node:20-alpine
WORKDIR /app
COPY . .
RUN yarn install --production
EXPOSE 3001
CMD ["node", "server.js"]
