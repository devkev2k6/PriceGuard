/**
 * PriceGuard AI - Live Flipkart Content Script
 * Directly executes on Flipkart product pages to detect dynamic pricing,
 * calculate AI Fair Price, and inject in-page counter-purchasing tools.
 */

(function () {
  let isInitialized = false;
  let activeAnalysis = null;
  let simulatedVisits = 0;
  let currentProductData = null;

  // Initialize Price Engine
  const engine = new PriceGuardEngine(PriceGuardDataset);

  /**
   * Scrape Flipkart DOM & Metadata
   */
  function extractFlipkartProductData() {
    let title = "";
    let listedPrice = 0;
    let mrp = 0;
    const scarcityBadges = [];
    let hasCountdownTimer = false;

    // 1. Try Schema.org JSON-LD first (Most reliable across Flipkart redesigns)
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.innerText);
        if (data["@type"] === "Product" || (Array.isArray(data) && data[0] && data[0]["@type"] === "Product")) {
          const prod = Array.isArray(data) ? data[0] : data;
          if (prod.name) title = prod.name;
          if (prod.offers) {
            const offer = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers;
            if (offer && offer.price) listedPrice = Number(offer.price);
          }
        }
      } catch (e) {
        // Ignore json parse error
      }
    }

    // 2. Extract Title from DOM if not found in JSON-LD
    if (!title) {
      const titleEl = document.querySelector(
        'h1.VU-ZEz, span.B_NuCI, h1._35KyD6, span._35KyD6, h1.x-item-title, h1[class*="title"], h1'
      );
      if (titleEl) {
        title = titleEl.innerText.trim();
      } else {
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle && ogTitle.content) {
          title = ogTitle.content.split("|")[0].replace("Buy", "").trim();
        }
      }
    }

    // 3. Extract Current Price from DOM
    if (!listedPrice || listedPrice === 0) {
      const priceSelectors = [
        '.Nx9bqj.CxhGGd',
        '.Nx9bqj._4b5DiR',
        'div._30jeq3._16Jk6d',
        'div._30jeq3',
        'div.Nx9bqj',
        'div._1vC4OE',
        '[data-testid="price"]',
        'div[class*="price_current"]',
        'div[class*="_30jeq3"]'
      ];
      for (const sel of priceSelectors) {
        const priceEl = document.querySelector(sel);
        if (priceEl && priceEl.innerText) {
          const num = parseInt(priceEl.innerText.replace(/[^0-9]/g, ""), 10);
          if (num && num > 0) {
            listedPrice = num;
            break;
          }
        }
      }
    }

    // 4. Extract MRP / Original Price from DOM
    const mrpSelectors = [
      'div.yRaY8j.A68aKn',
      'div._3I9_wc._2p6lqe',
      'div.yRaY8j',
      'div._3I9_wc',
      'div._27Ah45',
      'div[class*="mrp"]',
      'span[class*="strike"]'
    ];
    for (const sel of mrpSelectors) {
      const mrpEl = document.querySelector(sel);
      if (mrpEl && mrpEl.innerText) {
        const num = parseInt(mrpEl.innerText.replace(/[^0-9]/g, ""), 10);
        if (num && num > listedPrice) {
          mrp = num;
          break;
        }
      }
    }

    // If MRP not explicitly given, derive reasonable baseline
    if (!mrp || mrp <= listedPrice) {
      mrp = Math.round(listedPrice * 1.25);
    }

    // 5. Detect Scarcity & Urgency Badges
    const textNodes = document.querySelectorAll(
      'div._16FRp0, div._1V47QB, div._2JC0hM, div._3k-wRA, div.D7J4fc, span[class*="urgency"], div[class*="stock"], span[class*="timer"], div[class*="badge"], p'
    );
    for (const node of textNodes) {
      const txt = node.innerText || "";
      if (txt.length < 80) {
        if (/only\s*\d+\s*(left|seat|unit|item|stock)/i.test(txt)) {
          scarcityBadges.push(txt.trim());
        } else if (/hurry|selling fast|few left|in high demand|almost sold out/i.test(txt)) {
          scarcityBadges.push(txt.trim());
        } else if (/ends in|countdown|\b\d{2}:\d{2}:\d{2}\b/i.test(txt)) {
          hasCountdownTimer = true;
          scarcityBadges.push(txt.trim());
        }
      }
    }

    // 6. Extract Product Identifier (PID)
    let pid = "item_default";
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("pid")) {
      pid = urlParams.get("pid");
    } else {
      const match = window.location.pathname.match(/\/p\/(itm[a-z0-9]+)/i);
      if (match && match[1]) {
        pid = match[1];
      } else if (title) {
        pid = title.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
      }
    }

    if (!title && !listedPrice) {
      return null;
    }

    return {
      pid,
      title: title || "Flipkart Product Listing",
      listedPrice: listedPrice || 1499,
      mrp: mrp || 1999,
      scarcityBadges: [...new Set(scarcityBadges)],
      hasCountdownTimer
    };
  }

  /**
   * Track Repeated Visits in Chrome Storage (Velocity Detector)
   */
  async function recordAndGetVisitStats(pid) {
    const storageKey = `pg_visit_history_${pid}`;
    const now = Date.now();
    const windowMs = 30 * 60 * 1000; // 30 minutes window

    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([storageKey], (res) => {
          let visits = res[storageKey] || [];
          // Filter out visits older than 30 mins
          visits = visits.filter((timestamp) => now - timestamp < windowMs);
          // Add current visit
          visits.push(now);
          chrome.storage.local.set({ [storageKey]: visits });

          const totalVisits = visits.length + simulatedVisits;
          resolve({
            visitCount: totalVisits,
            timeWindowMinutes: 30
          });
        });
      } else {
        // Fallback for standalone/local environment
        let visits = [];
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) visits = JSON.parse(raw);
        } catch (e) {}
        visits = visits.filter((timestamp) => now - timestamp < windowMs);
        visits.push(now);
        try {
          localStorage.setItem(storageKey, JSON.stringify(visits));
        } catch (e) {}
        resolve({
          visitCount: visits.length + simulatedVisits,
          timeWindowMinutes: 30
        });
      }
    });
  }

  /**
   * Main Analysis Flow
   */
  async function runPriceGuardAnalysis() {
    const prod = extractFlipkartProductData();
    if (!prod) {
      // Not a product page or not loaded yet
      return;
    }

    currentProductData = prod;
    const visitStats = await recordAndGetVisitStats(prod.pid);

    // Run AI Engine
    activeAnalysis = engine.analyze({
      listedPrice: prod.listedPrice,
      mrp: prod.mrp,
      title: prod.title,
      visitCount: visitStats.visitCount,
      timeWindowMinutes: visitStats.timeWindowMinutes,
      scarcityBadges: prod.scarcityBadges,
      hasCountdownTimer: prod.hasCountdownTimer
    });

    renderPriceGuardUI(activeAnalysis);
  }

  /**
   * Render or Update In-Page Widget
   */
  function renderPriceGuardUI(analysis) {
    let container = document.getElementById("priceguard-root");
    if (!container) {
      container = document.createElement("div");
      container.id = "priceguard-root";
      document.body.appendChild(container);
    }

    const { product, evaluation, signals, counterPurchasing } = analysis;
    const isCritical = evaluation.surgeRiskScore >= 70;
    const isModerate = evaluation.surgeRiskScore >= 45 && evaluation.surgeRiskScore < 70;
    const badgeClass = isCritical ? "pg-badge-critical" : isModerate ? "pg-badge-moderate" : "pg-badge-low";
    const statusText = isCritical ? `⚠️ Surge: ₹${evaluation.priceDifference.toLocaleString('en-IN')} Markup` : isModerate ? `⚡ Moderate Surge (+${evaluation.markupPercentage}%)` : `✅ Fair Price Verified`;

    container.innerHTML = `
      <!-- Floating Trigger Pill -->
      <div class="pg-floating-pill" id="pg-pill-btn" title="Click to view AI Fair Price & Counter-Purchasing Options">
        <div class="pg-pill-logo">🛡️</div>
        <div class="pg-pill-content">
          <div class="pg-pill-title">PriceGuard AI <span class="pg-pill-badge ${badgeClass}">${statusText}</span></div>
          <div class="pg-pill-subtitle">Fair Price: ₹${evaluation.estimatedFairPrice.toLocaleString('en-IN')} (Listed: ₹${product.listedPrice.toLocaleString('en-IN')})</div>
        </div>
      </div>

      <!-- Slide-out Drawer Panel -->
      <div class="pg-drawer pg-hidden" id="pg-drawer-panel">
        <!-- Header -->
        <div class="pg-drawer-header">
          <div class="pg-header-left">
            <span class="pg-header-icon">🛡️</span>
            <div>
              <div class="pg-header-title">PriceGuard AI • Price Intelligence</div>
              <div class="pg-header-meta">${product.category} • Real-Time Audit</div>
            </div>
          </div>
          <button class="pg-close-btn" id="pg-close-btn" title="Close Panel">✕</button>
        </div>

        <!-- Body -->
        <div class="pg-drawer-body">
          <!-- Surge & Manipulation Risk Card -->
          <div class="pg-risk-card">
            <div class="pg-risk-header">
              <span class="pg-risk-title">Dynamic Pricing / Manipulation Risk</span>
              <span class="pg-risk-score-badge ${badgeClass}">${evaluation.surgeRiskScore}/100 • ${evaluation.riskLevel}</span>
            </div>
            <div class="pg-gauge-bar">
              <div class="pg-gauge-fill" style="width: ${evaluation.surgeRiskScore}%; background: ${evaluation.riskColor};"></div>
            </div>
            <div class="pg-risk-desc">${evaluation.riskSummary}</div>
          </div>

          <!-- Price Matrix Comparison -->
          <div class="pg-price-grid">
            <div class="pg-price-box">
              <div class="pg-price-label">LISTED ON FLIPKART</div>
              <div class="pg-price-val">₹${product.listedPrice.toLocaleString('en-IN')}</div>
              <div class="pg-price-sub">Stated MRP: ₹${product.mrp.toLocaleString('en-IN')}</div>
            </div>
            <div class="pg-price-box pg-highlight-box">
              <div class="pg-price-label">AI ESTIMATED FAIR PRICE</div>
              <div class="pg-price-val">₹${evaluation.estimatedFairPrice.toLocaleString('en-IN')}</div>
              <div class="pg-price-sub">Band: ₹${evaluation.fairPriceRange.low.toLocaleString('en-IN')} - ₹${evaluation.fairPriceRange.high.toLocaleString('en-IN')}</div>
            </div>
          </div>

          <!-- Price Difference Alert -->
          ${
            evaluation.priceDifference > 0
              ? `
            <div class="pg-diff-banner">
              <span class="pg-diff-icon">💡</span>
              <div class="pg-diff-text">
                This item has an estimated <span class="pg-diff-strong">₹${evaluation.priceDifference.toLocaleString('en-IN')} (${evaluation.markupPercentage}%)</span> dynamic surge markup. Follow the counter-purchasing plan below.
              </div>
            </div>
          `
              : `
            <div class="pg-diff-banner" style="background:#ecfdf5; border-color:#a7f3d0;">
              <span class="pg-diff-icon">🎉</span>
              <div class="pg-diff-text" style="color:#065f46;">
                Great deal! Listed price is within fair market value. Historical Floor is ₹${product.historicalLowestFloor.toLocaleString('en-IN')}.
              </div>
            </div>
          `
          }

          <!-- Warning Signals Breakdown -->
          ${
            signals.length > 0
              ? `
            <div class="pg-section-title">🚨 Detected Urgency & Manipulation Signals (${signals.length})</div>
            <div class="pg-signals-list">
              ${signals
                .map(
                  (s) => `
                <div class="pg-signal-item pg-${s.type}">
                  <div class="pg-signal-title-row">
                    <span class="pg-signal-title">${s.title}</span>
                    <span class="pg-signal-weight">${s.weight}</span>
                  </div>
                  <div class="pg-signal-desc">${s.description}</div>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }

          <!-- Counter-Purchasing Alternative Store Bridges -->
          <div class="pg-section-title">🛍️ Verified Alternative Retailer Bridges</div>
          <div class="pg-deals-list">
            ${counterPurchasing.alternativeDeals
              .map(
                (deal) => `
              <div class="pg-deal-card">
                <div class="pg-deal-left">
                  <span class="pg-deal-logo">${deal.logo}</span>
                  <div>
                    <div class="pg-deal-name">${deal.retailer}</div>
                    <div class="pg-deal-est">${deal.badge} • ${deal.discountEstimate}</div>
                  </div>
                </div>
                <a href="${deal.url}" target="_blank" rel="noopener" class="pg-deal-btn">Check Deal ↗</a>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- Counter Actions & Timing Tactics -->
          <div class="pg-section-title">🛡️ Smart Counter-Purchasing Tactics</div>
          <div class="pg-tactics-list">
            ${counterPurchasing.tactics
              .map(
                (t) => `
              <div class="pg-tactic-item">
                <span class="pg-tactic-icon">${t.icon}</span>
                <div>
                  <div class="pg-tactic-title">${t.title}</div>
                  <div class="pg-tactic-action">${t.action}</div>
                  <div class="pg-tactic-benefit">Target Outcome: ${t.benefit}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <!-- Payment Offers Optimization -->
          <div class="pg-section-title">💳 Checkout & Payment Hack Optimizer</div>
          <div class="pg-tactics-list">
            ${counterPurchasing.paymentHacks
              .map(
                (h) => `
              <div class="pg-tactic-item">
                <span class="pg-tactic-icon">💳</span>
                <div>
                  <div class="pg-tactic-title">${h.title} <span style="color:#059669; font-weight:800;">(${h.saving})</span></div>
                  <div class="pg-tactic-action">${h.description}</div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Footer -->
        <div class="pg-drawer-footer">
          <button class="pg-sim-btn" id="pg-sim-velocity-btn">
            + Simulate 4x Repeated Views (${analysis.evaluation.signalsBreakdown.velocityScore > 0 ? "Active" : "Test"})
          </button>
          <a href="http://localhost:3000" target="_blank" class="pg-open-dash-link">Open Full Dashboard ↗</a>
        </div>
      </div>
    `;

    // Attach Event Listeners
    const pillBtn = document.getElementById("pg-pill-btn");
    const drawer = document.getElementById("pg-drawer-panel");
    const closeBtn = document.getElementById("pg-close-btn");
    const simBtn = document.getElementById("pg-sim-velocity-btn");

    if (pillBtn && drawer) {
      pillBtn.onclick = () => drawer.classList.toggle("pg-hidden");
    }
    if (closeBtn && drawer) {
      closeBtn.onclick = () => drawer.classList.add("pg-hidden");
    }
    if (simBtn) {
      simBtn.onclick = () => {
        simulatedVisits = simulatedVisits >= 4 ? 0 : 4;
        runPriceGuardAnalysis();
      };
    }
  }

  /**
   * Watch for SPA page/DOM changes
   */
  function setupPageObserver() {
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        simulatedVisits = 0;
        setTimeout(runPriceGuardAnalysis, 800);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial delayed run to allow Flipkart React hydration
    setTimeout(runPriceGuardAnalysis, 1200);
    setTimeout(runPriceGuardAnalysis, 3000);
  }

  // Start on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPageObserver);
  } else {
    setupPageObserver();
  }
})();
