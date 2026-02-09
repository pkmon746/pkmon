import sqlite3
import sys
import json
import io
import contextlib
import argparse

# Import the new Selenium-based scraper function
from snkrdunk_psa10_scraper import run_scraper_and_save, init_db

DB_NAME = 'snkrdunk.db'

def query_price(keyword_name, set_name="", card_number=""):
    # Ensure DB exists
    init_db()
    
    try:
        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()
        
        # Check DB first
        # We search by name mainly
        search_term = f"%{keyword_name}%"
        
        cursor.execute('''
        SELECT card_name, psa10_latest_price, scraped_at, url, item_count
        FROM card_prices 
        WHERE card_name LIKE ? 
        ORDER BY scraped_at DESC 
        LIMIT 1
        ''', (search_term,))
        
        row = cursor.fetchone()
        conn.close()
        
        # If not found, run scraper
        if not row:
            # Capturing stdout to prevent pollution of JSON output
            f = io.StringIO()
            with contextlib.redirect_stdout(f):
                run_scraper_and_save(keyword_name, set_name, card_number)
            
            # Query again after scraping
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('''
            SELECT card_name, psa10_latest_price, scraped_at, url, item_count
            FROM card_prices 
            WHERE card_name LIKE ? 
            ORDER BY scraped_at DESC 
            LIMIT 1
            ''', (search_term,))
            row = cursor.fetchone()
            conn.close()
            
        if row:
            result = {
                "success": True,
                "cardTitle": row[0],
                "latestPrice": row[1],
                "scrapedAt": row[2],
                "url": row[3],
                "psa10Listings": row[4]
            }
        else:
            result = {
                "success": False,
                "error": "Card not found on SNKRDUNK."
            }
            
        print(json.dumps(result))
        
    except Exception as e:
        # In case of any error, return JSON error
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    # Expect: python query_snkrdunk_db.py "Name" "Set" "Number"
    # Or just "Name"
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No keyword provided"}))
        sys.exit(1)
        
    keyword = sys.argv[1]
    set_name = sys.argv[2] if len(sys.argv) > 2 else "Unknown"
    number = sys.argv[3] if len(sys.argv) > 3 else ""
    
    query_price(keyword, set_name, number)
