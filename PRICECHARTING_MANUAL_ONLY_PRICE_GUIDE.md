# PriceCharting API - manual-only-price 매핑 가이드

## 중요: 카테고리별 의미 차이

PriceCharting API/CSV에서 `manual-only-price` 필드의 의미는 **카테고리에 따라 다릅니다**:

### 📦 비디오 게임 카테고리
- `manual-only-price` = 게임 매뉴얼(설명서)만의 가격
- 예: 박스 없이 매뉴얼만 판매할 때의 가격

### 🃏 카드 카테고리 (Pokemon, Sports Cards 등)
- `manual-only-price` = **PSA 10 등급 카드의 가격**
- 이것이 우리가 사용하는 값!

---

## ✅ PKMONAD 구현

### 변수 매핑
```javascript
// PriceCharting CSV 컬럼 구조
const headers = [
  'id',                    // 0
  'console-name',          // 1  - 카드 시리즈 (Pokemon 2000 Topps Chrome)
  'product-name',          // 2  - 카드 이름 (Gengar #94)
  'loose-price',           // 3  - 낱장 가격
  'cib-price',             // 4  - Complete in Box
  'new-price',             // 5  - 새 제품 가격
  'graded-price',          // 6  - 일반 등급 가격
  'box-only-price',        // 7  - 박스만
  'manual-only-price',     // 8  - ⭐ PSA 10 가격 (카드 카테고리)
  'bgs-10-price',          // 9  - BGS 10 가격
  ...
];
```

### 코드 구현
```javascript
// 1. PSA 10 컬럼 인덱스 찾기
const psa10Idx = headers.findIndex(h => h === 'manual-only-price');
// Result: psa10Idx = 8

// 2. 카드가 PSA 10일 때 해당 가격 사용
if (cardGrade && cardGrade.includes('10') && psa10Idx >= 0) {
    const manual_only_price_str = cols[psa10Idx];
    const psa10_price = parseFloat(manual_only_price_str.replace(/[^0-9.]/g, ''));
    
    if (psa10_price > 0) {
        // psa10_price 사용!
        price = psa10_price;
        source = 'PSA10';
    }
}

// 3. 폴백: PSA 10 가격 없으면 일반 graded-price 사용
if (price === 0) {
    const graded_price = parseFloat(cols[gradedPriceIdx].replace(/[^0-9.]/g, ''));
    price = graded_price;
    source = 'graded';
}
```

---

## 📊 실제 예시

### CSV 데이터
```csv
id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price
12345,Pokemon 2000 Topps Chrome,Gengar #94,$10.00,$20.00,$50.00,$250.00,,$580.00,$600.00
```

### 매핑 결과
- `product-name` → "Gengar #94"
- `graded-price` → $250.00 (일반 등급 가격)
- `manual-only-price` → $580.00 (⭐ PSA 10 가격)
- `psa10_price` 변수 = **580.00**

---

## 🎯 사용 시나리오

### 시나리오 1: PSA GEM MT 10 카드
```javascript
cardInfo = {
  cardName: "GENGAR-HOLO",
  grade: "GEM MT 10"
}

Result:
✅ psa10_price = $580 (manual-only-price 사용)
✅ source = "PSA10"
```

### 시나리오 2: PSA 9 카드
```javascript
cardInfo = {
  cardName: "GENGAR-HOLO",
  grade: "MINT 9"
}

Result:
⚠️ psa10_price 사용 안함 (등급이 10이 아님)
✅ graded_price = $250 (일반 graded-price 사용)
✅ source = "graded"
```

---

## 🔍 디버그 로그

터미널에서 확인 가능한 로그:
```
[CSV Parse] Columns: product-name: 2 graded: 6 psa10 (manual-only): 8
[CSV Parse] Searching: gengar | Grade: GEM MT 10 | Will use PSA 10 (manual-only-price)
[CSV Parse] Using PSA 10 price (manual-only-price): $580
[CSV Parse] ✓ Gengar #94 @ $580 (PSA10)
✅ Final: Gengar #94 $580 (PSA10)
```

---

## ⚠️ 주의사항

1. **카테고리 확인 필수**
   - 비디오 게임: `manual-only-price` = 매뉴얼 가격 ❌
   - 카드: `manual-only-price` = PSA 10 가격 ✅

2. **등급 확인**
   - PSA 10이 아닌 카드는 `graded-price` 사용
   - `manual-only-price`는 PSA 10 전용

3. **데이터 없을 수 있음**
   - `manual-only-price`가 비어있으면 `graded-price` 폴백
   - 항상 폴백 로직 필요

---

## ✅ 최종 확인

- [x] `manual-only-price` = PSA 10 가격 (카드 카테고리)
- [x] `psa10_price` 변수로 매핑
- [x] PSA 10 등급 확인 로직
- [x] 폴백 로직 (`graded-price`)
- [x] 디버그 로깅

**구현 완료!** 🎉
