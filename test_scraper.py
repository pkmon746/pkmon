from snkrdunk_psa10_scraper import run_scraper_and_save, init_db

print("🧪 Starting manual test...")
init_db()

# Test Case: Broad search like Gengar Agent does
# Name: Gengar, Set: "", Number: ""
print("testing query: 'Gengar', '', ''")
result = run_scraper_and_save('Gengar', '', '')

if result:
    print("✅ Success:", result)
else:
    print("❌ Failed to find data.")
