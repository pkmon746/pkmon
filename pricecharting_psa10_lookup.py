"""
PriceCharting API - PSA 10 Price Lookup
Retrieves PSA GEM MT 10 graded card prices from PriceCharting API
"""

import requests
from typing import Optional, Dict

def get_psa10_price(card_name: str, set_name: str, card_number: str, api_token: str) -> Optional[Dict]:
    """
    PriceCharting API를 사용하여 PSA 10 (GEM MT) 등급 카드의 가격을 조회합니다.
    
    Args:
        card_name (str): 카드 이름 (예: "GENGAR-HOLO")
        set_name (str): 세트 이름 (예: "POKEMON JAPANESE FOSSIL")
        card_number (str): 카드 번호 (예: "94")
        api_token (str): PriceCharting API 토큰
    
    Returns:
        dict: 가격 정보를 포함한 딕셔너리
            - price_psa10: PSA 10 등급 가격 (manual-only-price)
            - product_name: 제품명
            - console_name: 콘솔/세트 이름
            - graded_price: 일반 등급 가격 (참고용)
        None: 조회 실패 시
    
    Note:
        PriceCharting API에서 트레이딩 카드의 경우:
        - manual-only-price = PSA GEM MT 10 등급 가격
        - graded-price = 일반 등급 카드 가격
    """
    
    # 1. 검색 쿼리 생성: {set_name} {card_name} {card_number}
    # 이 순서가 검색 정확도가 가장 높음
    search_query = f"{set_name} {card_name} {card_number}".strip()
    
    # API 엔드포인트
    api_url = "https://www.pricecharting.com/api/products"
    
    # 요청 파라미터
    params = {
        'q': search_query,
        't': api_token
    }
    
    print(f"🔍 Searching PriceCharting API")
    print(f"   Query: \"{search_query}\"")
    
    try:
        # API 요청
        response = requests.get(api_url, params=params, timeout=10)
        response.raise_for_status()  # HTTP 에러 체크
        
        data = response.json()
        
        # 검색 결과 확인
        if 'products' not in data or len(data['products']) == 0:
            print(f"❌ No products found")
            return None
        
        print(f"✅ Found {len(data['products'])} product(s)")
        
        # 첫 번째 결과 선택 (가장 정확한 매칭)
        product = data['products'][0]
        
        # 필드 추출
        product_name = product.get('product-name', 'Unknown')
        console_name = product.get('console-name', 'Unknown')
        
        # PSA 10 가격 추출 (manual-only-price = PSA GEM MT 10 price)
        manual_only_price = product.get('manual-only-price')
        graded_price = product.get('graded-price')
        
        # 가격 변환
        price_psa10 = float(manual_only_price) if manual_only_price else None
        price_graded = float(graded_price) if graded_price else None
        
        print(f"\n📦 Result:")
        print(f"   Product: {product_name}")
        print(f"   Console: {console_name}")
        print(f"   PSA 10 Price (manual-only-price): ${price_psa10:.2f}" if price_psa10 else "   PSA 10 Price: N/A")
        print(f"   Graded Price: ${price_graded:.2f}" if price_graded else "   Graded Price: N/A")
        
        return {
            'price_psa10': price_psa10,
            'product_name': product_name,
            'console_name': console_name,
            'graded_price': price_graded
        }
        
    except requests.exceptions.RequestException as e:
        print(f"❌ API Error: {e}")
        return None
    except (KeyError, ValueError) as e:
        print(f"❌ Data parsing error: {e}")
        return None


# ============================================================================
# 사용 예시
# ============================================================================

if __name__ == "__main__":
    # API 토큰 설정
    API_TOKEN = "e8b39b271ff62d9572736d3a6e8e8050edb53704"
    
    # 테스트 카드 정보
    test_card = {
        'card_name': 'GENGAR-HOLO',
        'set_name': 'POKEMON JAPANESE FOSSIL',
        'card_number': '94'
    }
    
    print("=" * 60)
    print("PriceCharting PSA 10 Price Lookup Test")
    print("=" * 60)
    print()
    
    # PSA 10 가격 조회
    result = get_psa10_price(
        card_name=test_card['card_name'],
        set_name=test_card['set_name'],
        card_number=test_card['card_number'],
        api_token=API_TOKEN
    )
    
    print("\n" + "=" * 60)
    
    if result:
        print("✅ Success!")
        print(f"\nPSA 10 Price: ${result['price_psa10']:,.2f}" if result['price_psa10'] else "PSA 10 Price: N/A")
        print(f"Product: {result['product_name']}")
        print(f"Set: {result['console_name']}")
    else:
        print("❌ Failed to retrieve price")
    
    print("=" * 60)
