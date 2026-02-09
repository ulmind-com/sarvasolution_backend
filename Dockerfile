FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package*.json ./

# Use npm install instead of npm ci
RUN npm install --production --legacy-peer-deps && \
    npm cache clean --force

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
