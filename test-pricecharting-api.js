// PriceCharting API Search Test
// Tests searching for Pokemon cards and extracting PSA 10 prices

const fetch = require('node-fetch');

const API_TOKEN = 'e8b39b271ff62d9572736d3a6e8e8050edb53704';
const API_BASE = 'https://www.pricecharting.com/api';

async function searchPriceCharting(setName, cardName, cardNumber) {
    // Build search query: "Set CardName CardNumber"
    const query = `${setName} ${cardName} ${cardNumber}`.trim();

    console.log(`\n🔍 Searching PriceCharting API`);
    console.log(`Query: "${query}"`);
    console.log(`Expected console-name: "${setName}"`);
    console.log(`─────────────────────────────────────\n`);

    try {
        const url = `${API_BASE}/products?q=${encodeURIComponent(query)}&t=${API_TOKEN}`;
        console.log(`API URL: ${url}\n`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();
        console.log(`📦 Response received:`);
        console.log(`Total products found: ${data.products ? data.products.length : 0}\n`);

        if (!data.products || data.products.length === 0) {
            console.log('⚠️ No products found');
            return null;
        }

        // Show all results with full data
        console.log(`All search results:\n`);
        data.products.forEach((product, idx) => {
            console.log(`${idx + 1}. Product: ${product['product-name']}`);
            console.log(`   Console: "${product['console-name']}"`);
            console.log(`   Graded: $${product['graded-price'] || 'N/A'}`);
            console.log(`   PSA 10 (manual-only): $${product['manual-only-price'] || 'N/A'}`);
            console.log(`   ID: ${product.id}\n`);
        });

        // Filter by console-name (case insensitive)
        const setNameLower = setName.toLowerCase();
        const matchingProducts = data.products.filter(p =>
            p['console-name'] && p['console-name'].toLowerCase().includes(setNameLower)
        );

        console.log(`Filtered by console-name containing "${setName}": ${matchingProducts.length} matches\n`);

        if (matchingProducts.length === 0) {
            console.log(`WARNING: No exact match, using first result anyway for testing\n`);
            const product = data.products[0];
            const psa10_price = product['manual-only-price'];

            console.log(`RESULT:`);
            console.log(`Product: ${product['product-name']}`);
            console.log(`PSA 10 Price: $${psa10_price || 'N/A'}\n`);

            return {
                productName: product['product-name'],
                consoleName: product['console-name'],
                psa10Price: psa10_price ? parseFloat(psa10_price) : null
            };
        }

        // Use first match
        const product = matchingProducts[0];
        const psa10_price = product['manual-only-price'];

        console.log(`RESULT:`);
        console.log(`Product: ${product['product-name']}`);
        console.log(`Console: ${product['console-name']}`);
        console.log(`PSA 10 Price: $${psa10_price || 'N/A'}\n`);

        return {
            productName: product['product-name'],
            consoleName: product['console-name'],
            psa10Price: psa10_price ? parseFloat(psa10_price) : null
        };

    } catch (error) {
        console.error(`❌ Error:`, error.message);
        return null;
    }
}

// Test with example card
const testCard = {
    set: 'Pokemon Japanese Fossil',
    name: 'Gengar',
    number: '94'
};

console.log(`\n${'='.repeat(50)}`);
console.log(`Testing PriceCharting API Search`);
console.log(`${'='.repeat(50)}`);

searchPriceCharting(testCard.set, testCard.name, testCard.number)
    .then(result => {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Final Result:`);
        console.log(JSON.stringify(result, null, 2));
        console.log(`${'='.repeat(50)}\n`);
    });
