# News Pulse - RSS Ingestion & Topic Clustering App

News Pulse is a decoupled web application designed to pull real-time news articles from top global sources, automatically group them into topic clusters using natural language processing, and visualize them on an elegant, minimalist timeline.

## Architecture Overview
This project employs a modern, decoupled architecture designed for scalability and clear separation of concerns:
- **Database**: Neon Postgres (Serverless Postgres) with Prisma ORM for schema management.
- **Backend API (Node.js)**: An Express REST API that handles fetching data for the frontend and acts as an orchestrator to spawn the Python ingestion script as a child process.
- **Ingestion Worker (Python)**: A dedicated Python worker script (`ingest/main.py`) that utilizes `feedparser` and `BeautifulSoup` to scrape RSS feeds, clean the text, and perform natural language topic clustering.
- **Frontend (Next.js)**: A sleek, high-performance React frontend built with Next.js and Tailwind CSS, featuring an interactive cluster timeline and a minimalist UI.

## Topic-Grouping Approach
We implemented a lightweight **Keyword Overlap** algorithm for topic clustering:
1. **Extraction**: When a new article is pulled, the system extracts its title and summary, removes punctuation and common stop words using `NLTK`, and builds a set of significant keywords.
2. **Comparison**: The article's keywords are compared against existing clusters in the database.
3. **Clustering**: If an article shares 3 or more significant overlapping words with an existing cluster, it is added to that cluster. Otherwise, the top 5 words are used to form a brand new topic cluster.

### Limitations of this Approach
While highly efficient for small datasets, this approach has a few known limitations:
- **Lack of Semantic Understanding**: It relies purely on exact word matching. Synonyms (e.g., "President" vs "Commander in Chief") or differently phrased topics will not cluster together.
- **Scalability constraints**: As the number of clusters grows, the $O(N)$ comparison operation of matching an article against all existing clusters becomes slower.
- **Equal Weighting**: All non-stop words are treated equally. A production system would benefit from Term Frequency-Inverse Document Frequency (TF-IDF) or vector embeddings (e.g., OpenAI embeddings) to weigh the true "importance" of a word and match semantic meaning.

## News Sources Used
Currently, the application pulls top world news stories from the following reliable RSS feeds:
- [BBC News](http://feeds.bbci.co.uk/news/rss.xml)
- [CNN Top Stories](http://rss.cnn.com/rss/cnn_topstories.rss)
- [The Guardian (World)](https://www.theguardian.com/world/rss)

*(Note: Reuters was originally tested, but their public RSS endpoints have been heavily locked down and were returning empty results.)*

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python 3.10+
- A Neon Serverless Postgres Database URL

### 1. Database Setup
Create an `.env` file inside the `/backend` directory:
```env
DATABASE_URL="postgresql://user:password@neon.tech/dbname"
```
Then, push the database schema using Prisma:
```bash
cd backend
npx prisma db push
npx prisma generate
```

### 2. Backend & Python Setup
The backend utilizes a Python virtual environment to run the ingestion script. 

**Install Python Dependencies**:
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
pip install -r ingest/requirements.txt

# Linux/Mac
source .venv/bin/activate
pip install -r ingest/requirements.txt
```

**Start the Node.js API Server**:
```bash
# In the backend directory
node index.js
```
*The server will run on port 3001 and automatically use the `.venv` executable.*

### 3. Frontend Setup
Open a new terminal window to start the Next.js frontend:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser. Click the **Sync** button in the top right to trigger the Python worker and begin clustering news articles in real-time!
