/**
 * PriceGuard AI - Consumer Web Dashboard Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  let priceChartInstance = null;
  const engine = new PriceGuardEngine(PriceGuardDataset);

  // DOM Elements
  const scenarioButtonsContainer = document.getElementById("scenario-buttons-container");
  const inspectorForm = document.getElementById("inspector-form");
  const inputTitle = document.getElementById("input-title");
  const inputListed = document.getElementById("input-listed");
  const inputMrp = document.getElementById("input-mrp");
  const inputVisits = document.getElementById("input-visits");
  const checkScarcity = document.getElementById("check-scarcity");
  const checkTimer = document.getElementById("check-timer");

  // Output Elements
  const resCategory = document.getElementById("res-category");
  const resRiskScore = document.getElementById("res-risk-score");
  const resRiskTag = document.getElementById("res-risk-tag");
  const resRiskBar = document.getElementById("res-risk-bar");
  const resRiskSummary = document.getElementById("res-risk-summary");
  const resListedPrice = document.getElementById("res-listed-price");
  const resMrp = document.getElementById("res-mrp");
  const resFairPrice = document.getElementById("res-fair-price");
  const resFairRange = document.getElementById("res-fair-range");
  const resMarkupBanner = document.getElementById("res-markup-banner");
  const resMarkupTitle = document.getElementById("res-markup-title");
  const resMarkupDesc = document.getElementById("res-markup-desc");
  const resSignalsContainer = document.getElementById("res-signals-container");
  const resAlternativesContainer = document.getElementById("res-alternatives-container");
  const resTacticsContainer = document.getElementById("res-tactics-container");
  const resPaymentContainer = document.getElementById("res-payment-container");
  const resHistFloor = document.getElementById("res-hist-floor");
  const resHistAvg = document.getElementById("res-hist-avg");
  const resHistFair = document.getElementById("res-hist-fair");

  // Load scenarios
  let scenarios = [
    {
      id: "prompt-scenario",
      name: "✈️ Bangalore-Kolkata Flight Pass (₹7,800 Prompt Scenario)",
      description: "Viewed 4 times in 30 mins with 'Only 1 seat left' countdown badge.",
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
      name: "📱 Flagship Smartphone Festive Surge",
      description: "Repeated visits during high-demand evening shopping traffic.",
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
      description: "5 visits with artificial urgency banner and countdown timer.",
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
      description: "Standard markdown at price floor with zero manipulation signals.",
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

  try {
    const res = await fetch("/api/scenarios");
    const json = await res.json();
    if (json.success && json.scenarios) {
      scenarios = json.scenarios;
    }
  } catch (e) {
    // Use local fallback
  }

  function renderScenarioButtons() {
    scenarioButtonsContainer.innerHTML = scenarios
      .map(
        (sc, index) => `
      <div class="scenario-card ${index === 0 ? "active" : ""}" data-index="${index}">
        <div class="scenario-name">${sc.name}</div>
        <div class="scenario-desc">${sc.description}</div>
      </div>
    `
      )
      .join("");

    const cards = scenarioButtonsContainer.querySelectorAll(".scenario-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        cards.forEach((c) => c.classList.remove("active"));
        card.classList.add("active");
        const idx = parseInt(card.dataset.index, 10);
        loadScenario(scenarios[idx]);
      });
    });
  }

  function loadScenario(sc) {
    const p = sc.payload;
    inputTitle.value = p.title;
    inputListed.value = p.listedPrice;
    inputMrp.value = p.mrp || Math.round(p.listedPrice * 1.25);
    inputVisits.value = p.visitCount || 1;
    checkScarcity.checked = (p.scarcityBadges && p.scarcityBadges.length > 0);
    checkTimer.checked = Boolean(p.hasCountdownTimer);

    executeAnalysis({
      title: p.title,
      listedPrice: p.listedPrice,
      mrp: p.mrp,
      visitCount: p.visitCount,
      timeWindowMinutes: p.timeWindowMinutes || 30,
      scarcityBadges: p.scarcityBadges || [],
      hasCountdownTimer: p.hasCountdownTimer
    });
  }

  function executeAnalysis(payload) {
    const analysis = engine.analyze(payload);
    displayResults(analysis);
  }

  function displayResults(analysis) {
    const { product, evaluation, signals, counterPurchasing } = analysis;

    // Header & Category
    resCategory.innerText = product.category.toUpperCase();

    // Risk Meter
    resRiskScore.innerText = `${evaluation.surgeRiskScore}/100`;
    resRiskTag.innerText = evaluation.riskLevel;
    resRiskTag.style.backgroundColor = evaluation.riskColor + "33";
    resRiskTag.style.color = evaluation.riskColor;
    resRiskTag.style.border = `1px solid ${evaluation.riskColor}`;

    resRiskBar.style.width = `${evaluation.surgeRiskScore}%`;
    resRiskBar.style.backgroundColor = evaluation.riskColor;
    resRiskSummary.innerText = evaluation.riskSummary;

    // Price Matrix
    resListedPrice.innerText = `₹${product.listedPrice.toLocaleString("en-IN")}`;
    resMrp.innerText = `Stated MRP: ₹${product.mrp.toLocaleString("en-IN")} (${product.currentDiscountPct}% Off)`;
    resFairPrice.innerText = `₹${evaluation.estimatedFairPrice.toLocaleString("en-IN")}`;
    resFairRange.innerText = `Estimated Fair Range: ₹${evaluation.fairPriceRange.low.toLocaleString("en-IN")} - ₹${evaluation.fairPriceRange.high.toLocaleString("en-IN")}`;

    // Markup Alert Banner
    if (evaluation.priceDifference > 0) {
      resMarkupBanner.style.display = "flex";
      resMarkupBanner.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
      resMarkupBanner.style.borderColor = "#ef4444";
      resMarkupTitle.innerText = `₹${evaluation.priceDifference.toLocaleString("en-IN")} (${evaluation.markupPercentage}%) Dynamic Surge Markup`;
      resMarkupTitle.style.color = "#fca5a5";
      resMarkupDesc.innerText = `The system flagged this listing as artificially inflated. Follow the counter-purchasing deal bridges below.`;
    } else {
      resMarkupBanner.style.display = "flex";
      resMarkupBanner.style.backgroundColor = "rgba(16, 185, 129, 0.12)";
      resMarkupBanner.style.borderColor = "#10b981";
      resMarkupTitle.innerText = `✅ Fair Market Price Verified (Zero Markup)`;
      resMarkupTitle.style.color = "#a7f3d0";
      resMarkupDesc.innerText = `Listed price is at or below fair market valuation. Safe to purchase without dynamic manipulation risk.`;
    }

    // Benchmark stats
    resHistFloor.innerText = `₹${product.historicalLowestFloor.toLocaleString("en-IN")}`;
    resHistAvg.innerText = `₹${product.historicalAverage.toLocaleString("en-IN")}`;
    resHistFair.innerText = `₹${evaluation.estimatedFairPrice.toLocaleString("en-IN")}`;

    // Detected Signals
    if (signals.length > 0) {
      resSignalsContainer.innerHTML = signals
        .map(
          (s) => `
        <div class="signal-row ${s.type}">
          <div class="signal-row-header">
            <span class="signal-row-title">${s.title}</span>
            <span class="signal-row-badge">${s.weight}</span>
          </div>
          <div class="signal-row-desc">${s.description}</div>
        </div>
      `
        )
        .join("");
    } else {
      resSignalsContainer.innerHTML = `
        <div class="signal-row" style="border-left-color: #10b981;">
          <div class="signal-row-header">
            <span class="signal-row-title">Clean Behavioral Baseline</span>
            <span class="signal-row-badge" style="color: #10b981;">Normal Session</span>
          </div>
          <div class="signal-row-desc">No repeated search velocity spikes or countdown pressure detected on this listing.</div>
        </div>
      `;
    }

    // Multi-Store Live Price Comparison Matrix
    resAlternativesContainer.innerHTML = counterPurchasing.alternativeDeals
      .map(
        (deal) => `
      <div class="retailer-row ${deal.isLowestPrice ? "best-deal-row" : ""}">
        <div class="retailer-info">
          <span class="retailer-logo">${deal.logo}</span>
          <div>
            <div class="retailer-title" style="display:flex; align-items:center; gap:6px;">
              ${deal.retailer}
              ${deal.isLowestPrice ? '<span style="background:#10b981; color:#fff; font-size:9px; font-weight:800; padding:1px 6px; border-radius:4px;">BEST PRICE</span>' : ""}
            </div>
            <div class="retailer-benefit">${deal.perk}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="text-align: right;">
            <div style="font-size: 15px; font-weight: 800; color: #34d399;">₹${deal.sellingPrice.toLocaleString("en-IN")}</div>
            ${deal.savingsVsFlipkart > 0 ? `<div style="font-size: 10px; color: #38bdf8; font-weight: 700;">Save ₹${deal.savingsVsFlipkart.toLocaleString("en-IN")}</div>` : ""}
          </div>
          <a href="${deal.url}" target="_blank" rel="noopener" class="btn-retailer" style="${deal.isLowestPrice ? "background:#059669;" : ""}">Buy ↗</a>
        </div>
      </div>
    `
      )
      .join("");

    // Counter Tactics
    resTacticsContainer.innerHTML = counterPurchasing.tactics
      .map(
        (t) => `
      <div class="tactic-card">
        <span class="tactic-icon">${t.icon}</span>
        <div>
          <div class="tactic-name">${t.title}</div>
          <div class="tactic-desc">${t.action}</div>
          <div class="tactic-target">🎯 Outcome: ${t.benefit}</div>
        </div>
      </div>
    `
      )
      .join("");

    // Payment Hacks
    resPaymentContainer.innerHTML = counterPurchasing.paymentHacks
      .map(
        (h) => `
      <div class="tactic-card">
        <span class="tactic-icon">💳</span>
        <div>
          <div class="tactic-name">${h.title} <span style="color:#34d399;">(${h.saving})</span></div>
          <div class="tactic-desc">${h.description}</div>
        </div>
      </div>
    `
      )
      .join("");

    // Render Price Floor History Chart
    renderPriceTrendChart(product, evaluation);
  }

  function renderPriceTrendChart(product, evaluation) {
    const ctx = document.getElementById("priceChart").getContext("2d");
    if (priceChartInstance) {
      priceChartInstance.destroy();
    }

    // Generate 90-day time points
    const labels = ["Day -90", "Day -75", "Day -60", "Day -45", "Day -30", "Day -15", "Day -7", "Today (Listed)"];

    // Simulate historical price curve leading to today
    const floor = product.historicalLowestFloor;
    const fair = evaluation.estimatedFairPrice;
    const listed = product.listedPrice;

    const dataPoints = [
      Math.round(fair * 1.08),
      Math.round(fair * 1.02),
      Math.round(floor * 1.05),
      floor,
      Math.round(fair * 0.98),
      Math.round(fair * 1.04),
      Math.round(fair * 1.10),
      listed
    ];

    const fairLine = Array(labels.length).fill(fair);
    const floorLine = Array(labels.length).fill(floor);

    priceChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Historical Market Price",
            data: dataPoints,
            borderColor: evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#2563eb",
            backgroundColor: "rgba(37, 99, 235, 0.08)",
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: [3, 3, 3, 4, 3, 3, 3, 7],
            pointBackgroundColor: [
              "#2563eb", "#2563eb", "#2563eb", "#10b981", "#2563eb", "#2563eb", "#2563eb",
              evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#10b981"
            ]
          },
          {
            label: "AI Fair Price Baseline",
            data: fairLine,
            borderColor: "#10b981",
            borderDash: [5, 5],
            borderWidth: 2,
            pointRadius: 0,
            fill: false
          },
          {
            label: "Historical Floor (Lowest)",
            data: floorLine,
            borderColor: "#0284c7",
            borderDash: [2, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: "#475569",
              font: { size: 11, weight: "700" }
            }
          },
          tooltip: {
            backgroundColor: "#0f172a",
            titleColor: "#ffffff",
            bodyColor: "#ffffff",
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ₹${context.raw.toLocaleString("en-IN")}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(0, 0, 0, 0.05)" },
            ticks: { color: "#64748b", font: { size: 10, weight: "600" } }
          },
          y: {
            grid: { color: "rgba(0, 0, 0, 0.05)" },
            ticks: {
              color: "#64748b",
              font: { size: 10, weight: "600" },
              callback: function (value) {
                return `₹${value.toLocaleString("en-IN")}`;
              }
            }
          }
        }
      }
    });
  }

  // Form submission
  inspectorForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const badges = [];
    if (checkScarcity.checked) badges.push("Only 1 item left in stock");
    if (checkTimer.checked) badges.push("Flash sale ends in 00:12:45");

    executeAnalysis({
      title: inputTitle.value.trim(),
      listedPrice: Number(inputListed.value),
      mrp: Number(inputMrp.value) || Number(inputListed.value) * 1.25,
      visitCount: Number(inputVisits.value) || 1,
      timeWindowMinutes: 30,
      scarcityBadges: badges,
      hasCountdownTimer: checkTimer.checked
    });
  });

  // Initialize
  renderScenarioButtons();
  loadScenario(scenarios[0]); // Loads the prompt test scenario by default
});
