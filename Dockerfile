FROM node:20-slim

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY scraper/requirements.txt ./scraper/
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip3 install --no-cache-dir -r scraper/requirements.txt

RUN python -m nltk.downloader stopwords


COPY backend/ ./backend/
COPY scraper/ ./scraper/

RUN cd backend && npx prisma generate

EXPOSE 3001


WORKDIR /app/backend
CMD ["node", "index.js"]
