# PKMONAD - Pokemon Card Trading Platform

> Real-time Pokemon card price analysis and trading dashboard

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🎯 Overview

PKMONAD is a Pokemon card trading platform that provides real-time market data integration with PSA certification lookup and PriceCharting price analysis.

## 🚀 Quick Start

1. **Install Dependencies**
```bash
npm install
```

2. **Configure Environment**
Create `.env` file:
```
PSA_API_KEY=your_psa_api_key
PRICECHARTING_API_KEY=your_pricecharting_api_key
```

3. **Start Proxy Server**
```bash
node psa-proxy-server.js
```

4. **Open Dashboard**
Open `index.html` in your browser

## 📁 Project Structure

```
pkmonad-project/
├── index.html                  # Main trading dashboard
├── psa-proxy-server.js         # PSA/PriceCharting API proxy
├── pricecharting_psa10_lookup.py  # PSA 10 price lookup utility
├── styles.css                  # Design system
├── assets/                     # Configuration & utilities
│   ├── config.js
│   ├── wallet.js
│   └── agents.js
├── pokedex.html               # Pokemon database
├── tcg-search.html            # TCG card search
├── train.html                 # Agent explanation
├── utility.html               # Token utility
└── pokememe.html             # Community page
```

## ✨ Features

- ✅ PSA API integration (cert lookup)
- ✅ PriceCharting API (price data, CSV download)
- ✅ Real-time exchange rates (USD, KRW, Crypto)
- ✅ Multi-agent analysis system
- ✅ Wallet connection (MetaMask/Rabby)
- ✅ Monad network support

## 🔧 API Integration

### PSA API
- Certification lookup by CERT number
- Population reports
- Grade verification

### PriceCharting API
- Market prices (Ungraded, PSA 9, PSA 10)
- Recent sales history
- CSV export for bulk lookup

## 🌐 Links

- Buy $PKMON: https://nad.fun/tokens/0x39D691612Ef8B4B884b0aA058f41C93d6B527777
- Twitter: https://x.com/pkmonad
- Telegram: https://t.me/pkmonad

## 📝 License

MIT
