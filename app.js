// API Endpoints
const POLY_URL = "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100";
const KALSHI_URL = "https://api.kalshi.com/trade-api/v2/markets?limit=100&status=open";

// CORS Proxy (Required for GitHub Pages to talk to these APIs)
const PROXY = "https://cors-anywhere.herokuapp.com/"; 

async function fetchAllData() {
    logMessage("Fetching live data...");
    
    try {
        // 1. Fetch Polymarket
        // Note: In production, you'd use your own proxy. For now, we try direct or via proxy.
        const polyResponse = await fetch(POLY_URL);
        const polyData = await polyResponse.json();
        
        // Filter for your 4 categories
        const filteredPoly = polyData.filter(m => 
            ["crypto", "sports", "culture", "weather"].some(cat => 
                m.group_web_name?.toLowerCase().includes(cat) || 
                m.title?.toLowerCase().includes(cat)
            )
        );

        // 2. Fetch Kalshi
        // Kalshi often requires an API key for deeper data, but public markets are sometimes accessible
        const kalshiResponse = await fetch(KALSHI_URL);
        const kalshiData = await kalshiResponse.json();
        
        const filteredKalshi = kalshiData.markets.filter(m => 
            ["crypto", "sports", "culture", "weather"].some(cat => 
                m.category?.toLowerCase().includes(cat) || 
                m.title?.toLowerCase().includes(cat)
            )
        );

        renderMarkets(filteredPoly, filteredKalshi);
        calculateArbitrage(filteredPoly, filteredKalshi);
        
    } catch (error) {
        logMessage("API Error: " + error.message);
        console.error(error);
    }
}

function renderMarkets(poly, kalshi) {
    const polyList = document.getElementById('polyMarketList');
    const kalshiList = document.getElementById('kalshiMarketList');

    polyList.innerHTML = poly.map(m => `
        <div class="market-item">
            <div class="market-name">${m.question}</div>
            <div class="market-category">POLYMARKET</div>
            <div class="market-price">YES: ${(m.outcomePrices[0] * 100).toFixed(1)}¢</div>
        </div>
    `).join('');

    kalshiList.innerHTML = kalshi.map(m => `
        <div class="market-item">
            <div class="market-name">${m.title}</div>
            <div class="market-category">KALSHI</div>
            <div class="market-price">YES: ${m.yes_ask}¢</div>
        </div>
    `).join('');
}
