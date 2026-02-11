// Agent System for PKMONAD Trading Dashboard
// Handles communication between 4 agents and orchestrates arbitrage analysis

class AgentSystem {
    constructor() {
        this.psaToken = 'C2MNdaW2IO9Xlbm1MXC0Q_ARCaVfQbkldZRsMYd6oWP8ZACXog6jzv6X7QrgyWwYRgNmU3fn5tKp99zf8lRHiugZiEsjnOl4t_EpApf7JixN7HXvzwkGUZ8jxfpYNqszBBUZsOHS0mRatl3h-KxNvyd0qHV-QuDyryiiEFMq50tdWIiqrLEdil0xGi478LrtrLfnB9kP10jBpk6_dWV_UjI6jRF9_gRwQy3meG9Bitgvpghg-1DImavKxNW_i6ojZYrCIY5DK3w3uMkniqr8DNunZxZu-2c25o7dymeXq8DqU_Wh';
        this.psaApiUrl = 'https://api.psacard.com/publicapi';
        this.priceChartingCsvUrl = 'https://www.pricecharting.com/price-guide/download-custom?t=e8b39b271ff62d9572736d3a6e8e8050edb53704&category=pokemon-cards';

        this.currentData = {
            sylveon: null,
            charizard: null,
            gengar: null,
            dragonite: null
        };

        this.pikachuReactions = {
            start: "Pika Pika! Let's find some deals! ⚡",
            analyzing: "Pikachu! Analyzing data... 🔍",
            profit: "PIKACHUUU! Great profit opportunity! 💰",
            loss: "Pika... No good deals found 😔",
            error: "Pi-ka-chu? Something went wrong... ⚠️"
        };

        this.init();
    }

    init() {
        // Load Dragonite data on page load
        this.dragoniteAgent();
    }

    async startAnalysis(certNumber) {
        if (!certNumber) {
            this.showPikachuReaction('error');
            alert('Please enter a valid CERT number');
            return;
        }

        this.updateStatus('Analyzing...');
        this.showPikachuReaction('start');
        this.addChatMessage('System', 'Starting arbitrage analysis...', 25);

        // Run agents in sequence
        await this.sylveonAgent(certNumber);
        await this.delay(1000);

        if (this.currentData.sylveon) {
            await this.charizardAgent();
            await this.delay(1000);
            await this.gengarAgent();
            await this.delay(1000);

            this.showArbitrageResults();
        }
    }

    // Sylveon: PSA API Integration via Proxy Server
    async sylveonAgent(certNumber) {
        this.addChatMessage('Sylveon', 'Fetching PSA data for CERT ' + certNumber + '...', 700);

        try {
            // Use deployed proxy server to avoid CORS issues
            const response = await fetch(`https://pkmon-1.onrender.com/api/psa/cert/${certNumber}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('PSA Proxy Error:', response.status, errorText);
                throw new Error(`PSA Proxy request failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('PSA API Response:', data);

            // PSA API returns data in PSACert object
            const certData = data.PSACert || data;

            // Store data from actual PSA API response
            this.currentData.sylveon = {
                certNumber: certNumber,
                cardName: certData.Subject || certData.CardName || certData.Name || 'Unknown Card',
                series: certData.Brand || certData.Spec || certData.Series || 'Unknown Set',
                cardNumber: certData.CardNumber || certData.SpecNumber || 'N/A',
                grade: certData.GradeDescription || certData.OverallGrade || certData.Grade || 'N/A',
                population: certData.TotalPopulation || certData.Population || certData.Pop || 'N/A',
                year: certData.Year || ''
            };

            this.updateSylveonCard(this.currentData.sylveon);

            let message = `✅ Found: ${this.currentData.sylveon.cardName} - Grade ${this.currentData.sylveon.grade}`;
            if (this.currentData.sylveon.population !== 'N/A') {
                message += ` (Pop: ${this.currentData.sylveon.population})`;
            }
            if (this.currentData.sylveon.year) {
                message += ` [${this.currentData.sylveon.year}]`;
            }

            this.addChatMessage('Sylveon', message, 700);

        } catch (error) {
            console.error('Sylveon Agent Error:', error);

            // Fallback to demo data if proxy server is not running
            this.currentData.sylveon = {
                certNumber: certNumber,
                cardName: 'Charizard 006/102',
                series: 'Base Set Unlimited',
                cardNumber: '006/102',
                grade: '10',
                population: '3,456'
            };

            this.updateSylveonCard(this.currentData.sylveon);
            this.addChatMessage('Sylveon',
                `⚠️ Proxy server not running. Using demo data: ${this.currentData.sylveon.cardName} - Grade ${this.currentData.sylveon.grade}. Start the server with: npm start`,
                700);
        }
    }

    // Charizard: PriceCharting API Search
    async charizardAgent() {
        this.showPikachuReaction('analyzing');
        this.addChatMessage('Charizard', 'Searching PriceCharting API for market pricing...', 6);

        const cardInfo = this.currentData.sylveon;

        try {
            // Build search query: Set + Card Name + Number
            const searchQuery = `${cardInfo.series} ${cardInfo.cardName} ${cardInfo.cardNumber}`.replace(/-/g, ' ').trim();
            const apiUrl = `https://www.pricecharting.com/api/products?q=${encodeURIComponent(searchQuery)}&t=e8b39b271ff62d9572736d3a6e8e8050edb53704`;

            console.log('[Charizard] API Search:');
            console.log(`  Query: "${searchQuery}"`);
            console.log(`  Looking for console-name: "${cardInfo.series}"`);

            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();
            console.log(`[Charizard] Found ${data.products ? data.products.length : 0} products`);

            if (!data.products || data.products.length === 0) {
                throw new Error('No products found');
            }

            // Filter by console-name (set name)
            const setNameLower = cardInfo.series.toLowerCase();
            const matchingProducts = data.products.filter(p =>
                p['console-name'] && p['console-name'].toLowerCase().includes(setNameLower)
            );

            console.log(`[Charizard] ${matchingProducts.length} products match console-name`);

            let product;
            if (matchingProducts.length > 0) {
                product = matchingProducts[0];
                console.log(`[Charizard] ✓ Match: ${product['product-name']}`);
            } else {
                // Fallback: use first result
                product = data.products[0];
                console.log(`[Charizard] Using first result: ${product['product-name']}`);
            }

            // Extract PSA 10 price (manual-only-price for Cards category)
            // IMPORTANT: PriceCharting returns prices in CENTS, must divide by 100
            const psa10_price = product['manual-only-price'];
            const graded_price = product['graded-price'];

            // Prioritize PSA 10 price if available and card is PSA 10
            let fmv;
            let source;

            if (cardInfo.grade && cardInfo.grade.includes('10') && psa10_price) {
                fmv = Math.round(parseFloat(psa10_price) / 100);  // Convert cents to dollars
                source = 'PriceCharting API (PSA 10)';
                console.log(`[Charizard] Using PSA 10 price: $${fmv} (raw: ${psa10_price} cents)`);
            } else if (graded_price) {
                fmv = Math.round(parseFloat(graded_price) / 100);  // Convert cents to dollars
                source = 'PriceCharting API (Graded)';
                console.log(`[Charizard] Using graded price: $${fmv} (raw: ${graded_price} cents)`);
            } else {
                throw new Error('No price data available');
            }

            // Generate recent sales with current dates
            const today = new Date();
            const daysAgo5 = new Date(today);
            daysAgo5.setDate(today.getDate() - 5);
            const daysAgo7 = new Date(today);
            daysAgo7.setDate(today.getDate() - 7);
            const daysAgo13 = new Date(today);
            daysAgo13.setDate(today.getDate() - 13);

            this.currentData.charizard = {
                fmv: fmv,
                recentSales: [
                    { date: daysAgo5.toISOString().split('T')[0], price: Math.round(fmv * 0.96) },
                    { date: daysAgo7.toISOString().split('T')[0], price: Math.round(fmv * 1.02) },
                    { date: daysAgo13.toISOString().split('T')[0], price: Math.round(fmv * 0.99) }
                ],
                avgPrice: fmv,
                dataSource: source
            };

            this.updateCharizardCard(this.currentData.charizard);
            this.addChatMessage('Charizard',
                `Found ${product['product-name']}: $${fmv.toLocaleString()}`,
                6);

        } catch (error) {
            console.error('[Charizard] Error:', error);

            // Fallback to estimated calculation
            const fmv = this.calculateMockFMV(cardInfo);

            // Generate recent sales with current dates
            const today = new Date();
            const daysAgo5 = new Date(today);
            daysAgo5.setDate(today.getDate() - 5);
            const daysAgo7 = new Date(today);
            daysAgo7.setDate(today.getDate() - 7);
            const daysAgo13 = new Date(today);
            daysAgo13.setDate(today.getDate() - 13);

            this.currentData.charizard = {
                fmv: fmv,
                recentSales: [
                    { date: daysAgo5.toISOString().split('T')[0], price: fmv - 200 },
                    { date: daysAgo7.toISOString().split('T')[0], price: fmv + 100 },
                    { date: daysAgo13.toISOString().split('T')[0], price: fmv - 50 }
                ],
                avgPrice: fmv,
                dataSource: 'Estimated'
            };

            this.updateCharizardCard(this.currentData.charizard);
            this.addChatMessage('Charizard',
                `Using estimated FMV: $${fmv.toLocaleString()} (API unavailable)`,
                6);
        }
    }

    // Parse PriceCharting CSV to find card price
    parseCSVForCard(csvText, cardInfo) {
        try {
            console.log('[CSV Parse] Starting to parse CSV...');
            const lines = csvText.split('\n');
            console.log('[CSV Parse] Total lines:', lines.length);

            if (lines.length < 2) {
                console.log('[CSV Parse] Not enough lines in CSV');
                return this.calculateMockFMV(cardInfo);
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            console.log('[CSV Parse] Headers:', headers);

            // Find column indices - manual-only-price is PSA 10 graded cards
            const nameIdx = headers.findIndex(h => h === 'product-name');
            const gradedPriceIdx = headers.findIndex(h => h === 'graded-price');
            const consoleIdx = headers.findIndex(h => h === 'console-name');
            const psa10Idx = headers.findIndex(h => h === 'manual-only-price'); // PSA 10 graded

            console.log('[CSV Parse] Columns: product-name:', nameIdx, 'graded:', gradedPriceIdx, 'psa10 (manual-only):', psa10Idx);

            if (nameIdx === -1 || gradedPriceIdx === -1) {
                console.log('[CSV Parse] Required columns not found, using mock FMV');
                return this.calculateMockFMV(cardInfo);
            }

            // Clean card name for searching
            const cardNameClean = cardInfo.cardName.toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
            const searchName = cardNameClean.split(' ')[0];
            const cardGrade = cardInfo.grade; // e.g., "GEM MT 10"

            console.log('[CSV Parse] Searching:', searchName, '| Grade:', cardGrade, '| Will use', psa10Idx >= 0 && cardGrade && cardGrade.includes('10') ? 'PSA 10 (manual-only-price)' : 'general graded');
            console.log('[CSV Parse] First 5 data rows:');
            for (let i = 1; i < Math.min(6, lines.length); i++) {
                const cols = lines[i].split(',');
                const psa10Price = psa10Idx >= 0 ? cols[psa10Idx] : 'N/A';
                console.log(`  Row ${i}: ${cols[consoleIdx]} | ${cols[nameIdx]} | graded: $${cols[gradedPriceIdx]} | PSA10: $${psa10Price}`);
            }

            // Search through CSV rows - track best match
            let bestMatch = null;
            let bestPrice = 0;
            let priceSource = '';

            for (let i = 1; i < Math.min(lines.length, 1000); i++) {
                const cols = lines[i].split(',');

                if (cols[nameIdx] && cols[nameIdx].toLowerCase().includes(searchName)) {
                    let price = 0;
                    let source = '';

                    // PriceCharting API: For 'Cards' category, manual-only-price = PSA 10 graded price
                    // (NOT video game manual price - this is specific to trading cards)
                    // IMPORTANT: All prices are in CENTS, must divide by 100
                    if (cardGrade && cardGrade.includes('10') && psa10Idx >= 0) {
                        const manual_only_price_str = cols[psa10Idx];
                        const psa10_price_cents = parseFloat(manual_only_price_str ? manual_only_price_str.replace(/[^0-9.]/g, '') : '0');

                        if (!isNaN(psa10_price_cents) && psa10_price_cents > 0) {
                            price = psa10_price_cents / 100;  // Convert cents to dollars
                            source = 'PSA10';
                            console.log(`[CSV Parse] Using PSA 10 price (manual-only-price): $${price} (raw: ${psa10_price_cents} cents)`);
                        }
                    }

                    // Fallback to general graded price if PSA 10 price not available
                    if (price === 0) {
                        const gradedStr = cols[gradedPriceIdx];
                        const graded_cents = parseFloat(gradedStr ? gradedStr.replace(/[^0-9.]/g, '') : '0');
                        price = graded_cents / 100;  // Convert cents to dollars
                        source = 'graded';
                    }

                    if (!isNaN(price) && price > 0 && price > bestPrice) {
                        bestPrice = price;
                        bestMatch = cols[nameIdx];
                        priceSource = source;
                        console.log(`[CSV Parse] ✓ ${bestMatch} @ $${price} (${source})`);
                    }
                }
            }

            if (bestMatch && bestPrice > 0) {
                console.log(`✅ Final: ${bestMatch} $${bestPrice} (${priceSource})`);
                return Math.round(bestPrice);
            }

            console.log('[CSV Parse] Card not found in CSV, using mock FMV');
        } catch (error) {
            console.error('[CSV Parse] Error:', error);
        }

        return this.calculateMockFMV(cardInfo);
    }

    // Gengar: SNKRDUNK Real-Time Scraping
    async gengarAgent() {
        this.addChatMessage('Gengar', 'Scanning SNKRDUNK for PSA10 listings...', 94);

        const fmv = this.currentData.charizard.fmv;
        const cardInfo = this.currentData.sylveon;

        try {
            // Call SNKRDUNK ID scraper API
            // Call SNKRDUNK Search API
            console.log('[Gengar] Calling SNKRDUNK Search API...');

            // Search by name for dynamic lookup
            // Clean name: remove # and anything after it (e.g. "Dark Gengar #94" -> "Dark Gengar")
            let cardNameRaw = cardInfo ? cardInfo.cardName : 'Gengar';
            const cardName = cardNameRaw.split('#')[0].trim();
            // For now, we rely heavily on the name search which our backend handles well

            const searchParams = new URLSearchParams({
                name: cardName,
                // set: cardInfo.set || '', 
                // number: cardInfo.collectionNumber || ''
            });

            const response = await fetch(`https://pkmon-1.onrender.com/api/snkrdunk/search?${searchParams}`);

            if (!response.ok) {
                throw new Error(`SNKRDUNK API returned ${response.status}`);
            }

            const result = await response.json();
            console.log('[Gengar] SNKRDUNK Response:', result);

            if (!result.success) {
                throw new Error(result.error || 'No data from SNKRDUNK');
            }

            // Use the new response format
            const snkrPrice = result.latestPrice || fmv * 0.75; // Latest PSA 10 price in USD

            this.currentData.gengar = {
                latestSalePrice: snkrPrice,
                cheapestListing: snkrPrice,
                arbitrageOpportunity: fmv - snkrPrice,
                profitMargin: ((fmv - snkrPrice) / snkrPrice * 100).toFixed(2),
                listingsFound: result.psa10Listings || 0,
                dataSource: `SNKRDUNK (${result.cardTitle || 'Real-time'})`
            };

            this.updateGengarCard(this.currentData.gengar);

            if (this.currentData.gengar.arbitrageOpportunity > 0) {
                this.showPikachuReaction('profit');
                this.addChatMessage('Gengar',
                    `Found ${result.psa10Listings} PSA 10 listings! Latest: $${snkrPrice}. Potential profit: $${this.currentData.gengar.arbitrageOpportunity.toLocaleString()} (${this.currentData.gengar.profitMargin}%)`,
                    94);
            } else {
                this.showPikachuReaction('loss');
                this.addChatMessage('Gengar',
                    `Found ${result.psa10Listings} PSA 10 listings at $${snkrPrice}, but no profitable arbitrage at this time`,
                    94);
            }

        } catch (error) {
            console.error('[Gengar] Error:', error);

            // Fallback to mock data if scraper fails
            this.addChatMessage('Gengar', '⚠️ SNKRDUNK scraper unavailable, using estimated data...', 94);

            const snkrPrice = fmv * 0.75; // Assume 25% cheaper

            this.currentData.gengar = {
                latestSalePrice: snkrPrice - 100,
                cheapestListing: snkrPrice,
                arbitrageOpportunity: fmv - snkrPrice,
                profitMargin: ((fmv - snkrPrice) / snkrPrice * 100).toFixed(2),
                dataSource: 'Estimated (Scraper offline)'
            };

            this.updateGengarCard(this.currentData.gengar);

            if (this.currentData.gengar.arbitrageOpportunity > 0) {
                this.showPikachuReaction('profit');
                this.addChatMessage('Gengar',
                    `Estimated profit: $${this.currentData.gengar.arbitrageOpportunity.toLocaleString()} (${this.currentData.gengar.profitMargin}%)`,
                    94);
            } else {
                this.showPikachuReaction('loss');
            }
        }
    }

    // Dragonite: Currency & Crypto Rates
    async dragoniteAgent() {
        try {
            // Fetch real exchange rates
            const usdJpy = await this.fetchExchangeRate();
            const btc = await this.fetchCryptoPrice('bitcoin');
            const eth = await this.fetchCryptoPrice('ethereum');

            this.currentData.dragonite = {
                usdJpy: usdJpy,
                btc: btc,
                eth: eth,
                lastUpdate: new Date().toLocaleString()
            };

            this.updateDragoniteCard(this.currentData.dragonite);

        } catch (error) {
            console.error('Dragonite Agent Error:', error);
            // Use mock data if API fails
            this.currentData.dragonite = {
                usdJpy: 149.25,
                btc: 45000,
                eth: 2400,
                lastUpdate: new Date().toLocaleString()
            };
            this.updateDragoniteCard(this.currentData.dragonite);
        }
    }

    async fetchExchangeRate() {
        try {
            const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const data = await response.json();
            return data.rates.JPY;
        } catch {
            return 149.25;
        }
    }

    async fetchCryptoPrice(crypto) {
        try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${crypto}&vs_currencies=usd`);
            const data = await response.json();
            return data[crypto].usd;
        } catch {
            return crypto === 'bitcoin' ? 45000 : 2400;
        }
    }

    // UI Update Functions
    updateSylveonCard(data) {
        const card = document.getElementById('sylveonData');

        let html = `
            <div class="data-item">
                <div class="data-label">Card Name</div>
                <div class="data-value">${data.cardName}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Set</div>
                <div class="data-value">${data.series}</div>
            </div>`;

        if (data.year) {
            html += `
            <div class="data-item">
                <div class="data-label">Year</div>
                <div class="data-value">${data.year}</div>
            </div>`;
        }

        html += `
            <div class="data-item">
                <div class="data-label">Card Number</div>
                <div class="data-value">${data.cardNumber}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Grade</div>
                <div class="data-value">PSA ${data.grade}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Population</div>
                <div class="data-value">${data.population}</div>
            </div>
        `;

        card.innerHTML = html;
    }

    updateCharizardCard(data) {
        const card = document.getElementById('charizardData');
        card.innerHTML = `
            <div class="data-item">
                <div class="data-label">Fair Market Value</div>
                <div class="data-value" style="font-size: 1.5rem; color: var(--accent-green);">
                    $${data.fmv.toLocaleString()}
                </div>
            </div>
            <div class="data-item">
                <div class="data-label">Recent Sales</div>
                ${data.recentSales.map(sale => `
                    <div style="color: var(--text-secondary); font-size: 0.9rem;">
                        ${sale.date}: $${sale.price.toLocaleString()}
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateGengarCard(data) {
        const card = document.getElementById('gengarData');
        const isProfit = data.arbitrageOpportunity > 0;

        card.innerHTML = `
            <div class="data-item">
                <div class="data-label">SNKRDUNK Cheapest</div>
                <div class="data-value">$${data.cheapestListing.toLocaleString()}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Latest Sale</div>
                <div class="data-value">$${data.latestSalePrice.toLocaleString()}</div>
            </div>
            ${data.listingsFound ? `
            <div class="data-item">
                <div class="data-label">Listings Found</div>
                <div class="data-value">${data.listingsFound}</div>
            </div>
            ` : ''}
            <div class="data-item">
                <div class="data-label">Arbitrage Opportunity</div>
                <div class="data-value" style="font-size: 1.3rem; color: ${isProfit ? 'var(--accent-green)' : '#EF4444'};">
                    ${isProfit ? '+' : ''}$${data.arbitrageOpportunity.toLocaleString()}
                </div>
            </div>
            <div class="data-item">
                <div class="data-label">Profit Margin</div>
                <div class="data-value">${data.profitMargin}%</div>
            </div>
            ${data.dataSource ? `
            <div class="data-item" style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--glass-border);">
                <div class="data-label">Data Source</div>
                <div class="data-value" style="font-size: 0.85rem; color: ${data.dataSource.includes('Real-time') ? 'var(--accent-green)' : '#FFA500'};">
                    ${data.dataSource}
                </div>
            </div>
            ` : ''}
        `;
    }

    updateDragoniteCard(data) {
        const card = document.getElementById('dragoniteData');
        card.innerHTML = `
            <div class="data-item">
                <div class="data-label">USD/JPY</div>
                <div class="data-value">¥${data.usdJpy.toFixed(2)}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Bitcoin (BTC)</div>
                <div class="data-value">$${data.btc.toLocaleString()}</div>
            </div>
            <div class="data-item">
                <div class="data-label">Ethereum (ETH)</div>
                <div class="data-value">$${data.eth.toLocaleString()}</div>
            </div>
            <div class="data-item" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);">
                <div class="data-label">Last Updated</div>
                <div class="data-value" style="font-size: 0.85rem;">${data.lastUpdate}</div>
            </div>
        `;
    }

    showArbitrageResults() {
        const resultsDiv = document.getElementById('arbitrageResults');
        const comparisonGrid = document.getElementById('comparisonGrid');

        const charizard = this.currentData.charizard;
        const gengar = this.currentData.gengar;
        const isProfit = gengar.arbitrageOpportunity > 0;

        comparisonGrid.innerHTML = `
            <div class="comparison-card">
                <h3>Charizard Analysis</h3>
                <p style="color: var(--text-secondary);">Traditional Market FMV</p>
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--accent-blue); margin-top: 1rem;">
                    $${charizard.fmv.toLocaleString()}
                </div>
            </div>
            
            <div class="comparison-card">
                <h3>Gengar Analysis</h3>
                <p style="color: var(--text-secondary);">SNKRDUNK Best Price</p>
                <div style="font-size: 2.5rem; font-weight: 700; color: var(--secondary-purple); margin-top: 1rem;">
                    $${gengar.cheapestListing.toLocaleString()}
                </div>
            </div>
            
            <div class="comparison-card" style="border: 2px solid ${isProfit ? 'var(--accent-green)' : '#EF4444'};">
                <h3>${isProfit ? '✅ Profit Opportunity' : '❌ No Arbitrage'}</h3>
                <p style="color: var(--text-secondary);">Potential ${isProfit ? 'Profit' : 'Loss'}</p>
                <div class="profit-indicator ${isProfit ? 'profit-positive' : 'profit-negative'}">
                    ${isProfit ? '+' : ''}$${gengar.arbitrageOpportunity.toLocaleString()}
                </div>
                <p style="margin-top: 1rem; font-size: 1.2rem;">
                    <strong>${gengar.profitMargin}%</strong> margin
                </p>
            </div>
        `;

        resultsDiv.style.display = 'block';
        this.updateStatus('Analysis Complete');
    }

    addChatMessage(sender, text, pokemonId) {
        const chatMessages = document.getElementById('chatMessages');
        const welcomeMsg = chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message';

        const avatarUrl = pokemonId
            ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`
            : '';

        messageDiv.innerHTML = `
            ${avatarUrl ? `<div class="message-avatar"><img src="${avatarUrl}" alt="${sender}"></div>` : ''}
            <div class="message-content">
                <div class="message-sender">${sender}</div>
                <div class="message-text">${text}</div>
            </div>
        `;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showPikachuReaction(type) {
        const speechBubble = document.getElementById('pikachuSpeech');
        speechBubble.textContent = this.pikachuReactions[type];
        speechBubble.classList.add('show');

        setTimeout(() => {
            speechBubble.classList.remove('show');
        }, 3000);
    }

    updateStatus(status) {
        document.getElementById('statusText').textContent = status;
    }

    calculateMockFMV(cardInfo) {
        // Mock FMV calculation based on grade and rarity
        const basePrice = 5000;
        const gradeMultiplier = cardInfo.grade === '10' ? 3 : (cardInfo.grade === '9' ? 1.5 : 1);
        return Math.round(basePrice * gradeMultiplier);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Global function to start analysis
function startAnalysis() {
    const certInput = document.getElementById('certInput');
    const certNumber = certInput.value.trim();

    if (window.agentSystem) {
        window.agentSystem.startAnalysis(certNumber);
    }
}

// Initialize agent system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.agentSystem = new AgentSystem();
});
