"""
SNKRDUNK PSA 10 최저가 스크래퍼
=====================================
흐름:
  1. Card Name에서 포켓몬 이름만 추출 → 검색
  2. 검색 결과 product__item-name에서 Card Name + Set + Card Number 매칭
  3. "See More" 링크 클릭 → /used?slide=right 페이지 이동
  4. SOLD 제외, PSA 10 아이템 중 가장 저렴한 가격 반환

사용 예시:
  python snkrdunk_scraper.py
  또는
  from snkrdunk_scraper import get_cheapest_psa10
  result = get_cheapest_psa10("GENGAR-HOLO", "POKEMON JAPANESE FOSSIL", "94")
"""

import re
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager


# ──────────────────────────────────────────────────────────────
# 포켓몬 이름 추출
# ──────────────────────────────────────────────────────────────

# 포켓몬 이름 앞뒤에 붙는 접두/접미 패턴들
_REMOVE_PREFIXES = [
    r'^fa[/\-\s]+',        # FA/Gengar → Gengar
    r'^full\s*art[/\-\s]+',
    r"^morty's[\s]+",
    r"^misty's[\s]+",
    r"^brock's[\s]+",
    r"^erika's[\s]+",
    r"^lt\.?\s*surge's[\s]+",
    r"^sabrina's[\s]+",
    r"^blaine's[\s]+",
    r"^giovanni's[\s]+",
    r"^koga's[\s]+",
    r"^rocket's[\s]+",
    r"^dark[\s]+",
    r"^light[\s]+",
    r"^shining[\s]+",
    r"^radiant[\s]+",
]

_REMOVE_SUFFIXES = [
    r'[\-\s]+reverse[\-\s]*holo$',
    r'[\-\s]+holofoil$',
    r'[\-\s]+holo$',
    r'[\-\s]+non[\-\s]*holo$',
    r'[\-\s]+vmax$',
    r'[\-\s]+vstar$',
    r'[\-\s]+v$',
    r'[\-\s]+ex$',
    r'[\-\s]+gx$',
    r'[\-\s]+mega$',
    r'[\-\s]+break$',
    r'[\-\s]+prime$',
    r'[\-\s]+legend$',
    r'[\-\s]+lv[\-\.]?x$',
    r'[\-\s]+star$',
    r'[\-\s]+full[\-\s]*art$',
    r'[\-\s]+secret$',
    r'[\-\s]+rainbow$',
    r'[\-\s]+gold$',
    r'[\-\s]+shiny$',
    r'[\-\s]+promo$',
    r'[\-\s]+prerelease$',
    r'[\-\s]+staff$',
    r'[\-\s]+stamped$',
    r'[\-\s]+radiant$',
    r'[\-\s]+shining$',
    r'[\-\s]+dark$',
    r'[\-\s]+light$',
    r'[\-\s]+delta[\-\s]*species$',
    r'[\-\s]+sp$',
    r'[\-\s]+gl$',
    r'[\-\s]+fb$',
]


def extract_pokemon_name(card_name: str) -> str:
    """
    Card Name에서 포켓몬 이름만 추출.

    예시:
      "GENGAR-HOLO"           → "Gengar"
      "FA/Gengar VMAX"        → "Gengar"
      "Sylveon-GX"            → "Sylveon"
      "Pikachu Reverse Holo"  → "Pikachu"
    """
    name = card_name.strip().lower()

    # 접두사 제거
    # 카드 번호(#94 등) 제거 - 프론트엔드 구버전 호환용
    name = re.sub(r'#.*', '', name)
    name = name.strip()

    for pattern in _REMOVE_PREFIXES:
        name = re.sub(pattern, '', name, flags=re.IGNORECASE)

    # 접미사 반복 제거 (여러 개 붙어 있을 수 있음)
    changed = True
    while changed:
        prev = name
        for pattern in _REMOVE_SUFFIXES:
            name = re.sub(pattern, '', name, flags=re.IGNORECASE)
        changed = name != prev

    # 특수문자 정리 후 Title Case
    name = name.strip(' -/')
    name = re.sub(r'\s+', ' ', name)
    return name.title()


# ──────────────────────────────────────────────────────────────
# 세트 이름 매핑 (PriceCharting -> SNKRDUNK)
# ──────────────────────────────────────────────────────────────

_SET_MAPPING = {
    'neo 4': 'destiny',
    'neo 3': 'revelation',
    'neo 2': 'discovery',
    'neo 1': 'genesis',
    'base set': 'base',
    'legendary collection': 'legendary',
    'expedition base set': 'expedition',
    'aquapolis': 'aquapolis',
    'skyridge': 'skyridge',
    'fossil': 'fossil',
    'jungle': 'jungle',
    'team rocket': 'rocket',
    'gym heroes': 'heroes',
    'gym challenge': 'challenge',
}

def map_set_name(set_name: str) -> str:
    """
    세트 이름을 SNKRDUNK 검색에 유리하게 변환.
    예: "Pokemon Japanese Neo 4" -> "Destiny" (Neo 4 is Neo Destiny)
    """
    s_lower = set_name.lower()
    
    for key, value in _SET_MAPPING.items():
        if key in s_lower:
            return value
            
    return set_name


# ──────────────────────────────────────────────────────────────
# 드라이버 초기화
# ──────────────────────────────────────────────────────────────

def _build_driver(headless: bool = True) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument(
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    options.add_experimental_option('excludeSwitches', ['enable-automation'])
    options.add_experimental_option('useAutomationExtension', False)

    # [Fix for Docker/Render]
    # webdriver-manager sometimes points to 'THIRD_PARTY_NOTICES.chromedriver' (text file)
    # instead of the actual binary. We must ensure we point to the executable.
    
    try:
        driver_path = ChromeDriverManager().install()
        
        # If path ends with .chromedriver (likely not a binary in Linux) or is a known text file
        if driver_path.endswith("THIRD_PARTY_NOTICES.chromedriver"):
            base_dir = os.path.dirname(driver_path)
            potential_binary = os.path.join(base_dir, "chromedriver")
            if os.path.exists(potential_binary) and os.access(potential_binary, os.X_OK):
                print(f"✅ Corrected driver path: {potential_binary}")
                driver_path = potential_binary
            else:
                # Fallback: search correctly in the directory tree
                print(f"⚠️ License file detected at {driver_path}. Searching for binary...")
                found = False
                for root, dirs, files in os.walk(os.path.dirname(base_dir)):
                    for file in files:
                        if file == "chromedriver":
                            full_path = os.path.join(root, file)
                            if os.access(full_path, os.X_OK):
                                driver_path = full_path
                                found = True
                                break
                    if found: break
                
                if found:
                    print(f"✅ Found chromedriver binary: {driver_path}")

        # Explicitly set permissions if needed
        if not os.access(driver_path, os.X_OK):
            try:
                os.chmod(driver_path, 0o755)
            except Exception:
                pass

        service = Service(driver_path)
    except Exception as e:
        print(f"⚠️ WebDriver Manager Error: {e}")
        # Fallback to system-installed chromedriver (since we installed google-chrome-stable)
        print("Using system default chromedriver...")
        service = Service() # Expects 'chromedriver' in PATH

    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': 'Object.defineProperty(navigator, "webdriver", {get: () => undefined})'
    })
    return driver


# ──────────────────────────────────────────────────────────────
# Step 1: 포켓몬 이름으로 검색
# ──────────────────────────────────────────────────────────────

def _search_cards(driver: webdriver.Chrome, pokemon_name: str):
    """
    https://snkrdunk.com/en/search 에서 pokemon_name으로 검색.
    검색 결과 페이지를 로드하고 스크롤하여 모든 이미지를 로드한 후 현재 URL을 반환.
    """
    search_url = f"https://snkrdunk.com/en/search/result?keyword={pokemon_name}"
    print(f"[Step 1] 검색 URL: {search_url}")
    driver.get(search_url)

    # 결과 로드 대기
    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, 'product__item-name'))
        )
    except Exception:
        # product__item-name이 없어도 계속 진행 (페이지 구조 다를 수 있음)
        time.sleep(3)

    # 스크롤하여 더 많은 이미지 로드
    print(f"[Step 1] 스크롤하여 이미지 로드 중...")
    for i in range(5):  # 5번 스크롤
        driver.execute_script(f"window.scrollTo(0, {(i+1)*800});")
        time.sleep(1)
    
    # 다시 위로 올라가서 전체 페이지 확인
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(1)

    return driver.current_url


# ──────────────────────────────────────────────────────────────
# Step 2: product__item-name에서 정확한 카드 매칭
# ──────────────────────────────────────────────────────────────

def _find_card_link(driver: webdriver.Chrome,
                    card_name: str,
                    set_name: str,
                    card_number: str,
                    pokemon_name: str) -> str | None:
    """
    검색 결과에서 pokemon name 기준으로 카드 매칭.
    
    매칭 우선순위:
      1. Set 이름 매칭
      2. Card 번호 매칭 (XX/YY 형식 지원)
      3. Card 이름 매칭

    반환: 매칭된 카드 상세 페이지 URL 또는 None
    """
    print(f"[Step 2] 카드 매칭 중...")
    print(f"         Card Name  : {card_name}")
    print(f"         Pokemon    : {pokemon_name}")
    print(f"         Set        : {set_name}")
    print(f"         Card Number: {card_number}")

    def normalize(text: str) -> str:
        return re.sub(r'\s+', ' ', text).strip().lower()

    cn = normalize(card_name)
    pn = normalize(pokemon_name)
    sn = normalize(set_name)
    
    # 세트 이름 매핑 적용 (예: Neo 4 -> Destiny)
    mapped_set = map_set_name(set_name)
    mapped_sn = normalize(mapped_set)
    
    num = card_number.strip()

    # 세트 이름에서 의미 있는 토큰만 추출
    _generic = {'pokemon', 'japanese', 'english', 'card', 'cards', 'tcg', 'the', 'neo'}
    # 매핑된 이름과 원본 이름 모두 토큰화해 사용
    set_tokens = set(
        [t for t in sn.split() if t not in _generic and len(t) > 1] +
        [t for t in mapped_sn.split() if t not in _generic and len(t) > 1]
    )
    
    print(f"         Set Tokens : {set_tokens}")

    # 1단계: 이미지 alt 텍스트로 먼저 시도 (XX/YY 형식 지원)
    print(f"         이미지 alt 텍스트로 매칭 시작...")
    images = driver.find_elements(By.TAG_NAME, "img")
    print(f"         검색된 이미지 수: {len(images)}")

    best_match = None
    best_score = 0

    for img in images:
        alt_text = img.get_attribute('alt')
        if not alt_text:
            continue
            
        alt_normalized = normalize(alt_text)

        # Pokemon 이름으로 기본 필터링
        if pn not in alt_normalized:
            continue

        # 우선순위 매칭
        has_set = any(t in alt_normalized for t in set_tokens) if set_tokens else False
        has_card_name = cn in alt_normalized
        
        # 카드 번호 매칭 (XX/YY 형식에서 앞 두 자리만 추출)
        has_number = False
        if num:
            card_number_matches = re.findall(r'(\d{2,3})/\d{2,3}', alt_text)
            for match in card_number_matches:
                if num in match or match in num:
                    has_number = True
                    break
            # 직접 번호 매칭도 시도
            if not has_number and num in alt_text:
                has_number = True

        # 점수 계산 (Set: 3점, Number: 2점, Card Name: 1점)
        score = 0
        if has_set:
            score += 3
        if has_number:
            score += 2
        if has_card_name:
            score += 1

        if score > best_score:
            best_score = score
            best_match = (img, alt_text, has_set, has_number, has_card_name)

    # 최고 점수 매칭 반환
    if best_match and best_score > 0:
        img, alt_text, has_set, has_number, has_card_name = best_match
        print(f"         ✅ 최고 매칭 (점수 {best_score}): {alt_text[:80]}")
        print(f"            Set: {has_set}, Number: {has_number}, Card: {has_card_name}")
        try:
            link_el = img.find_element(By.XPATH, "./ancestor::a[@href][1]")
            href = link_el.get_attribute('href')
            if href:
                if not href.startswith('http'):
                    href = 'https://snkrdunk.com' + href
                print(f"         URL: {href}")
                return href
        except Exception:
            pass

    # 2단계: product__item-name으로 fallback
    print(f"         ⚠️ 이미지 alt 텍스트 매칭 실패, product__item-name으로 시도...")
    items = driver.find_elements(By.CLASS_NAME, 'product__item-name')
    print(f"         검색된 product__item-name 수: {len(items)}")

    for item in items:
        item_text = normalize(item.text)
        
        # Pokemon 이름으로 기본 필터링
        if pn not in item_text:
            continue

        # 우선순위 매칭
        has_set = any(t in item_text for t in set_tokens) if set_tokens else False
        has_number = num in item_text if num else False
        has_card_name = cn in item_text

        # 점수 계산 (Set: 3점, Number: 2점, Card Name: 1점)
        score = 0
        if has_set:
            score += 3
        if has_number:
            score += 2
        if has_card_name:
            score += 1

        if score > 0:
            print(f"         ✅ 매칭 (점수 {score}): {item.text[:80]}")
            print(f"            Set: {has_set}, Number: {has_number}, Card: {has_card_name}")
            try:
                link_el = item.find_element(By.XPATH, "./ancestor::a[@href][1]")
                href = link_el.get_attribute('href')
                if href:
                    if not href.startswith('http'):
                        href = 'https://snkrdunk.com' + href
                    print(f"         URL: {href}")
                    return href
            except Exception:
                pass

    # 매칭 실패 시 디버그 출력
    print(f"         ❌ 매칭 실패. 전체 product__item-name 목록:")
    for item in items[:10]:
        print(f"            - {item.text[:80]}")

    return None


# ──────────────────────────────────────────────────────────────
# Step 3: See More 클릭 → /used?slide=right 이동
# ──────────────────────────────────────────────────────────────

def _click_see_more(driver: webdriver.Chrome, card_url: str) -> bool:
    """
    카드 상세 페이지에서 See More 링크를 클릭.
    href 패턴: /en/trading-cards/{id}/used?slide=right

    성공 여부 반환.
    """
    print(f"[Step 3] 카드 상세 페이지 로드: {card_url}")
    driver.get(card_url)
    time.sleep(3)

    # <a class="arrow"> See More </a> 탐색
    selectors = [
        "//a[contains(@href,'/used?slide=right')]",
        "//a[contains(@class,'arrow') and contains(normalize-space(text()),'See More')]",
        "//a[contains(normalize-space(text()),'See More')]",
    ]

    for sel in selectors:
        els = driver.find_elements(By.XPATH, sel)
        for el in els:
            if el.is_displayed():
                href = el.get_attribute('href') or ''
                print(f"         ✅ See More 발견: {href}")
                driver.execute_script(
                    "arguments[0].scrollIntoView({block:'center'});", el
                )
                time.sleep(0.5)
                driver.execute_script("arguments[0].click();", el)
                time.sleep(4)
                print(f"         현재 URL: {driver.current_url}")
                return True

    print(f"         ⚠️ See More 버튼 없음 — 현재 페이지에서 진행")
    return False

# Step 4: SOLD 제외, PSA 10 최저가 추출
# ──────────────────────────────────────────────────────────────

def _extract_cheapest_psa10(driver: webdriver.Chrome) -> dict | None:
    print(f"[Step 4] PSA 10 최저가 추출 중...")

    for i in range(6):
        driver.execute_script(f"window.scrollTo(0, {(i + 1) * 900});")
        time.sleep(0.8)
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(1)

    psa10_elements = driver.find_elements(
        By.XPATH,
        "//p[contains(@class,'evaluation') and normalize-space(text())='PSA 10']"
    )
    print(f"         전체 PSA 10 요소 수: {len(psa10_elements)}")

    prices = []

    for psa10_el in psa10_elements:
        try:
            # ── 핵심: PSA 10 기준으로 가장 가까운 조상 컨테이너 찾기 ──
            # ancestor 중 product__item, item--, li 등 아이템 단위 컨테이너
            try:
                container = psa10_el.find_element(
                    By.XPATH,
                    "ancestor::*[contains(@class,'product__item') "
                    "or contains(@class,'item--') "
                    "or local-name()='li'][1]"
                )
            except Exception:
                # 컨테이너를 못 찾으면 부모 3단계 위까지
                container = psa10_el.find_element(By.XPATH, "ancestor::*[3]")

            # ── SOLD 체크 방법 1: 컨테이너 내 label-sold 직접 탐색 ──
            sold_check = container.find_elements(
                By.XPATH,
                ".//*[contains(@class,'label-sold')]"
            )
            if sold_check:
                print(f"         🚫 SOLD 스킵 (label-sold 발견)")
                continue

            # ── SOLD 체크 방법 2: outerHTML에서 텍스트로 확인 ──
            # (클래스명이 다를 경우 대비)
            container_html = container.get_attribute('outerHTML') or ''
            if 'label-sold' in container_html or ' SOLD ' in container_html:
                print(f"         🚫 SOLD 스킵 (HTML 텍스트 확인)")
                continue

            # ── 가격 추출 ──
            price_els = container.find_elements(
                By.XPATH,
                ".//p[contains(@class,'price')]"
            )

            for price_el in price_els:
                price_text = price_el.text.strip()

                # US $71 또는 $71
                match = re.search(r'US\s*\$\s*([\d,]+)', price_text)
                if not match:
                    match = re.search(r'\$\s*([\d,]+)', price_text)
                if match:
                    price = int(match.group(1).replace(',', ''))
                    if price > 0:
                        prices.append(price)
                        print(f"         ✅ ${price:,}  [{price_text}]")
                    break

                # 엔화
                yen_match = re.search(r'¥\s*([\d,]+)', price_text)
                if yen_match:
                    usd = round(int(yen_match.group(1).replace(',', '')) / 150)
                    if usd > 0:
                        prices.append(usd)
                        print(f"         ✅ ${usd:,} (¥환산)  [{price_text}]")
                    break

        except Exception as e:
            print(f"         ⚠️ 오류: {e}")
            continue

    if not prices:
        print("         ❌ PSA 10 아이템 없음 — 디버그 파일 저장")
        driver.save_screenshot('snkrdunk_debug.png')
        with open('snkrdunk_debug.html', 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        return None

    prices.sort()
    cheapest = prices[0]

    print(f"\n{'='*60}")
    print(f"  ✅ 최저가 PSA 10: ${cheapest:,}")
    print(f"  전체 가격 목록 : {[f'${p:,}' for p in prices]}")
    print(f"  아이템 수      : {len(prices)}")
    print(f"{'='*60}\n")

    return {
        'price':      cheapest,
        'price_str':  f'${cheapest:,}',
        'all_prices': prices,
        'count':      len(prices),
    }


# ──────────────────────────────────────────────────────────────
# 메인 함수
# ──────────────────────────────────────────────────────────────

def get_cheapest_psa10(card_name: str,
                       set_name: str,
                       card_number: str,
                       headless: bool = True) -> dict | None:
    """
    SNKRDUNK에서 PSA 10 최저가 아이템을 찾아 반환.

    Args:
        card_name   : Sylveon Agent가 제공한 Card Name (예: "GENGAR-HOLO")
        set_name    : 세트명 (예: "POKEMON JAPANESE FOSSIL")
        card_number : 카드 번호 (예: "94")
        headless    : 브라우저 headless 모드 여부

    Returns:
        {
            'price':       71,           # 최저가 (USD 정수)
            'price_str':   '$71',        # 표시용 문자열
            'all_prices':  [71, 85, ...],
            'count':       3,            # PSA 10 Listed 수
            'url':         '...',        # 최종 페이지 URL
            'card_name':   'GENGAR-HOLO',
            'pokemon_name':'Gengar',
        }
        또는 None (카드를 찾지 못한 경우)
    """
    pokemon_name = extract_pokemon_name(card_name)

    print(f"\n{'='*60}")
    print(f"  SNKRDUNK PSA 10 최저가 스크래퍼")
    print(f"{'='*60}")
    print(f"  Card Name   : {card_name}")
    print(f"  Pokemon     : {pokemon_name}  (검색 키워드)")
    print(f"  Set         : {set_name}")
    print(f"  Card Number : {card_number}")
    print(f"{'='*60}\n")

    driver = _build_driver(headless=headless)

    try:
        # Step 1: 포켓몬 이름으로 검색
        _search_cards(driver, pokemon_name)

        # Step 2: 정확한 카드 매칭
        card_url = _find_card_link(driver, card_name, set_name, card_number, pokemon_name)
        if not card_url:
            print(f"❌ 카드를 찾지 못했습니다: {card_name}")
            return None

        # Step 3: See More 클릭
        _click_see_more(driver, card_url)

        final_url = driver.current_url

        # Step 4: PSA 10 최저가 추출
        result = _extract_cheapest_psa10(driver)

        if result:
            result['url']          = final_url
            result['card_name']    = card_name
            result['pokemon_name'] = pokemon_name
            result['set_name']     = set_name
            result['card_number']  = card_number

        return result

    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        
        # 디버그 정보 수집
        debug_info = {}
        try:
            debug_info['title'] = driver.title
            debug_info['source_snippet'] = driver.page_source[:200] if driver.page_source else "No source"
            print(f"📄 Page Title: {debug_info['title']}")
        except:
            pass
            
        return {
            'error': str(e),
            'debug_info': debug_info
        }

    finally:
        driver.quit()
        print("👋 브라우저 종료")


# ──────────────────────────────────────────────────────────────
# 직접 실행 테스트
# ──────────────────────────────────────────────────────────────

if __name__ == '__main__':
    # Sylveon Agent 예시 데이터
    TEST_CASES = [
        {
            'card_name':   'GENGAR-HOLO',
            'set_name':    'POKEMON JAPANESE FOSSIL',
            'card_number': '94',
        },
        # 추가 테스트가 필요하면 여기에 추가
        # {
        #     'card_name':   'FA/Gengar VMAX',
        #     'set_name':    'Fusion Strike',
        #     'card_number': '271/264',
        # },
    ]

    for i, tc in enumerate(TEST_CASES, 1):
        print(f"\n{'#'*60}")
        print(f"  테스트 {i}/{len(TEST_CASES)}")
        print(f"{'#'*60}")

        result = get_cheapest_psa10(
            card_name=tc['card_name'],
            set_name=tc['set_name'],
            card_number=tc['card_number'],
            headless=False,   # 테스트 시 브라우저 직접 확인
        )

        if result:
            print(f"\n🎉 결과: {result['card_name']} PSA 10 최저가 = {result['price_str']}")
        else:
            print(f"\n⚠️  결과 없음")


# ──────────────────────────────────────────────────────────────
# Database integration functions
# ──────────────────────────────────────────────────────────────

def init_db():
    """Initialize SQLite database"""
    import sqlite3
    
    conn = sqlite3.connect('snkrdunk.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS card_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_name TEXT NOT NULL,
        psa10_latest_price REAL,
        scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        url TEXT,
        item_count INTEGER
    )
    ''')
    
    conn.commit()
    conn.close()

def save_result_to_db(card_name, price, url, item_count):
    """Save scraping result to database"""
    import sqlite3
    
    conn = sqlite3.connect('snkrdunk.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    INSERT INTO card_prices (card_name, psa10_latest_price, url, item_count)
    VALUES (?, ?, ?, ?)
    ''', (card_name, price, url, item_count))
    
    conn.commit()
    conn.close()

def run_scraper_and_save(card_name, set_name="", card_number=""):
    """Run scraper and save result to database"""
    result = get_cheapest_psa10(card_name, set_name, card_number, headless=True)
    
    if result:
        save_result_to_db(
            card_name=result['card_name'],
            price=result['price'],
            url=result['url'],
            item_count=result['count']
        )
        return True
    return False