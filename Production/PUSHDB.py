import json
import os
from difflib import SequenceMatcher
from uuid import uuid4
from datetime import datetime
import re
from urllib.parse import urlparse

def standardize_date(date_str):
    """Convert date string to ISO 8601 format (YYYY-MM-DD)."""
    try:
        parsed_date = datetime.strptime(date_str, "%a, %d %b %Y %H:%M:%S %z")
        return parsed_date.strftime("%Y-%m-%d")
    except ValueError:
        return date_str

def clean_text(text):
    """Clean text by removing redundant whitespace and fixing encoding issues."""
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text.strip())
    text = text.encode('utf-8').decode('utf-8')
    return text

def is_valid_url(url):
    """Check if a URL is valid and not a shortlink (e.g., t.co)."""
    try:
        parsed = urlparse(url)
        if parsed.netloc in ('t.co', 'bit.ly'):
            return False
        return bool(parsed.scheme and parsed.netloc)
    except Exception:
        return False

def load_json_file(file_path):
    """Load JSON file with error handling."""
    if not os.path.exists(file_path):
        print(f"Error: {file_path} does not exist in {os.getcwd()}")
        return {"articles": []}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {file_path} with {len(data.get('articles', []))} articles")
            return data
    except json.JSONDecodeError as e:
        print(f"Error decoding {file_path}: {e}")
        return {"articles": []}
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return {"articles": []}

def save_json_file(file_path, data):
    """Save JSON file with proper encoding."""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"Successfully saved {file_path}")
    except Exception as e:
        print(f"Error saving {file_path}: {e}")

def similarity_score(str1, str2):
    """Calculate similarity score between two strings."""
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

def is_duplicate(new_article, existing_articles, title_threshold=0.95, content_threshold=0.9):
    """Check if an article is a duplicate based on title and content similarity."""
    new_title = new_article.get("title", "")
    new_content = new_article.get("content", "")
    
    for existing in existing_articles:
        existing_title = existing.get("title", "")
        existing_content = existing.get("content", "")
        
        title_similarity = similarity_score(new_title, existing_title)
        content_similarity = similarity_score(new_content, existing_content)
        
        if title_similarity > title_threshold or content_similarity > content_threshold:
            print(f"Duplicate detected: '{new_title}' (Title similarity: {title_similarity:.2f}, Content similarity: {content_similarity:.2f})")
            return True
    return False

def update_db():
    """Update DB.json with new articles from cleaned_ai_output.json."""
    print(f"Current working directory: {os.getcwd()}")
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define input and output file paths
    input_file = os.path.join(script_dir, "cleaned-ai-output.json")
    db_file = r"c:\Users\matta\Documents\Visual Studio Code Repository\Projects\Apodictic\Apodictic-Cycle\DB.json"
    
    # Load input and database files
    input_data = load_json_file(input_file)
    db_data = load_json_file(db_file)
    
    new_articles = input_data.get("articles", [])
    existing_articles = db_data.get("articles", [])
    
    if not new_articles:
        print("No articles found in cleaned_ai_output.json")
        return
    
    # Track articles to add
    articles_to_add = []
    
    for article in new_articles:
    # Clean article fields
     cleaned_article = {
        "title": clean_text(article.get("title", "")),
        "content": clean_text(article.get("content", "")),
        "category": clean_text(article.get("category", "")),
        "id": clean_text(article.get("id", str(uuid4()))),
        "date": standardize_date(article.get("date", "")),
        "lead": clean_text(article.get("lead", "")),
        "image": clean_text(article.get("image", "")),
        "dot_points": [clean_text(point) for point in article.get("dot_points", [])],
        "sources": [
            {
                "title": clean_text(source.get("title", "")),
                "url": clean_text(source.get("url", ""))
            }
            for source in article.get("sources", [])
            if is_valid_url(source.get("url", ""))
        ],
        "quotes": [
            {
                "text": clean_text(quote.get("text", "")),
                "speaker": clean_text(quote.get("speaker", ""))
            }
            for quote in article.get("quotes", [])
        ]
    }
        # Check for duplicates
    if not is_duplicate(cleaned_article, existing_articles):
            articles_to_add.append(cleaned_article)
            print(f"Adding article: '{cleaned_article.get('title', 'No title')}'")
    else:
            print(f"Skipping article: '{cleaned_article.get('title', 'No title')}' due to similarity with existing article")
    
    if not articles_to_add:
        print("No new articles added; all were flagged as duplicates or no valid articles found")
        return
    
    # Add new articles to the top
    db_data["articles"] = articles_to_add + existing_articles
    
    # Save updated DB
    save_json_file(db_file, db_data)
    print(f"Added {len(articles_to_add)} new articles to DB.json")

if __name__ == "__main__":
    update_db()