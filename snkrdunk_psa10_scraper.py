"""
SNKRDUNK PSA 10 스크래퍼 - Listed Items 버전
Trading History 대신 Listed Items에서 최저가 추출
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import time
import re
import sqlite3
import datetime

# Database Configuration
DB_NAME = 'snkrdunk.db'

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Enhanced Schema to match provided data structure
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS card_prices (
        card_id TEXT PRIMARY KEY,
        card_name TEXT,
        set_name TEXT,
        card_number TEXT,
        psa10_latest_price INTEGER,
        psa10_average_price INTEGER,
        url TEXT,
        item_count INTEGER DEFAULT 0,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Migration: Add item_count if not exists
    try:
        cursor.execute("ALTER TABLE card_prices ADD COLUMN item_count INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass # Already exists
        
    conn.commit()
    conn.close()

def save_result_to_db(card_name, set_name, card_number, result):
    if not result:
        return
        
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    
    # Generate a simple card_id or use URL ID
    # URL format: https://snkrdunk.com/en/trading-cards/12345
    card_id = result['url'].split('/')[-1].split('?')[0]
    
    # Adapt for different scraping results (Latest Transaction vs Lowest Listed)
    price = result.get('latest_price') or result.get('lowest_price')
    count = result.get('count', 0)
    
    cursor.execute('''
    INSERT OR REPLACE INTO card_prices 
    (card_id, card_name, set_name, card_number, psa10_latest_price, psa10_average_price, url, item_count, scraped_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        card_id, 
        card_name, 
        set_name, 
        card_number, 
        price, 
        result['average_price'], 
        result['url'], 
        count,
        datetime.datetime.now()
    ))
    
    conn.commit()
    conn.close()
    print(f"💾 Saved to Database: {card_name} ({card_id})")

class PokemonNameExtractor:
    """Card name에서 Pokemon name 추출"""
    
    SUFFIXES_TO_REMOVE = [
        '-reverse-holo', '-holo', '-non-holo', '-holofoil',
        '-vmax', '-vstar', '-ex', '-gx', '-v', 
        '-mega', '-break', '-prime', '-legend', '-lv-x', '-lvx', '-star',
        '-full-art', '-secret', '-rainbow', '-gold', '-shiny',
        '-promo', '-prerelease', '-staff', '-stamped',
        '-radiant', '-shining', '-dark', '-light', '-delta-species',
        '-sp', '-gl', '-fb', '-c', '-g',
    ]
    
    @staticmethod
    def extract(card_name):
        """Card name → Pokemon name 변환"""
        if not card_name:
            return ""
        
        name = card_name.lower().strip()
        
        for suffix in sorted(PokemonNameExtractor.SUFFIXES_TO_REMOVE, 
                           key=len, reverse=True):
            name = name.replace(suffix, '')
        
        name = name.replace('-', ' ').strip()
        name = re.sub(r'\s+', ' ', name)
        
        return name.title()


class SNKRDUNKListedItemsScraper:
    """Listed Items에서 PSA 10 최저가를 가져오는 스크래퍼"""
    
    def __init__(self, headless=True):
        """스크래퍼 초기화"""
        chrome_options = Options()
        
        if headless:
            chrome_options.add_argument('--headless=new')
        
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        
        self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
            'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
        })
        
        print("✅ Browser initialized")
    
    def get_psa10_price(self, card_name, set_name, card_number):
        """
        Listed Items에서 PSA 10 최저가 가져오기
        
        Args:
            card_name: Sylveon 카드 이름 (예: "gengar-holo")
            set_name: 세트 이름 (예: "Fossil")
            card_number: 카드 번호 (예: "005/62")
        
        Returns:
            dict: {'lowest_price': int, 'all_prices': list, ...} or None
        """
        try:
            # Step 0: Pokemon 이름만 추출
            pokemon_name = PokemonNameExtractor.extract(card_name)
            
            print(f"\n{'='*70}")
            print(f"🎴 SNKRDUNK Listed Items Scraper")
            print(f"{'='*70}")
            print(f"Card Name:      {card_name}")
            print(f"→ Pokemon Name: {pokemon_name}")
            print(f"Set:            {set_name}")
            print(f"Card Number:    {card_number}")
            print(f"{'='*70}\n")
            
            # Step 1: Pokemon 이름만으로 검색
            print(f"[Step 1] Searching with Pokemon name ONLY...")
            print(f"         Keyword: {pokemon_name}")
            
            search_url = f"https://snkrdunk.com/en/search/result?keyword={pokemon_name}"
            print(f"         URL: {search_url}")
            
            self.driver.get(search_url)
            time.sleep(3)
            
            # Step 2: Alt 텍스트로 정확한 카드 매칭
            print(f"\n[Step 2] Finding exact card by Alt text...")
            print(f"         Looking for:")
            print(f"         - Pokemon: {pokemon_name}")
            print(f"         - Set: {set_name}")
            print(f"         - Number: {card_number}")
            
            images = self.driver.find_elements(By.TAG_NAME, "img")
            
            card_url = None
            matched_alt = None
            
            # Need to clean set name too for better matching
            # Snkrdunk often simplifies "Pokemon Japanese Fossil" to "Fossil"
            # So looking for set_name in alt might be strict if set_name is long.
            # But the user logic is 'has_set = set_name.lower() in alt_text.lower()'
            # Let's trust user logic for now, but if it fails we might need set cleaning.
            
            for img in images:
                alt_text = img.get_attribute('alt')
                
                if alt_text:
                    # 3가지 모두 매칭
                    has_pokemon = pokemon_name.lower() in alt_text.lower()
                    
                    # Fuzzy Set Matching
                    # Logic: At least one significant word from set_name must be in alt_text
                    # Clean set name: remove generic words
                    set_clean = set_name.lower().replace('pokemon', '').replace('japanese', '').replace('card', '').strip()
                    # Get tokens > 2 chars
                    set_tokens = [t for t in set_clean.split() if len(t) > 2]
                    
                    has_set = False
                    if not set_tokens:
                        # If set name was just "Pokemon Japanese", we can't really match a set.
                        # In this case, rely on Pokemon Name + Number strongly.
                        has_set = True 
                    else:
                        for token in set_tokens:
                            if token in alt_text.lower():
                                has_set = True
                                break
                    
                    has_number = card_number in alt_text
                    
                    # Relieve strictness:
                    # Require Pokemon Name match AND (Set match OR Number match)
                    # Because Japanese/English numbering might differ, or Set names might differ.
                    if has_pokemon and (has_set or has_number):
                        print(f"\n         ✅ Found match!")
                        print(f"            Alt: {alt_text}")
                        print(f"            Matches: Pokemon={has_pokemon}, Set={has_set}, Number={has_number}")
                        
                        matched_alt = alt_text
                        
                        # 부모 링크
                        try:
                            parent_link = img.find_element(By.XPATH, "./ancestor::a[@href]")
                            card_url = parent_link.get_attribute('href')
                            print(f"            URL: {card_url}")
                            break
                        except:
                            continue
            
            if not card_url:
                print(f"\n❌ No matching card found")
                print(f"\n   Searched: keyword={pokemon_name}")
                print(f"   Looking for alt with:")
                print(f"   - {pokemon_name}")
                print(f"   - {set_name}")
                print(f"   - {card_number}")
                
                # 디버그: Pokemon 이름 포함된 alt 출력
                print(f"\n   Debug: Alt texts containing '{pokemon_name}':")
                count = 0
                for img in images:
                    alt = img.get_attribute('alt')
                    if alt and pokemon_name.lower() in alt.lower():
                        print(f"   - {alt}")
                        count += 1
                        if count >= 5:
                            break
                
                return None
            
            # URL 정규화
            if not card_url.startswith('http'):
                card_url = f"https://snkrdunk.com{card_url}"
            
            # Step 3: 카드 상세 페이지
            print(f"\n[Step 3] Loading card detail page...")
            self.driver.get(card_url)
            time.sleep(4)
            
            # Step 4: 'See More' 버튼 찾기 및 클릭 (Listed Items 확장)
            print(f"\n[Step 4] Looking for 'See More' button...")
            see_more_clicked = False
            
            try:
                # 여러 셀렉터 시도
                see_more_selectors = [
                    "//a[contains(@class, 'arrow') and contains(text(), 'See More')]",
                    "//a[contains(@class, 'arrow')]",
                    "//a[contains(text(), 'See More')]",
                    "//a[contains(@href, '/used?slide=right')]",
                ]
                
                see_more_btn = None
                for selector in see_more_selectors:
                    btns = self.driver.find_elements(By.XPATH, selector)
                    if btns:
                        # 화면에 보이는지 확인
                        if btns[0].is_displayed():
                            see_more_btn = btns[0]
                            print(f"         ✅ Found 'See More' button: {selector}")
                            break
                
                if see_more_btn:
                    # 클릭 전 스크롤
                    self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", see_more_btn)
                    time.sleep(1)
                    
                    # JS Click (Safety)
                    self.driver.execute_script("arguments[0].click();", see_more_btn)
                    print(f"         ✅ Clicked 'See More' button")
                    see_more_clicked = True
                    time.sleep(4) # 로딩 대기
                else:
                    print(f"         ⚠️ 'See More' button not found, using visible items only")
            
            except Exception as e:
                print(f"         ⚠️ Error detecting 'See More': {e}")

            # Step 5: Listed Items에서 PSA 10 찾기
            print(f"\n[Step 5] Finding PSA 10 items in Listed Items...")
            
            # 페이지 스크롤 (Listed Items 로드)
            # See More 클릭했다면 더 많이 스크롤
            scroll_range = 5 if see_more_clicked else 3
            for i in range(scroll_range):
                self.driver.execute_script(f"window.scrollTo(0, {(i+1)*800});")
                time.sleep(1)
            
            # <p class="evaluation">PSA 10</p> 찾기
            # User provided selector: class="evaluation"
            # Strict match to avoid "PSA 8", "PSA 9" etc.
            psa10_elements = self.driver.find_elements(
                By.XPATH,
                "//p[contains(@class, 'evaluation') and normalize-space(text())='PSA 10']"
            )
            
            print(f"         Found {len(psa10_elements)} PSA 10 items")
            
            if not psa10_elements:
                print("⚠️ No PSA 10 elements found! Dumping HTML...")
                with open('snkrdunk_fail.html', 'w', encoding='utf-8') as f:
                    f.write(self.driver.page_source)
                self.driver.save_screenshot("snkrdunk_fail.png")
            
            psa10_prices = []
            
            for idx, psa10_elem in enumerate(psa10_elements, 1):
                try:
                    # PSA 10 요소의 부모 컨테이너 찾기
                    parent = psa10_elem.find_element(By.XPATH, "./ancestor::*[contains(@class, 'product__item') or contains(@class, 'item')]")
                    parent_text = parent.text
                    
                    # 가격 패턴 매칭
                    price_patterns = [
                        r'US\s*\$\s*([0-9,]+)',
                        r'\$\s*([0-9,]+)',
                        r'([0-9,]+)\s*USD',
                        r'¥\s*([0-9,]+)',
                    ]
                    
                    price_found = False
                    for pattern in price_patterns:
                        match = re.search(pattern, parent_text)
                        if match:
                            price_str = match.group(1).replace(',', '')
                            price = int(price_str)
                            
                            # Yen conversion if needed
                            if '¥' in parent_text or 'JPY' in parent_text:
                                price = int(price / 150)

                            if 10 < price < 1000000:
                                psa10_prices.append(price)
                                # print(f"         [{idx}] PSA 10: ${price:,}") # Too noisy if many items
                                price_found = True
                                break
                    
                    if not price_found:
                        # Sibling check
                        try:
                            siblings = parent.find_elements(By.XPATH, ".//*")
                            for sibling in siblings:
                                sib_text = sibling.text
                                for pattern in price_patterns:
                                    match = re.search(pattern, sib_text)
                                    if match:
                                        price_str = match.group(1).replace(',', '')
                                        price = int(price_str)
                                        if '¥' in sib_text or 'JPY' in sib_text:
                                            price = int(price / 150)
                                        if 10 < price < 1000000:
                                            psa10_prices.append(price)
                                            price_found = True
                                            break
                                if price_found: break
                        except: pass
                
                except Exception as e:
                    print(f"         [{idx}] ⚠️ Could not extract price: {e}")
                    try:
                         print(f"         Parent Text: {parent.text[:50]}...")
                    except: pass
                    continue
            
            # 결과 처리
            if psa10_prices:
                # 정렬 (중복 허용)
                psa10_prices = sorted(psa10_prices)
                
                lowest_price = psa10_prices[0]
                highest_price = psa10_prices[-1]
                average_price = round(sum(psa10_prices) / len(psa10_prices))
                
                result = {
                    'card_name': card_name,
                    'pokemon_name': pokemon_name,
                    'set_name': set_name,
                    'card_number': card_number,
                    'lowest_price': lowest_price,
                    'highest_price': highest_price,
                    'average_price': average_price,
                    'all_prices': psa10_prices,
                    'count': len(psa10_prices),
                    'url': card_url,
                    'matched_alt': matched_alt,
                    'see_more_clicked': see_more_clicked
                }
                
                print(f"\n{'='*70}")
                print(f"✅ SUCCESS!")
                print(f"{'='*70}")
                print(f"Card:           {card_name}")
                print(f"See More:       {'Clicked ✅' if see_more_clicked else 'Not found ⚠️'}")
                print(f"Lowest PSA 10:  ${lowest_price:,}")
                print(f"Highest:        ${highest_price:,}")
                print(f"Average:        ${average_price:,}")
                print(f"Items:          {len(psa10_prices)}")
                print(f"All Prices:     {[f'${p:,}' for p in psa10_prices]}")
                print(f"URL:            {card_url}")
                print(f"{'='*70}\n")
                
                return result
            else:
                print(f"\n⚠️ No PSA 10 items found in Listed Items")
                return None
        
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            try:
                self.driver.save_screenshot("snkrdunk_error.png")
                print(f"📸 Screenshot: snkrdunk_error.png")
            except:
                pass
            
            return None
    
    def close(self):
        """브라우저 종료"""
        self.driver.quit()
        print("👋 Browser closed")

# Single function wrapper for external calls (Bridge compatibility)
def run_scraper_and_save(card_name, set_name="Unknown", card_number=""):
    init_db()
    scraper = SNKRDUNKListedItemsScraper(headless=False) # Keep headed for visibility
    try:
        result = scraper.get_psa10_price(card_name, set_name, card_number)
        if result:
            save_result_to_db(card_name, set_name, card_number, result)
        return result
    finally:
        scraper.close()

# 사용 예시
if __name__ == "__main__":
    init_db()
    scraper = SNKRDUNKListedItemsScraper(headless=False)
    
    try:
        print("="*70)
        print("SNKRDUNK Listed Items Scraper Test")
        print("="*70)
        
        # Sylveon Agent 데이터 예시
        test_cases = [
            {
                'card_name': 'gengar-holo',
                'set_name': 'Fossil',
                'card_number': '005/62'
            }
        ]
        
        for i, test in enumerate(test_cases, 1):
            print(f"\n\n{'#'*70}")
            print(f"Test Case {i}/{len(test_cases)}")
            print(f"{'#'*70}")
            
            result = scraper.get_psa10_price(
                card_name=test['card_name'],
                set_name=test['set_name'],
                card_number=test['card_number']
            )
            
            if result:
                print(f"\n✅ Test {i} Success: Lowest PSA 10 = ${result['lowest_price']:,}")
                # Save just for test
                save_result_to_db(test['card_name'], test['set_name'], test['card_number'], result)
            else:
                print(f"\n⚠️ Test {i} Failed: No data found")
            
    except KeyboardInterrupt:
        print("\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        scraper.close()
