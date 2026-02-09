import json
import subprocess
import sys
# Force utf-8 output for Windows
sys.stdout.reconfigure(encoding='utf-8')

from snkrdunk_psa10_scraper import run_scraper_and_save

# Fetch PSA Data using curl
print("🌐 Fetching PSA Data for Cert 78669934...")
# Use 78669934 (Gengar Fossil/Neo Destiny depending on reality)
cert_id = "78669934"

try:
    result = subprocess.run(
        ["curl", f"http://localhost:3000/api/psa/cert/{cert_id}"],
        capture_output=True,
        text=True,
        encoding='utf-8' # Try utf-8
    )
    # If utf-8 fails, it might be the console encoding, but let's try.
    raw_data = result.stdout
except Exception as e:
    print(f"❌ Curl failed: {e}")
    exit()

try:
    data = json.loads(raw_data)
except json.JSONDecodeError:
    print("❌ Failed to parse JSON. Raw output:")
    print(raw_data[:200]) # Print first 200 chars
    exit()

print("📄 PSA Data Loaded:", json.dumps(data, indent=2))

# Extract Data
cert_data = data.get('PSACert', {})

name = cert_data.get('Subject', '') or cert_data.get('CardName', '')
brand = cert_data.get('Brand', '') or cert_data.get('CardSet', '')
number = cert_data.get('CardNumber', '')

print(f"\n🧪 Testing Scraper with Sylveon Data:")
print(f"Name:   {name}")
print(f"Set:    {brand}")
print(f"Number: {number}")

if not name:
    print("❌ Failed to extract card name from JSON")
else:
    # Run Scraper
    print("\n🚀 Launching Scraper...")
    scrape_result = run_scraper_and_save(name, brand, number)
    
    if scrape_result:
        print("\n✅ Scraper Success!")
        print(scrape_result)
        
        # Save to file for easy reading by agent
        with open('latest_scan_result.json', 'w', encoding='utf-8') as f:
            json.dump(scrape_result, f, indent=2, ensure_ascii=False)
        print("\n💾 Result saved to latest_scan_result.json")
        
    else:
        print("\n❌ Scraper returned None")
        with open('latest_scan_result.json', 'w', encoding='utf-8') as f:
            json.dump({'error': 'No data found'}, f, indent=2)
