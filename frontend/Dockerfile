FROM node:20-alpine
WORKDIR /workspace
COPY . .
RUN yarn install
EXPOSE 5173
CMD ["yarn", "dev", "--host"]