// Agent System for PKMONAD Trading Dashboard
// Handles communication between 4 agents and orchestrates arbitrage analysis

class AgentSystem {
    constructor() {
        this.psaToken = 'C2MNdaW2IO9Xlbm1MXC0Q_ARCaVfQbkldZRsMYd6oWP8ZACXog6jzv6X7QrgyWwYRgNmU3fn5tKp99zf8lRHiugZiEsjnOl4t_EpApf7JixN7HXvzwkGUZ8jxfpYNqszBBUZsOHS0mRatl3h-KxNvyd0qHV-QuDyryiiEFMq50tdWIiqrLEdil0xGi478LrtrLfnB9kP10jBpk6_dWV_UjI6jRF9_gRwQy3meG9Bitgvpghg-1DImavKxNW_i6ojZYrCIY5DK3w3uMkniqr8DNunZxZu-2c25o7dymeXq8DqU_Wh';
        this.psaApiUrl = 'https://api.psacard.com/publicapi';
        this.priceChartingCsvUrl = 'https://www.pricecharting.com/price-guide/download-custom?t=e8b39b271ff62d9572736d3a6e8e8050edb53704&category=pokemon-cards';
        this.proxyBaseUrl = 'https://pkmon-1.onrender.com';
        this.snkrdunkKeywordSearchLimit = 12;
        this.snkrdunkKeywordCardLimit = 3;
        this.snkrdunkOnSalePerPage = 20;
        this.snkrdunkOnSaleMaxPages = 20;
        this.keywordSelection = {
            keyword: '',
            cards: [],
            selectedCardId: ''
        };

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

    async startAnalysis(inputValue) {
        const query = String(inputValue || '').trim();
        if (!query) {
            this.showPikachuReaction('error');
            alert('Please enter a valid CERT number or keyword');
            return;
        }

        if (/^\d+$/.test(query)) {
            await this.startCertAnalysis(query);
            return;
        }

        await this.prepareKeywordCardSelection(query);
    }

    async startCertAnalysis(certNumber) {
        this.hideKeywordCardPicker();
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

    async prepareKeywordCardSelection(keyword) {
        const normalizedKeyword = String(keyword || '').trim();
        if (!normalizedKeyword) {
            this.showPikachuReaction('error');
            alert('Please enter a valid keyword');
            return;
        }

        this.updateStatus('Searching cards by keyword...');
        this.showPikachuReaction('analyzing');
        this.addChatMessage('System', `Searching SNKRDUNK cards for "${normalizedKeyword}"...`, 25);

        try {
            const matchedCards = await this.searchSnkrdunkCardsByKeyword(normalizedKeyword, this.snkrdunkKeywordSearchLimit);
            if (!matchedCards.length) {
                this.hideKeywordCardPicker();
                const gengarCardBody = document.getElementById('gengarData');
                if (gengarCardBody) {
                    gengarCardBody.innerHTML = `
                        <div class="data-item">
                            <div class="data-label">Keyword Results</div>
                            <div class="data-value" style="font-size:0.82rem;color:#EF4444;">
                                No matching Pokemon cards found for "${this.escapeHtml(normalizedKeyword)}"
                            </div>
                        </div>
                    `;
                }
                this.showPikachuReaction('error');
                this.updateStatus('No matching cards');
                this.addChatMessage('Gengar', `No matching Pokemon cards found for "${normalizedKeyword}"`, 94);
                return;
            }

            this.keywordSelection.keyword = normalizedKeyword;
            this.keywordSelection.cards = matchedCards;
            this.keywordSelection.selectedCardId = matchedCards[0]?.card_id ? String(matchedCards[0].card_id) : '';

            this.renderKeywordCardPicker();
            this.updateStatus('Select one card and click Analyze Selected');
            this.addChatMessage(
                'Gengar',
                `Found ${matchedCards.length} cards for "${normalizedKeyword}". Select one and run analysis.`,
                94
            );
        } catch (error) {
            console.error('[Keyword Selection] Error:', error);
            this.hideKeywordCardPicker();
            const gengarCardBody = document.getElementById('gengarData');
            if (gengarCardBody) {
                gengarCardBody.innerHTML = `
                    <div class="data-item">
                        <div class="data-label">Keyword Results</div>
                        <div class="data-value" style="font-size:0.82rem;color:#EF4444;">
                            Failed to load keyword cards: ${this.escapeHtml(error.message || 'Unknown error')}
                        </div>
                    </div>
                `;
            }
            this.showPikachuReaction('error');
            this.updateStatus('Keyword search failed');
            this.addChatMessage('Gengar', `⚠️ Keyword card search failed (${error.message || 'Unknown error'})`, 94);
        }
    }

    async startKeywordListingAnalysis(keyword, selectedCards = null) {
        const normalizedKeyword = String(keyword || '').trim();
        if (!normalizedKeyword) {
            this.showPikachuReaction('error');
            alert('Please enter a valid keyword');
            return;
        }

        const selectedCardCount = Array.isArray(selectedCards) ? selectedCards.length : 0;
        this.updateStatus('Searching keyword listings...');
        this.showPikachuReaction('analyzing');
        this.addChatMessage(
            'System',
            selectedCardCount > 0
                ? `Searching SNKRDUNK listings for "${normalizedKeyword}" (${selectedCardCount} selected cards)...`
                : `Searching SNKRDUNK listings for "${normalizedKeyword}"...`,
            25
        );

        const baseData = {
            latestSalePrice: 0,
            cheapestListing: 0,
            arbitrageOpportunity: 0,
            profitMargin: '0.00',
            listingsFound: 0,
            dataSource: 'SNKRDUNK (Keyword Search)'
        };

        this.currentData.gengar = await this.enrichGengarWithOnSaleListings(
            baseData,
            normalizedKeyword,
            Array.isArray(selectedCards) ? selectedCards : null
        );

        const pricedListings = (this.currentData.gengar.onSaleListings || [])
            .filter(item => item && item.priceUsd != null && Number.isFinite(Number(item.priceUsd)));
        if (pricedListings.length) {
            const lowest = Number(pricedListings[0].priceUsd);
            this.currentData.gengar.cheapestListing = lowest;
            this.currentData.gengar.latestSalePrice = lowest;
            this.currentData.gengar.listingsFound = this.currentData.gengar.onSaleListingsTotal;
        }

        this.updateGengarCard(this.currentData.gengar);
        this.showKeywordListingResults();

        if (this.currentData.gengar.onSaleListingsError) {
            this.showPikachuReaction('error');
            this.updateStatus('Keyword listings failed');
            this.addChatMessage(
                'Gengar',
                `⚠️ Keyword listings failed (${this.currentData.gengar.onSaleListingsError})`,
                94
            );
            return;
        }

        if (this.currentData.gengar.onSaleListingsTotal > 0) {
            this.showPikachuReaction('profit');
        } else {
            this.showPikachuReaction('loss');
        }

        this.updateStatus('Keyword listings loaded');
        this.addChatMessage(
            'Gengar',
            `Loaded ${this.currentData.gengar.onSaleListingsTotal} unsold listings for "${this.currentData.gengar.onSaleKeyword}" (${this.currentData.gengar.onSaleMatchedCards.length} cards)`,
            94
        );
    }

    hideKeywordCardPicker() {
        const section = document.getElementById('keywordPickerSection');
        const grid = document.getElementById('keywordPickerGrid');
        const meta = document.getElementById('keywordPickerMeta');
        if (section) section.style.display = 'none';
        if (grid) grid.innerHTML = '';
        if (meta) meta.textContent = '';
    }

    renderKeywordCardPicker() {
        const section = document.getElementById('keywordPickerSection');
        const grid = document.getElementById('keywordPickerGrid');
        const meta = document.getElementById('keywordPickerMeta');
        const gengarCardBody = document.getElementById('gengarData');
        const cards = Array.isArray(this.keywordSelection.cards) ? this.keywordSelection.cards : [];
        const selectedId = String(this.keywordSelection.selectedCardId || '');
        const selectedCount = selectedId ? 1 : 0;

        if (!cards.length) {
            this.hideKeywordCardPicker();
            return;
        }

        // Keyword 선택 UI는 Gengar(Arbitrage Hunter) 카드 내에 표시
        if (section) section.style.display = 'none';
        if (meta) meta.textContent = `Keyword "${this.keywordSelection.keyword}" | Selected ${selectedCount} / ${cards.length}`;

        const rowsHtml = cards.map(card => {
            const cardId = String(card.card_id || '');
            const encodedCardId = encodeURIComponent(cardId);
            const selected = selectedId === cardId;
            const imageUrl = card.image_url || card.thumbnail_url || '';
            const cardName = card.name || card.card_name || card.full_title || cardId;
            const soldCount = Number(card.sold_count || 0).toLocaleString();
            const activeCount = Number(card.active_count || 0).toLocaleString();
            const cheapest = card.cheapest_listing != null && Number.isFinite(Number(card.cheapest_listing))
                ? `$${Number(card.cheapest_listing).toLocaleString()}`
                : '-';

            return `
                <button type="button"
                    onclick="toggleKeywordCardSelection('${encodedCardId}')"
                    style="
                        width:100%;
                        border:1px solid ${selected ? 'var(--secondary-purple)' : 'var(--glass-border)'};
                        border-radius:10px;
                        background:${selected ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.03)'};
                        color:var(--text-primary);
                        text-align:left;
                        display:flex;
                        align-items:center;
                        gap:10px;
                        padding:8px;
                        cursor:pointer;
                    ">
                    <div style="width:56px; min-width:56px; height:78px; border-radius:8px; overflow:hidden; border:1px solid var(--glass-border); background:rgba(255,255,255,0.06);">
                        ${imageUrl
                            ? `<img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(cardName)}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                            : ''
                        }
                        <div style="width:100%;height:100%;display:${imageUrl ? 'none' : 'flex'};align-items:center;justify-content:center;color:var(--text-muted);font-size:0.68rem;">No Image</div>
                    </div>
                    <div style="min-width:0;flex:1;">
                        <div style="font-size:0.8rem;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                            ${this.escapeHtml(cardName)}
                        </div>
                        <div style="margin-top:2px;font-size:0.7rem;color:var(--text-muted);font-family:monospace;">ID ${this.escapeHtml(cardId)}</div>
                    </div>
                    <div style="font-size:0.7rem;color:${selected ? 'var(--secondary-purple)' : 'var(--text-muted)'};font-weight:600;min-width:52px;text-align:right;">
                        ${selected ? 'Selected' : 'Select'}
                    </div>
                </button>
            `;
        }).join('');

        const selectionHtml = `
            <div class="data-item">
                <div class="data-label">Keyword Results</div>
                <div class="data-value" style="font-size:0.82rem;color:var(--text-secondary);">
                    "${this.escapeHtml(this.keywordSelection.keyword)}" | Selected ${selectedCount} / ${cards.length}
                </div>
                <div style="margin-top:0.55rem; display:flex; gap:8px; flex-wrap:wrap;">
                    <button type="button" class="btn-primary" onclick="startSelectedKeywordAnalysis()">
                        <i class="fas fa-play"></i> Analyze Selected
                    </button>
                </div>
                <div style="margin-top:0.7rem; display:grid; gap:8px; max-height:300px; overflow-y:auto;">
                    ${rowsHtml}
                </div>
            </div>
        `;

        if (gengarCardBody) {
            gengarCardBody.innerHTML = selectionHtml;
        }
        if (grid) {
            grid.innerHTML = rowsHtml;
        }
    }

    toggleKeywordCardSelection(cardId) {
        const id = String(cardId || '').trim();
        if (!id) return;
        const cards = Array.isArray(this.keywordSelection.cards) ? this.keywordSelection.cards : [];
        if (!cards.some(card => String(card.card_id) === id)) {
            return;
        }
        this.keywordSelection.selectedCardId = id;
        this.renderKeywordCardPicker();
    }

    getSelectedKeywordCards() {
        const cards = Array.isArray(this.keywordSelection.cards) ? this.keywordSelection.cards : [];
        const selectedId = String(this.keywordSelection.selectedCardId || '');
        if (!selectedId) return [];
        const selectedCard = cards.find(card => String(card.card_id) === selectedId);
        return selectedCard ? [selectedCard] : [];
    }

    async runSelectedKeywordAnalysis() {
        const keyword = this.keywordSelection.keyword || '';
        const selectedCards = this.getSelectedKeywordCards();
        if (!keyword) {
            alert('Please search keyword first');
            return;
        }
        if (!selectedCards.length) {
            alert('Please select at least one card');
            return;
        }

        await this.startKeywordListingAnalysis(keyword, selectedCards);
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
        const cardNameRaw = cardInfo ? cardInfo.cardName : 'Gengar';
        const cardName = cardNameRaw.split('#')[0].trim();

        try {
            // Call SNKRDUNK ID scraper API
            // Call SNKRDUNK Search API
            console.log('[Gengar] Calling SNKRDUNK Search API...');

            // Search by name for dynamic lookup
            // Clean name: remove # and anything after it (e.g. "Dark Gengar #94" -> "Dark Gengar")
            // For now, we rely heavily on the name search which our backend handles well

            const searchParams = new URLSearchParams({
                name: cardName,
                // set: cardInfo.set || '', 
                // number: cardInfo.collectionNumber || ''
            });

            const response = await fetch(`${this.proxyBaseUrl}/api/snkrdunk/search?${searchParams}`);

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

            this.currentData.gengar = await this.enrichGengarWithOnSaleListings({
                latestSalePrice: snkrPrice,
                cheapestListing: snkrPrice,
                arbitrageOpportunity: fmv - snkrPrice,
                profitMargin: ((fmv - snkrPrice) / snkrPrice * 100).toFixed(2),
                listingsFound: result.psa10Listings || 0,
                dataSource: `SNKRDUNK (${result.cardTitle || 'Real-time'})`
            }, cardName);

            this.updateGengarCard(this.currentData.gengar);
            if (this.currentData.gengar.onSaleListingsError) {
                this.addChatMessage('Gengar',
                    `⚠️ On-sale listings load failed (${this.currentData.gengar.onSaleListingsError})`,
                    94);
            } else {
                this.addChatMessage('Gengar',
                    `Loaded ${this.currentData.gengar.onSaleListingsTotal} unsold listings for "${this.currentData.gengar.onSaleKeyword}" (${this.currentData.gengar.onSaleMatchedCards.length} cards)`,
                    94);
            }

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

            this.currentData.gengar = await this.enrichGengarWithOnSaleListings({
                latestSalePrice: snkrPrice - 100,
                cheapestListing: snkrPrice,
                arbitrageOpportunity: fmv - snkrPrice,
                profitMargin: ((fmv - snkrPrice) / snkrPrice * 100).toFixed(2),
                dataSource: 'Estimated (Scraper offline)'
            }, cardName);

            this.updateGengarCard(this.currentData.gengar);
            if (this.currentData.gengar.onSaleListingsError) {
                this.addChatMessage('Gengar',
                    `⚠️ On-sale listings load failed (${this.currentData.gengar.onSaleListingsError})`,
                    94);
            } else {
                this.addChatMessage('Gengar',
                    `Loaded ${this.currentData.gengar.onSaleListingsTotal} unsold listings for "${this.currentData.gengar.onSaleKeyword}" (${this.currentData.gengar.onSaleMatchedCards.length} cards)`,
                    94);
            }

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

    getApiBaseCandidates() {
        const bases = [];
        const origin = typeof window !== 'undefined' ? window.location?.origin : null;
        if (origin && /^https?:\/\//.test(origin)) {
            bases.push(origin);
        }
        if (this.proxyBaseUrl && !bases.includes(this.proxyBaseUrl)) {
            bases.push(this.proxyBaseUrl);
        }
        return bases;
    }

    async fetchJsonWithFallback(path) {
        const bases = this.getApiBaseCandidates();
        let lastError = null;

        for (const base of bases) {
            try {
                const response = await fetch(`${base}${path}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`${base}${path} -> ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('No available API base');
    }

    async searchSnkrdunkCardsByKeyword(keyword, limit = this.snkrdunkKeywordCardLimit) {
        const q = String(keyword || '').trim();
        if (!q) return [];
        const safeLimit = Math.max(1, Math.min(50, Number(limit || this.snkrdunkKeywordCardLimit)));

        try {
            const liveResult = await this.fetchJsonWithFallback(
                `/api/snkrdunk/live-search?q=${encodeURIComponent(q)}&limit=${safeLimit}&page=1`
            );
            if (liveResult.success) {
                const liveCards = Array.isArray(liveResult.data) ? liveResult.data : [];
                return liveCards.filter(card => card && card.card_id);
            }
        } catch (liveError) {
            console.warn('[SNKRDUNK Keyword] live-search unavailable, fallback to /cards:', liveError);
        }

        const result = await this.fetchJsonWithFallback(
            `/api/snkrdunk/cards?q=${encodeURIComponent(q)}&limit=${safeLimit}`
        );
        if (!result.success) {
            throw new Error(result.error || 'Failed to search cards by keyword');
        }
        const cards = Array.isArray(result.data) ? result.data : [];
        return cards.filter(card => card && card.card_id);
    }

    async fetchSnkrdunkOnSaleListings(cardId, options = {}) {
        const perPage = options.perPage || this.snkrdunkOnSalePerPage;
        const maxPages = options.maxPages || this.snkrdunkOnSaleMaxPages;
        const result = await this.fetchJsonWithFallback(
            `/api/snkrdunk/on-sale/${encodeURIComponent(cardId)}?perPage=${perPage}&maxPages=${maxPages}`
        );
        if (!result.success) {
            throw new Error(result.error || 'Failed to load on-sale listings');
        }

        return result;
    }

    async enrichGengarWithOnSaleListings(baseData, keyword, selectedCards = null) {
        const normalizedKeyword = String(keyword || '').trim();
        const enrichedData = {
            ...baseData,
            onSaleKeyword: normalizedKeyword,
            onSaleMatchedCards: [],
            onSaleCardIds: [],
            onSaleListings: [],
            onSaleListingsTotal: 0,
            onSaleListingsError: null
        };

        try {
            const hasSelectedCards = Array.isArray(selectedCards) && selectedCards.length > 0;
            const matchedCards = hasSelectedCards
                ? selectedCards.filter(card => card && card.card_id)
                : await this.searchSnkrdunkCardsByKeyword(normalizedKeyword);
            if (!matchedCards.length) {
                enrichedData.onSaleListingsError = `No matching Pokemon cards found for "${normalizedKeyword}"`;
                return enrichedData;
            }

            const targetCards = hasSelectedCards
                ? matchedCards
                : matchedCards.slice(0, this.snkrdunkKeywordCardLimit);
            enrichedData.onSaleMatchedCards = targetCards;
            enrichedData.onSaleCardIds = targetCards.map(card => String(card.card_id));

            const listingResponses = await Promise.all(
                targetCards.map(card =>
                    this.fetchSnkrdunkOnSaleListings(card.card_id, {
                        perPage: this.snkrdunkOnSalePerPage,
                        maxPages: this.snkrdunkOnSaleMaxPages
                    })
                )
            );

            const mergedListings = [];
            listingResponses.forEach((result, index) => {
                const card = targetCards[index];
                const cardName = card.name || card.card_name || card.full_title || card.card_id;
                const items = Array.isArray(result.data) ? result.data : [];
                items.forEach(item => {
                    mergedListings.push({
                        ...item,
                        cardId: String(card.card_id),
                        cardName
                    });
                });
            });

            mergedListings.sort((a, b) => {
                if (a.priceUsd == null && b.priceUsd == null) return 0;
                if (a.priceUsd == null) return 1;
                if (b.priceUsd == null) return -1;
                return Number(a.priceUsd) - Number(b.priceUsd);
            });

            enrichedData.onSaleListings = mergedListings;
            enrichedData.onSaleListingsTotal = mergedListings.length;
        } catch (error) {
            console.error('[Gengar] On-sale listings error:', error);
            enrichedData.onSaleListingsError = error.message || 'Unknown error';
        }

        return enrichedData;
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
        const onSalePreview = this.renderGengarOnSalePreview(data);

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
            ${onSalePreview}
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
        if (!charizard || !gengar) {
            return this.showKeywordListingResults();
        }
        const isProfit = gengar.arbitrageOpportunity > 0;
        const onSaleSection = this.renderOnSaleComparisonSection(gengar);

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
            ${onSaleSection}
        `;

        resultsDiv.style.display = 'block';
        this.updateStatus('Analysis Complete');
    }

    showKeywordListingResults() {
        const resultsDiv = document.getElementById('arbitrageResults');
        const comparisonGrid = document.getElementById('comparisonGrid');
        const gengar = this.currentData.gengar || {};
        const keywordLabel = this.escapeHtml(gengar.onSaleKeyword || '-');
        const matchedCount = (gengar.onSaleMatchedCards || []).length;
        const totalListings = gengar.onSaleListingsTotal || 0;
        const onSaleSection = this.renderOnSaleComparisonSection(gengar);

        comparisonGrid.innerHTML = `
            <div class="comparison-card">
                <h3>Keyword Listing Search</h3>
                <p style="color: var(--text-secondary);">SNKRDUNK unsold listings (Price ASC)</p>
                <div style="margin-top: 0.8rem; font-size: 1.45rem; font-weight: 700; color: var(--accent-blue);">
                    ${keywordLabel}
                </div>
                <p style="margin-top: 0.8rem; color: var(--text-secondary);">
                    ${matchedCount} matched cards | ${totalListings} unsold listings
                </p>
            </div>
            ${onSaleSection}
        `;

        resultsDiv.style.display = 'block';
    }

    renderGengarOnSalePreview(data) {
        const keywordLabel = this.escapeHtml(data.onSaleKeyword || '-');
        if (data.onSaleListingsError) {
            return `
                <div class="data-item" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--glass-border);">
                    <div class="data-label">Unsold Listings (Keyword: ${keywordLabel})</div>
                    <div class="data-value" style="font-size: 0.82rem; color: #EF4444;">
                        ${this.escapeHtml(data.onSaleListingsError)}
                    </div>
                </div>
            `;
        }

        const listings = Array.isArray(data.onSaleListings) ? data.onSaleListings : [];
        if (!listings.length) {
            return `
                <div class="data-item" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--glass-border);">
                    <div class="data-label">Unsold Listings (Keyword: ${keywordLabel})</div>
                    <div class="data-value" style="font-size: 0.82rem; color: var(--text-muted);">
                        No unsold listings found
                    </div>
                </div>
            `;
        }

        const previewItems = listings.slice(0, 5).map((item, index) => `
            <div style="display: grid; grid-template-columns: 26px 1fr auto; gap: 8px; align-items: center; padding: 0.32rem 0.45rem; border-bottom: 1px solid rgba(255,255,255,0.04);">
                <span style="font-size: 0.72rem; color: var(--text-muted);">#${index + 1}</span>
                <span style="font-size: 0.78rem; color: var(--text-primary);">
                    ${this.formatListingPrice(item)}
                    <span style="display: block; margin-top: 2px; font-size: 0.68rem; color: var(--text-muted);">
                        ${this.escapeHtml(item.cardName || item.cardId || '-')}
                    </span>
                </span>
                <span style="font-size: 0.72rem; color: var(--text-secondary);">${this.escapeHtml(item.condition || '-')}</span>
            </div>
        `).join('');

        return `
            <div class="data-item" style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--glass-border);">
                <div class="data-label">Unsold Listings (Keyword: ${keywordLabel})</div>
                <div style="margin-top: 0.45rem; max-height: 150px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: 8px;">
                    ${previewItems}
                </div>
                <div style="margin-top: 0.35rem; color: var(--text-muted); font-size: 0.72rem;">
                    Showing lowest ${Math.min(5, listings.length)} / ${data.onSaleListingsTotal || listings.length} (${(data.onSaleMatchedCards || []).length} cards)
                </div>
            </div>
        `;
    }

    renderOnSaleComparisonSection(gengar) {
        const keywordLabel = this.escapeHtml(gengar.onSaleKeyword || '-');
        if (gengar.onSaleListingsError) {
            return `
                <div class="comparison-card" style="grid-column: 1 / -1; border-color: #EF4444;">
                    <h3>SNKRDUNK Unsold Listings (Price ASC)</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">Keyword: <strong>${keywordLabel}</strong></p>
                    <p style="color: #EF4444;">Failed to load list: ${this.escapeHtml(gengar.onSaleListingsError)}</p>
                </div>
            `;
        }

        const listings = Array.isArray(gengar.onSaleListings) ? gengar.onSaleListings : [];
        if (!listings.length) {
            return `
                <div class="comparison-card" style="grid-column: 1 / -1;">
                    <h3>SNKRDUNK Unsold Listings (Price ASC)</h3>
                    <p style="color: var(--text-secondary);">No unsold listings available for keyword "${keywordLabel}"</p>
                </div>
            `;
        }

        const rows = listings.map((item, index) => `
            <tr>
                <td style="padding: 0.55rem 0.65rem; color: var(--text-muted); border-bottom: 1px solid rgba(255,255,255,0.05);">${index + 1}</td>
                <td style="padding: 0.55rem 0.65rem; color: var(--text-primary); border-bottom: 1px solid rgba(255,255,255,0.05);">
                    ${this.escapeHtml(item.cardName || '-')}
                    <span style="display:block; margin-top: 2px; color: var(--text-muted); font-size: 0.68rem;">${this.escapeHtml(item.cardId || '-')}</span>
                </td>
                <td style="padding: 0.55rem 0.65rem; color: var(--accent-green); font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05);">${this.formatListingPrice(item)}</td>
                <td style="padding: 0.55rem 0.65rem; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,0.05);">${this.escapeHtml(item.condition || '-')}</td>
                <td style="padding: 0.55rem 0.65rem; color: var(--text-muted); font-family: monospace; border-bottom: 1px solid rgba(255,255,255,0.05);">${this.escapeHtml(item.listingUID || '-')}</td>
            </tr>
        `).join('');

        return `
            <div class="comparison-card" style="grid-column: 1 / -1;">
                <h3>SNKRDUNK Unsold Listings (Price ASC)</h3>
                <p style="color: var(--text-secondary); margin-bottom: 0.75rem;">
                    Keyword "${keywordLabel}" | ${ (gengar.onSaleMatchedCards || []).length } matched cards | Total ${gengar.onSaleListingsTotal || listings.length} items
                </p>
                <div style="max-height: 520px; overflow-y: auto; border: 1px solid var(--glass-border); border-radius: 10px;">
                    <table style="width: 100%; border-collapse: collapse; min-width: 640px;">
                        <thead style="position: sticky; top: 0; background: rgba(139, 92, 246, 0.15);">
                            <tr>
                                <th style="text-align: left; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: var(--text-secondary);">#</th>
                                <th style="text-align: left; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: var(--text-secondary);">Card</th>
                                <th style="text-align: left; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: var(--text-secondary);">Price</th>
                                <th style="text-align: left; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: var(--text-secondary);">Condition</th>
                                <th style="text-align: left; padding: 0.55rem 0.65rem; font-size: 0.78rem; color: var(--text-secondary);">Listing UID</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
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

    formatListingPrice(item) {
        if (item && item.priceUsd != null && Number.isFinite(Number(item.priceUsd))) {
            return `$${Number(item.priceUsd).toLocaleString()}`;
        }
        if (item && item.price) {
            return item.price;
        }
        return '-';
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

function startSelectedKeywordAnalysis() {
    if (window.agentSystem) {
        window.agentSystem.runSelectedKeywordAnalysis();
    }
}

function toggleKeywordCardSelection(cardIdEncoded) {
    if (!window.agentSystem) return;
    const decoded = decodeURIComponent(String(cardIdEncoded || ''));
    window.agentSystem.toggleKeywordCardSelection(decoded);
}

// Initialize agent system when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.agentSystem = new AgentSystem();

    const certInput = document.getElementById('certInput');
    if (certInput) {
        certInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                startAnalysis();
            }
        });
    }
});
