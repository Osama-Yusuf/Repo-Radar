FROM node:20-alpine
WORKDIR /workspace
COPY . .
RUN yarn install
EXPOSE 3001
CMD ["yarn", "start"]