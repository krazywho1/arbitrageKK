// Configuration
const CONFIG = {
    // API Endpoints with CORS proxy
    POLYMARKET_API: 'https://corsproxy.io/?https://gamma-api.polymarket.com/graphql',
    KALSHI_API: 'https://corsproxy.io/?https://api.kalshi.com/trade-api/v2',
    
    // Minimum profit threshold (in percentage)
    MIN_PROFIT_THRESHOLD: 2,
    
    // Mock data for testing when APIs fail
    USE_MOCK_DATA: false
};

// State management
let state = {
    polymarketData: [],
    kalshiData: [],
    opportunities: [],
    refreshInterval: null,
    refreshRate: 30000, // 30 seconds default
    lastUpdate: null
};

// DOM Elements
const elements = {
    polyStatus: document.getElementById('polyStatus'),
    kalshiStatus: document.getElementById('kalshiStatus'),
    polyMarkets: document.getElementById('polyMarkets'),
    kalshiMarkets: document.getElementById('kalshiMarkets'),
    polyTime: document.getElementById('polyTime'),
    kalshiTime: document.getElementById('kalshiTime'),
    opportunitiesCount: document.getElementById('opportunitiesCount'),
    maxProfit: document.getElementById('maxProfit'),
    polyMarketList: document.getElementById('polyMarketList'),
    kalshiMarketList: document.getElementById('kalshiMarketList'),
    opportunitiesList: document.getElementById('opportunitiesList'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshSelect: document.getElementById('refreshSelect')
};

// Initialize application
function init() {
    updateStatus('Polymarket', 'Connecting...');
    updateStatus('Kalshi', 'Connecting...');
    
    // Load initial data
    fetchAllData();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    console.log('Arbitrage tool initialized');
}

// Fetch data from both APIs
async function fetchAllData() {
    try {
        elements.refreshBtn.disabled = true;
        elements.refreshBtn.textContent = '⏳ Loading...';
        
        // Fetch data concurrently
        await Promise.allSettled([
            fetchPolymarketData(),
            fetchKalshiData()
        ]);
        
        // Find arbitrage opportunities
        findArbitrageOpportunities();
        
        // Update UI
        updateDashboard();
        
        state.lastUpdate = new Date();
        
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.textContent = '🔄 Refresh Data Now';
    }
}

// Fetch Polymarket data
async function fetchPolymarketData() {
    try {
        // GraphQL query for Polymarket
        const query = `
            query {
                markets(limit: 50) {
                    conditionId
                    question
                    outcomes {
                        name
                        price
                    }
                    volume
                    liquidity
                    createdAt
                }
            }
        `;
        
        const response = await fetch(CONFIG.POLYMARKET_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        // Process and normalize data
        state.polymarketData = processPolymarketData(data.data?.markets || []);
        
        updateStatus('Polymarket', 'Ready', 'ready');
        updateTime('Polymarket');
        
        console.log(`Loaded ${state.polymarketData.length} Polymarket markets`);
        
    } catch (error) {
        console.error('Polymarket API error:', error);
        updateStatus('Polymarket', 'Error', 'error');
        
        // Use mock data if enabled
        if (CONFIG.USE_MOCK_DATA) {
            state.polymarketData = generateMockPolymarketData();
            console.log('Using mock Polymarket data');
        }
    }
}

// Process Polymarket data
function processPolymarketData(markets) {
    return markets.map(market => ({
        id: market.conditionId,
        name: market.question,
        yesPrice: market.outcomes?.find(o => o.name === 'Yes')?.price || 0,
        noPrice: market.outcomes?.find(o => o.name === 'No')?.price || 0,
        volume: market.volume || 0,
        liquidity: market.liquidity || 0,
        platform: 'Polymarket',
        timestamp: new Date()
    })).filter(m => m.yesPrice > 0 && m.noPrice > 0);
}

// Fetch Kalshi data
async function fetchKalshiData() {
    try {
        // Note: Kalshi requires authentication for full API access
        // This is a simplified version using available endpoints
        
        const response = await fetch(`${CONFIG.KALSHI_API}/events`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process and normalize data
        state.kalshiData = processKalshiData(data.events || []);
        
        updateStatus('Kalshi', 'Ready', 'ready');
        updateTime('Kalshi');
        
        console.log(`Loaded ${state.kalshiData.length} Kalshi markets`);
        
    } catch (error) {
        console.error('Kalshi API error:', error);
        updateStatus('Kalshi', 'Error', 'error');
        
        // Use mock data if enabled
        if (CONFIG.USE_MOCK_DATA) {
            state.kalshiData = generateMockKalshiData();
            console.log('Using mock Kalshi data');
        }
    }
}

// Process Kalshi data
function processKalshiData(events) {
    // Flatten all markets from events
    const markets = [];
    
    events.forEach(event => {
        if (event.markets) {
            event.markets.forEach(market => {
                markets.push({
                    id: market.id,
                    name: market.name || event.title,
                    yesPrice: market.yesPrice || 0,
                    noPrice: market.noPrice || 0,
                    volume: market.volume || 0,
                    platform: 'Kalshi',
                    eventTitle: event.title,
                    timestamp: new Date()
                });
            });
        }
    });
    
    return markets.filter(m => m.yesPrice > 0 && m.noPrice > 0);
}

// Find arbitrage opportunities
function findArbitrageOpportunities() {
    state.opportunities = [];
    
    // Simple matching by market name similarity
    state.polymarketData.forEach(polyMarket => {
        state.kalshiData.forEach(kalshiMarket => {
            if (isSimilarMarket(polyMarket.name, kalshiMarket.name)) {
                const opportunity = calculateArbitrage(polyMarket, kalshiMarket);
                if (opportunity.profit >= CONFIG.MIN_PROFIT_THRESHOLD) {
                    state.opportunities.push(opportunity);
                }
            }
        });
    });
    
    // Sort by profit (highest first)
    state.opportunities.sort((a, b) => b.profit - a.profit);
    
    console.log(`Found ${state.opportunities.length} arbitrage opportunities`);
}

// Check if markets are similar
function isSimilarMarket(name1, name2) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const words1 = normalize(name1).split(' ').filter(w => w.length > 3);
    const words2 = normalize(name2).split(' ').filter(w => w.length > 3);
    
    // Check for common words
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length >= 2;
}

// Calculate arbitrage profit
function calculateArbitrage(polyMarket, kalshiMarket) {
    // Buy YES on cheaper platform, sell YES on expensive platform
    const buyYesPrice = Math.min(polyMarket.yesPrice, kalshiMarket.yesPrice);
    const sellYesPrice = Math.max(polyMarket.yesPrice, kalshiMarket.yesPrice);
    
    // Buy NO on cheaper platform, sell NO on expensive platform
    const buyNoPrice = Math.min(polyMarket.noPrice, kalshiMarket.noPrice);
    const sellNoPrice = Math.max(polyMarket.noPrice, kalshiMarket.noPrice);
    
    const profitYes = ((sellYesPrice - buyYesPrice) / buyYesPrice) * 100;
    const profitNo = ((sellNoPrice - buyNoPrice) / buyNoPrice) * 100;
    
    const profit = Math.max(profitYes, profitNo);
    const direction = profitYes > profitNo ? 'YES' : 'NO';
    
    const buyPlatform = profitYes > profitNo ? 
        (polyMarket.yesPrice <= kalshiMarket.yesPrice ? 'Polymarket' : 'Kalshi') :
        (polyMarket.noPrice <= kalshiMarket.noPrice ? 'Polymarket' : 'Kalshi');
    
    const sellPlatform = buyPlatform === 'Polymarket' ? 'Kalshi' : 'Polymarket';
    
    return {
        id: `${polyMarket.id}-${kalshiMarket.id}`,
        marketName: polyMarket.name,
        profit: parseFloat(profit.toFixed(2)),
        direction,
        buyPlatform,
        sellPlatform,
        buyPrice: profitYes > profitNo ? 
            (polyMarket.yesPrice <= kalshiMarket.yesPrice ? polyMarket.yesPrice : kalshiMarket.yesPrice) :
            (polyMarket.noPrice <= kalshiMarket.noPrice ? polyMarket.noPrice : kalshiMarket.noPrice),
        sellPrice: profitYes > profitNo ? 
            (polyMarket.yesPrice > kalshiMarket.yesPrice ? polyMarket.yesPrice : kalshiMarket.yesPrice) :
            (polyMarket.noPrice > kalshiMarket.noPrice ? polyMarket.noPrice : kalshiMarket.noPrice),
        timestamp: new Date()
    };
}

// Update dashboard UI
function updateDashboard() {
    // Update counts
    elements.polyMarkets.textContent = state.polymarketData.length;
    elements.kalshiMarkets.textContent = state.kalshiData.length;
    elements.opportunitiesCount.textContent = state.opportunities.length;
    
    // Update max profit
    const maxProfit = state.opportunities.length > 0 ? 
        Math.max(...state.opportunities.map(o => o.profit)) : 0;
    elements.maxProfit.textContent = `${maxProfit.toFixed(2)}%`;
    elements.maxProfit.className = maxProfit > 0 ? 'stat-value profit' : 'stat-value';
    
    // Render market lists
    renderMarketList('polymarket');
    renderMarketList('kalshi');
    
    // Render opportunities
    renderOpportunities();
}

// Render market list
function renderMarketList(platform) {
    const container = platform === 'polymarket' ? 
        elements.polyMarketList : elements.kalshiMarketList;
    const data = platform === 'polymarket' ? 
        state.polymarketData.slice(0, 10) : state.kalshiData.slice(0, 10);
    
    container.innerHTML = data.map(market => `
        <div class="market-item">
            <div class="market-name">${market.name.substring(0, 60)}${market.name.length > 60 ? '...' : ''}</div>
            <div>YES: <span class="market-price">$${market.yesPrice.toFixed(2)}</span></div>
            <div>NO: <span class="market-price">$${market.noPrice.toFixed(2)}</span></div>
            <div>Volume: $${market.volume.toFixed(2)}</div>
        </div>
    `).join('');
    
    if (data.length === 0) {
        container.innerHTML = `<div class="market-item">No markets loaded. Check API connection.</div>`;
    }
}

// Render opportunities
function renderOpportunities() {
    const container = elements.opportunitiesList;
    
    if (state.opportunities.length === 0) {
        container.innerHTML = `
            <div class="market-item">
                No arbitrage opportunities found above ${CONFIG.MIN_PROFIT_THRESHOLD}% threshold.
                Try lowering the threshold or refreshing data.
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.opportunities.map(opp => `
        <div class="opportunity-item">
            <div class="profit">💰 ${opp.profit.toFixed(2)}% Profit</div>
            <div class="market-name">${opp.marketName.substring(0, 80)}${opp.marketName.length > 80 ? '...' : ''}</div>
            
            <div class="arbitrage-details">
                <div class="platform">
                    <div>BUY ${opp.direction} on</div>
                    <div style="font-weight: 700; color: #10b981;">${opp.buyPlatform}</div>
                    <div>Price: $${opp.buyPrice.toFixed(2)}</div>
                </div>
                
                <div class="arrow">➡️</div>
                
                <div class="platform">
                    <div>SELL ${opp.direction} on</div>
                    <div style="font-weight: 700; color: #ef4444;">${opp.sellPlatform}</div>
                    <div>Price: $${opp.sellPrice.toFixed(2)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Update status indicators
function updateStatus(platform, message, type = '') {
    const element = platform === 'Polymarket' ? elements.polyStatus : elements.kalshiStatus;
    element.textContent = message;
    element.className = `status ${type}`;
}

// Update time indicators
function updateTime(platform) {
    const element = platform === 'Polymarket' ? elements.polyTime : elements.kalshiTime;
    const now = new Date();
    element.textContent = now.toLocaleTimeString();
}

// Setup auto-refresh
function setupAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
    }
    
    if (state.refreshRate > 0) {
        state.refreshInterval = setInterval(fetchAllData, state.refreshRate);
        console.log(`Auto-refresh set to ${state.refreshRate / 1000} seconds`);
    }
}

// Update refresh rate
function updateRefreshRate() {
    state.refreshRate = parseInt(elements.refreshSelect.value);
    elements.refreshRate.textContent = state.refreshRate === 0 ? 'Off' : `${state.refreshRate / 1000}s`;
    setupAutoRefresh();
}

// Generate mock data for testing
function generateMockPolymarketData() {
    const markets = [
        { id: '1', name: 'Will BTC reach $100K by Dec 2024?', yesPrice: 0.65, noPrice: 0.35, volume: 50000 },
        { id: '2', name: 'Will ETH reach $5K by Dec 2024?', yesPrice: 0.45, noPrice: 0.55, volume: 30000 },
        { id: '3', name: 'Will S&P 500 close above 5000 on Dec 31?', yesPrice: 0.70, noPrice: 0.30, volume: 80000 },
        { id: '4', name: 'Will Fed cut rates in 2024?', yesPrice: 0.85, noPrice: 0.15, volume: 120000 },
        { id: '5', name: 'Will Trump win 2024 election?', yesPrice: 0.55, noPrice: 0.45, volume: 200000 },
    ];
    
    return markets.map(m => ({
        ...m,
        platform: 'Polymarket',
        timestamp: new Date()
    }));
}

function generateMockKalshiData() {
    const markets = [
        { id: '101', name: 'Bitcoin to reach $100,000 by end of 2024?', yesPrice: 0.68, noPrice: 0.32, volume: 45000 },
        { id: '102', name: 'Ethereum to reach $5,000 by end of 2024?', yesPrice: 0.42, noPrice: 0.58, volume: 28000 },
        { id: '103', name: 'S&P 500 to close above 5000 on December 31?', yesPrice: 0.72, noPrice: 0.28, volume: 75000 },
        { id: '104', name: 'Federal Reserve to cut interest rates in 2024?', yesPrice: 0.82, noPrice: 0.18, volume: 110000 },
        { id: '105', name: 'Donald Trump to win 2024 presidential election?', yesPrice: 0.52, noPrice: 0.48, volume: 180000 },
    ];
    
    return markets.map(m => ({
        ...m,
        platform: 'Kalshi',
        timestamp: new Date()
    }));
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
