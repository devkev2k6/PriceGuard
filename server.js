const express = require('express');
const path = require('path');
const cors = require('cors');
const PriceEngine = require('./extension/engine.js');
const Dataset = require('./extension/dataset.js');

const app = express();
const PORT = process.env.PORT || 3000;
const engine = new PriceEngine(Dataset);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// Also serve extension files if needed for reference
app.use('/extension', express.static(path.join(__dirname, 'extension')));

// Dynamic pricing incident logs store (in-memory for demo/admin)
const incidentLogs = [
  {
    id: "INC-9041",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    platform: "Flipkart",
    product: "Bangalore to Kolkata Flight Pass",
    category: "Flights & Travel Passes",
    listedPrice: 7800,
    estimatedFairPrice: 5525,
    markupPct: 41,
    riskScore: 65,
    flags: ["Repeated Searches (4x in 30m)", "Artificial Scarcity: 'Only 1 seat left'", "Active Countdown Timer"],
    status: "Flagged"
  },
  {
    id: "INC-9040",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    platform: "Flipkart",
    product: "Apple iPhone 15 (128 GB, Black)",
    category: "Smartphones & Mobiles",
    listedPrice: 69999,
    estimatedFairPrice: 62499,
    markupPct: 12,
    riskScore: 52,
    flags: ["Evening Traffic Peak (9 PM)", "Rapid Cart Abandonment Surge"],
    status: "Flagged"
  },
  {
    id: "INC-9039",
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    platform: "Flipkart",
    product: "Sony WH-1000XM5 Wireless Headphones",
    category: "Audio & Wearables",
    listedPrice: 29990,
    estimatedFairPrice: 24990,
    markupPct: 20,
    riskScore: 68,
    flags: ["Search Velocity Spike", "Competitor Price Floor Mismatch"],
    status: "Flagged"
  },
  {
    id: "INC-9038",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    platform: "Flipkart",
    product: "Samsung 55-inch 4K Smart QLED TV",
    category: "Home & Kitchen Appliances",
    listedPrice: 64990,
    estimatedFairPrice: 58990,
    markupPct: 10,
    riskScore: 35,
    flags: ["Weekend Shopping Demand"],
    status: "Resolved"
  }
];

// Pre-configured Test Scenarios
const testScenarios = [
  {
    id: "prompt-scenario",
    name: "✈️ Prompt Scenario: Bangalore-Kolkata Flight Pass",
    description: "Item viewed 4 times in 30 mins with 'Only 1 seat left' countdown badge.",
    payload: {
      title: "Bangalore to Kolkata flight/conference pass",
      listedPrice: 7800,
      mrp: 9999,
      visitCount: 4,
      timeWindowMinutes: 30,
      scarcityBadges: ["Only 1 seat left", "Hurry, fast selling"],
      hasCountdownTimer: true
    }
  },
  {
    id: "mobile-surge",
    name: "📱 Festive Surge: Flagship Smartphone",
    description: "Repeated views during festive high-demand evening traffic.",
    payload: {
      title: "Flagship 5G Smartphone (256 GB, Titanium)",
      listedPrice: 74999,
      mrp: 79999,
      visitCount: 3,
      timeWindowMinutes: 20,
      scarcityBadges: ["Only 2 left in stock"],
      hasCountdownTimer: false
    }
  },
  {
    id: "earbuds-surge",
    name: "🎧 Cookie Tracking Surge: ANC Earbuds",
    description: "Multiple visits with artificial urgency banner.",
    payload: {
      title: "Active Noise Cancelling Wireless Earbuds (Pro)",
      listedPrice: 4999,
      mrp: 7999,
      visitCount: 5,
      timeWindowMinutes: 25,
      scarcityBadges: ["Hurry! 12 people viewing right now", "Sale ends in 00:14:22"],
      hasCountdownTimer: true
    }
  },
  {
    id: "fair-deal",
    name: "✅ Clean Deal: Smart Fitness Tracker",
    description: "Standard discount at historical floor with zero manipulation signals.",
    payload: {
      title: "Smart Fitness Watch with AMOLED Display",
      listedPrice: 2499,
      mrp: 4999,
      visitCount: 1,
      timeWindowMinutes: 30,
      scarcityBadges: [],
      hasCountdownTimer: false
    }
  }
];

// API: AI Analysis Endpoint
app.post('/api/analyze', (req, res) => {
  try {
    const analysis = engine.analyze(req.body);

    // If critical/high surge, log to admin incidents
    if (analysis.evaluation.surgeRiskScore >= 55) {
      incidentLogs.unshift({
        id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toISOString(),
        platform: "Flipkart / E-Commerce",
        product: analysis.product.title,
        category: analysis.product.category,
        listedPrice: analysis.product.listedPrice,
        estimatedFairPrice: analysis.evaluation.estimatedFairPrice,
        markupPct: analysis.evaluation.markupPercentage,
        riskScore: analysis.evaluation.surgeRiskScore,
        flags: analysis.signals.map(s => s.title),
        status: "Flagged"
      });
      if (incidentLogs.length > 50) incidentLogs.pop();
    }

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API: Get Test Scenarios
app.get('/api/scenarios', (req, res) => {
  res.json({ success: true, scenarios: testScenarios });
});

// API: Get Admin Incidents & Analytics
app.get('/api/admin/incidents', (req, res) => {
  res.json({
    success: true,
    totalAudited: 1248,
    flaggedSurges: incidentLogs.length + 142,
    avgMarkupDetected: "23.4%",
    incidents: incidentLogs,
    categoryScores: [
      { category: "Flights & Travel", fairnessScore: 42, risk: "High Dynamic Surge", count: 320 },
      { category: "Smartphones", fairnessScore: 68, risk: "Moderate Dynamic Pricing", count: 480 },
      { category: "Audio & Wearables", fairnessScore: 55, risk: "High Velocity Markup", count: 210 },
      { category: "Laptops", fairnessScore: 78, risk: "Low Manipulation", count: 140 },
      { category: "Fashion", fairnessScore: 51, risk: "MRP Inflation Illusion", count: 98 }
    ]
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🛡️ PriceGuard AI Server is running!`);
  console.log(`🌐 Web Dashboard: http://localhost:${PORT}`);
  console.log(`📊 Admin Console: http://localhost:${PORT}/admin.html`);
  console.log(`🔌 Chrome Extension ready at: ./extension`);
  console.log(`====================================================`);
});
