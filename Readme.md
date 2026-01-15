# 🎯 Polymarket vs Kalshi Arbitrage Tool

A real-time arbitrage detection tool that finds profitable opportunities between Polymarket and Kalshi prediction markets.

## ✨ Features

- **Real-time Data**: Live market data from both platforms
- **Arbitrage Detection**: Automatic identification of profitable opportunities
- **Visual Dashboard**: Clean, modern interface with real-time updates
- **Configurable**: Adjustable refresh rates and profit thresholds
- **Error Handling**: Graceful fallback with mock data when APIs fail

## 🚀 Quick Start

1. **Clone or Download** the repository
2. **Open `index.html`** in your browser
3. **No installation required** - runs entirely in the browser

## 📦 Files Included

- `index.html` - Main interface
- `app.js` - Core logic and API integration
- `README.md` - This documentation

## 🔧 API Configuration

The tool uses:
- **Polymarket**: GraphQL API at `gamma-api.polymarket.com/graphql`
- **Kalshi**: REST API at `api.kalshi.com/trade-api/v2`

**Note**: Both APIs are accessed through a CORS proxy to avoid browser restrictions. For production use, consider setting up your own backend proxy.

## ⚙️ Customization

### Profit Threshold
Edit in `app.js`:
```javascript
MIN_PROFIT_THRESHOLD: 2, // Minimum profit percentage to display
