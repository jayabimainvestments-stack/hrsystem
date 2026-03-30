FROM node:18-slim

# Install build essentials for native modules (bcrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Hugging Face Spaces uses port 7860 by default
ENV PORT=7860
EXPOSE 7860

CMD ["node", "server.js"]
