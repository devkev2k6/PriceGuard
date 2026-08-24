/**
 * PriceGuard AI - Popup Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("loading-state");
  const analysisCard = document.getElementById("analysis-card");
  const emptyState = document.getElementById("empty-state");

  const prodCategory = document.getElementById("prod-category");
  const prodTitle = document.getElementById("prod-title");
  const riskBadge = document.getElementById("risk-badge");
  const meterFill = document.getElementById("meter-fill");
  const riskText = document.getElementById("risk-text");
  const listedPriceEl = document.getElementById("listed-price");
  const fairPriceEl = document.getElementById("fair-price");
  const markupAlert = document.getElementById("markup-alert");
  const signalsList = document.getElementById("signals-mini-list");
  const btnShowOverlay = document.getElementById("btn-show-overlay");

  const btnTestFlight = document.getElementById("btn-test-flight");
  const btnTestMobile = document.getElementById("btn-test-mobile");

  const engine = new PriceGuardEngine(PriceGuardDataset);

  // Check current active tab
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && (tab.url.includes("flipkart.com") || tab.url.includes("localhost"))) {
        // Execute extraction script on tab
        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: () => {
              // Read global or DOM values from content script
              const titleEl = document.querySelector('h1.VU-ZEz, span.B_NuCI, h1._35KyD6, span._35KyD6, h1');
              const priceEl = document.querySelector('.Nx9bqj.CxhGGd, .Nx9bqj._4b5DiR, div._30jeq3, div.Nx9bqj');
              const title = titleEl ? titleEl.innerText.trim() : document.title;
              const price = priceEl ? parseInt(priceEl.innerText.replace(/[^0-9]/g, ""), 10) : 0;
              return { title, price, url: location.href };
            }
          },
          (results) => {
            if (results && results[0] && results[0].result && results[0].result.price > 0) {
              const res = results[0].result;
              const analysis = engine.analyze({
                title: res.title,
                listedPrice: res.price,
                visitCount: 2,
                timeWindowMinutes: 20
              });
              renderAnalysis(analysis);
            } else {
              showEmptyState();
            }
          }
        );
      } else {
        showEmptyState();
      }
    } catch (e) {
      showEmptyState();
    }
  } else {
    // Standalone popup preview
    showEmptyState();
  }

  function showEmptyState() {
    loadingEl.classList.add("hidden");
    analysisCard.classList.add("hidden");
    emptyState.classList.remove("hidden");
  }

  function renderAnalysis(analysis) {
    loadingEl.classList.add("hidden");
    emptyState.classList.add("hidden");
    analysisCard.classList.remove("hidden");

    const { product, evaluation, signals } = analysis;

    prodCategory.innerText = product.category.toUpperCase();
    prodTitle.innerText = product.title;
    prodTitle.title = product.title;

    riskBadge.innerText = `${evaluation.surgeRiskScore}/100 • ${evaluation.riskLevel}`;
    riskBadge.style.backgroundColor = evaluation.riskColor + "33";
    riskBadge.style.color = evaluation.riskColor;
    riskBadge.style.border = `1px solid ${evaluation.riskColor}`;

    meterFill.style.width = `${evaluation.surgeRiskScore}%`;
    meterFill.style.backgroundColor = evaluation.riskColor;

    riskText.innerText = evaluation.riskSummary;

    listedPriceEl.innerText = `₹${product.listedPrice.toLocaleString("en-IN")}`;
    fairPriceEl.innerText = `₹${evaluation.estimatedFairPrice.toLocaleString("en-IN")}`;

    if (evaluation.priceDifference > 0) {
      markupAlert.innerHTML = `<span>⚠️ <strong>₹${evaluation.priceDifference.toLocaleString("en-IN")} (${evaluation.markupPercentage}%)</strong> Dynamic Markup</span>`;
      markupAlert.classList.remove("hidden");
    } else {
      markupAlert.innerHTML = `<span>✅ <strong>Fair Market Value</strong> (No surge markup)</span>`;
      markupAlert.style.borderColor = "#10b981";
      markupAlert.style.color = "#a7f3d0";
      markupAlert.style.background = "rgba(16, 185, 129, 0.15)";
    }

    signalsList.innerHTML = signals
      .slice(0, 2)
      .map((s) => `<div class="signal-chip ${s.type}"><strong>${s.title}</strong>: ${s.weight}</div>`)
      .join("");

    if (btnShowOverlay) {
      btnShowOverlay.onclick = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const drawer = document.getElementById("pg-drawer-panel");
              if (drawer) drawer.classList.remove("pg-hidden");
            }
          });
          window.close();
        }
      };
    }
  }

  // Quick Test Flight Scenario (Prompt Scenario)
  if (btnTestFlight) {
    btnTestFlight.onclick = () => {
      const flightAnalysis = engine.analyze({
        listedPrice: 7800,
        mrp: 9999,
        title: "Bangalore to Kolkata flight/conference pass",
        visitCount: 4,
        timeWindowMinutes: 30,
        scarcityBadges: ["Only 1 seat left", "Hurry, selling fast"],
        hasCountdownTimer: true
      });
      renderAnalysis(flightAnalysis);
    };
  }

  // Quick Test Mobile Scenario
  if (btnTestMobile) {
    btnTestMobile.onclick = () => {
      const mobileAnalysis = engine.analyze({
        listedPrice: 74999,
        mrp: 79900,
        title: "Flagship 5G Smartphone (256GB)",
        visitCount: 3,
        timeWindowMinutes: 15,
        scarcityBadges: ["Only 2 left in stock"],
        hasCountdownTimer: false
      });
      renderAnalysis(mobileAnalysis);
    };
  }
});
