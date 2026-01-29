FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Install curl for healthcheck
RUN apk --no-cache add curl

# Expose port (for API)
EXPOSE 3000

CMD [ "npm", "start" ]
