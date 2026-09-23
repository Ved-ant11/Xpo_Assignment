import os
import feedparser
import psycopg
from psycopg.rows import dict_row
from newspaper import Article as NewsArticle
from datetime import datetime, timezone
from dateutil import parser as date_parser
from dotenv import load_dotenv
import re
import nltk
from nltk.corpus import stopwords
import string

load_dotenv()
nltk.download('stopwords', quiet=True)
nltk.download('punkt_tab', quiet=True)
nltk.download('punkt', quiet=True)

DB_URL = os.getenv("DATABASE_URL")

FEEDS = [
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"name": "CNN", "url": "http://rss.cnn.com/rss/cnn_topstories.rss"},
    {"name": "The Guardian", "url": "https://www.theguardian.com/world/rss"}
]

def get_db_connection():
    return psycopg.connect(DB_URL, row_factory=dict_row)

def extract_significant_words(text):
    if not text:
        return set()
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    words = text.split()
    stop_words = set(stopwords.words('english'))
    significant_words = {w for w in words if w not in stop_words and len(w) > 2}
    return significant_words

def fetch_feed_articles():
    articles = []
    for feed_info in FEEDS:
        parsed_feed = feedparser.parse(feed_info["url"])
        for entry in parsed_feed.entries:
            url = entry.get("link", "")
            title = entry.get("title", "")
            summary = entry.get("summary", entry.get("description", ""))
            pub_date_str = entry.get("published", entry.get("pubDate", ""))
            
            try:
                published_at = date_parser.parse(pub_date_str).astimezone(timezone.utc)
            except Exception:
                published_at = datetime.now(timezone.utc)
            
            articles.append({
                "source": feed_info["name"],
                "url": url,
                "title": title,
                "summary": summary,
                "published_at": published_at
            })
    return articles

def fetch_full_text(url):
    try:
        article = NewsArticle(url)
        article.download()
        article.parse()
        return article.text
    except Exception:
        return ""

def process_articles():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT url FROM "Article"')
    existing_urls = {row['url'] for row in cursor.fetchall()}
    
    new_articles_data = fetch_feed_articles()
    articles_to_insert = []
    
    for item in new_articles_data:
        if item["url"] not in existing_urls:
            content = fetch_full_text(item["url"])
            item["content"] = content
            articles_to_insert.append(item)
            existing_urls.add(item["url"])
            
    for item in articles_to_insert:
        cursor.execute(
            'INSERT INTO "Article" (title, summary, url, source, "publishedAt", content) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id',
            (item["title"], item["summary"], item["url"], item["source"], item["published_at"], item["content"])
        )
    
    conn.commit()
    
    cursor.execute('SELECT id, title, summary FROM "Article" WHERE "clusterId" IS NULL')
    ungrouped_articles = cursor.fetchall()
    
    cursor.execute('SELECT id, label FROM "Cluster"')
    existing_clusters = cursor.fetchall()
    cluster_labels = {c['id']: set(c['label'].split('-')) for c in existing_clusters}
    
    for article in ungrouped_articles:
        words = extract_significant_words(article['title'] + " " + (article['summary'] or ""))
        best_cluster_id = None
        best_overlap = 0
        
        for c_id, c_words in cluster_labels.items():
            overlap = len(words.intersection(c_words))
            if overlap >= 3 and overlap > best_overlap:
                best_overlap = overlap
                best_cluster_id = c_id
        
        if best_cluster_id:
            cursor.execute('UPDATE "Article" SET "clusterId" = %s WHERE id = %s', (best_cluster_id, article['id']))
            cluster_labels[best_cluster_id].update(words)
        else:
            label_words = list(words)[:5]
            label = "-".join(label_words) if label_words else "unnamed-topic"
            now = datetime.now(timezone.utc)
            cursor.execute(
                'INSERT INTO "Cluster" (label, "startTime", "endTime", "createdAt") VALUES (%s, %s, %s, %s) RETURNING id',
                (label, now, now, now)
            )
            new_cluster_id = cursor.fetchone()['id']
            cluster_labels[new_cluster_id] = set(label_words)
            cursor.execute('UPDATE "Article" SET "clusterId" = %s WHERE id = %s', (new_cluster_id, article['id']))
            
    
    cursor.execute('SELECT id FROM "Cluster"')
    all_clusters = cursor.fetchall()
    
    for c in all_clusters:
        c_id = c['id']
        cursor.execute('SELECT MIN("publishedAt") as start, MAX("publishedAt") as end FROM "Article" WHERE "clusterId" = %s', (c_id,))
        times = cursor.fetchone()
        if times and times['start'] and times['end']:
            cursor.execute('UPDATE "Cluster" SET "startTime" = %s, "endTime" = %s WHERE id = %s', (times['start'], times['end'], c_id))
            
    conn.commit()
    cursor.close()
    conn.close()

if __name__ == "__main__":
    process_articles()
