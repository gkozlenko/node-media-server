FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm install

EXPOSE 3000

COPY . /app/
CMD [ "npm", "start" ]
