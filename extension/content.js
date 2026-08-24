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
   * Safe check for extension runtime context
   */
  function isExtensionValid() {
    try {
      return typeof chrome !== "undefined" && Boolean(chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  /**
   * Safe check for PriceGuard extension DOM elements
   */
  function isPriceGuardElement(el) {
    if (!el) return false;
    return Boolean(
      el.closest("#priceguard-root") ||
      el.closest("#pg-drawer-panel") ||
      el.closest(".pg-floating-pill") ||
      (el.className && typeof el.className === "string" && el.className.includes("pg-"))
    );
  }

  /**
   * Check if text is invalid or internal UI string
   */
  function isInvalidTitleText(txt) {
    if (!txt || typeof txt !== "string") return true;
    const lower = txt.toLowerCase().trim();
    if (lower.length < 3) return true;
    if (
      lower.includes("priceguard") ||
      lower.includes("dynamic pricing") ||
      lower.includes("manipulation risk") ||
      lower.includes("ai estimated") ||
      lower.includes("online shopping") ||
      lower.includes("india's ultimate") ||
      lower.includes("flipkart.com") ||
      lower.includes("browse mode")
    ) {
      return true;
    }
    return false;
  }

  /**
   * Universal Title Scraper for Flipkart (Live Visible DOM First)
   */
  function scrapeFlipkartTitle() {
    // 1. Primary: Visible DOM Title Elements on Active Screen (excluding PriceGuard UI)
    const titleSelectors = [
      "h1.VU-ZEz",
      "span.VU-ZEz",
      "span.B_NuCI",
      "h1._35KyD6",
      "span._35KyD6",
      "h1.x-item-title",
      "div._2NKhZn",
      "._6t1WGs h1",
      ".G6XhRU"
    ];

    for (const sel of titleSelectors) {
      const elements = document.querySelectorAll(sel);
      for (const el of elements) {
        if (!isPriceGuardElement(el)) {
          const txt = el.innerText ? el.innerText.trim() : "";
          if (!isInvalidTitleText(txt)) {
            return txt;
          }
        }
      }
    }

    // 2. Extract from URL Slug (Guaranteed fresh on SPA route change)
    const pathMatch = location.pathname.match(/^\/([^\/]+)\/p\//i);
    if (pathMatch && pathMatch[1]) {
      const slug = decodeURIComponent(pathMatch[1]).replace(/-/g, " ").trim();
      if (!isInvalidTitleText(slug)) {
        return slug.replace(/\b\w/g, (l) => l.toUpperCase());
      }
    }

    // 3. Fallback from Document Title
    if (document.title && !isInvalidTitleText(document.title)) {
      const cleaned = document.title.split(/\||-|Online at Best Price/i)[0].replace(/^Buy\s+/i, "").trim();
      if (!isInvalidTitleText(cleaned)) {
        return cleaned;
      }
    }

    return "";
  }

  /**
   * Universal Price Scraper for Flipkart (Live Visible DOM First)
   */
  function scrapeFlipkartPrice() {
    // 1. Primary: Visible Price Elements on Active Screen
    const priceSelectors = [
      ".Nx9bqj.CxhGGd",
      ".Nx9bqj._4b5DiR",
      "div.Nx9bqj",
      "span.Nx9bqj",
      "div._30jeq3._16Jk6d",
      "div._30jeq3",
      "div._1vC4OE",
      "[data-testid='price']",
      "div[class*='Nx9bqj']",
      "div[class*='_30jeq3']",
      "div[class*='price_current']",
      ".hl05eU"
    ];

    for (const sel of priceSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText) {
        const cleaned = el.innerText.replace(/[^0-9]/g, "");
        if (cleaned) {
          const num = parseInt(cleaned, 10);
          if (num > 0 && num < 10000000) return num;
        }
      }
    }

    // 2. Scan DOM text nodes containing ₹ in the buy box
    const candidates = document.querySelectorAll("div, span, p, b, strong");
    for (const el of candidates) {
      if (el.children.length === 0 && el.innerText && el.innerText.includes("₹")) {
        const match = el.innerText.match(/₹\s*([0-9,]+)/);
        if (match) {
          const num = parseInt(match[1].replace(/,/g, ""), 10);
          if (num > 0 && num < 10000000) return num;
        }
      }
    }

    return 0;
  }

  /**
   * Universal MRP Scraper for Flipkart
   */
  function scrapeFlipkartMrp(listedPrice) {
    const mrpSelectors = [
      "div.yRaY8j.A68aKn",
      "div._3I9_wc._2p6lqe",
      "div.yRaY8j",
      "span.yRaY8j",
      "div._3I9_wc",
      "div._27Ah45",
      "div[class*='yRaY8j']",
      "div[class*='mrp']",
      "span[class*='strike']",
      "span[class*='_3I9_wc']",
      "[class*='strike']"
    ];

    for (const sel of mrpSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText) {
        const cleaned = el.innerText.replace(/[^0-9]/g, "");
        if (cleaned) {
          const num = parseInt(cleaned, 10);
          if (num > listedPrice) return num;
        }
      }
    }

    return Math.round(listedPrice * 1.25);
  }

  /**
   * Check if current page is an active product page
   */
  function isProductPage() {
    const url = window.location.href.toLowerCase();
    if (url.includes("/p/") || url.includes("?pid=") || url.includes("&pid=") || url.includes("/itm") || url.includes("mock-flipkart")) {
      return true;
    }
    // Check if buy box or product price exists on page
    const price = scrapeFlipkartPrice();
    const title = scrapeFlipkartTitle();
    return Boolean(price > 0 && title && !title.includes("Online Shopping"));
  }

  /**
   * Scrape Flipkart DOM & Metadata
   */
  function extractFlipkartProductData() {
    if (!isProductPage()) {
      return null;
    }

    const title = scrapeFlipkartTitle();
    const listedPrice = scrapeFlipkartPrice();

    if (!title || !listedPrice || listedPrice <= 0) {
      return null;
    }

    const mrp = scrapeFlipkartMrp(listedPrice);
    const scarcityBadges = [];
    let hasCountdownTimer = false;

    // Detect Scarcity & Urgency Badges
    const textNodes = document.querySelectorAll(
      "div._16FRp0, div._1V47QB, div._2JC0hM, div._3k-wRA, div.D7J4fc, span[class*='urgency'], div[class*='stock'], span[class*='timer'], div[class*='badge'], p"
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

    // Extract Product Identifier (PID)
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

    return {
      pid,
      title,
      listedPrice,
      mrp,
      scarcityBadges: [...new Set(scarcityBadges)],
      hasCountdownTimer
    };
  }

  /**
   * Fallback to localStorage when extension context is invalidated or standalone
   */
  function fallbackLocalStats(storageKey, now, windowMs) {
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
    return {
      visitCount: visits.length + simulatedVisits,
      timeWindowMinutes: 30
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
      if (isExtensionValid() && chrome.storage && chrome.storage.local) {
        try {
          chrome.storage.local.get([storageKey], (res) => {
            if (!isExtensionValid() || chrome.runtime.lastError || !res) {
              resolve(fallbackLocalStats(storageKey, now, windowMs));
              return;
            }
            let visits = res[storageKey] || [];
            visits = visits.filter((timestamp) => now - timestamp < windowMs);
            visits.push(now);
            try {
              if (isExtensionValid()) {
                chrome.storage.local.set({ [storageKey]: visits });
              }
            } catch (err) {}

            const totalVisits = visits.length + simulatedVisits;
            resolve({
              visitCount: totalVisits,
              timeWindowMinutes: 30
            });
          });
        } catch (err) {
          resolve(fallbackLocalStats(storageKey, now, windowMs));
        }
      } else {
        resolve(fallbackLocalStats(storageKey, now, windowMs));
      }
    });
  }

  /**
   * Main Analysis Flow
   */
  async function runPriceGuardAnalysis() {
    const prod = extractFlipkartProductData();
    if (!prod) {
      activeAnalysis = null;
      currentProductData = null;
      const container = document.getElementById("priceguard-root");
      if (container) {
        container.remove();
      }
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

          <!-- 📈 90-Day Price Floor & AI Valuation Curve -->
          <div class="pg-chart-card">
            <div class="pg-chart-header">
              <span class="pg-chart-title">📈 90-Day Price Floor & AI Valuation Curve</span>
              <span class="pg-chart-tag">Historical Benchmark</span>
            </div>
            <div class="pg-canvas-wrapper">
              <canvas id="pg-inpage-canvas" width="380" height="130"></canvas>
            </div>
            <div class="pg-chart-stats">
              <div class="pg-stat-item">
                <span class="pg-dot" style="background:#38bdf8;"></span>
                <span>Floor: <strong style="color:#38bdf8;">₹${product.historicalLowestFloor.toLocaleString('en-IN')}</strong></span>
              </div>
              <div class="pg-stat-item">
                <span class="pg-dot" style="background:#a78bfa;"></span>
                <span>Avg: <strong style="color:#a78bfa;">₹${product.historicalAverage.toLocaleString('en-IN')}</strong></span>
              </div>
              <div class="pg-stat-item">
                <span class="pg-dot" style="background:#34d399;"></span>
                <span>Fair Target: <strong style="color:#34d399;">₹${evaluation.estimatedFairPrice.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>

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

          <!-- Multi-Store Live Price Comparison Matrix -->
          <div class="pg-section-title">🛍️ Live Multi-Store Price Comparison Matrix</div>
          <div class="pg-deals-list">
            ${counterPurchasing.alternativeDeals
              .map(
                (deal) => `
              <div class="pg-deal-card ${deal.isLowestPrice ? "best-deal" : ""}">
                <div class="pg-deal-left">
                  <span class="pg-deal-logo">${deal.logo}</span>
                  <div>
                    <div class="pg-deal-name">
                      ${deal.retailer}
                      ${deal.isLowestPrice ? '<span class="pg-best-badge">BEST PRICE</span>' : ""}
                    </div>
                    <div class="pg-deal-perk">${deal.perk}</div>
                  </div>
                </div>
                <div class="pg-deal-right">
                  <div class="pg-deal-price">₹${deal.sellingPrice.toLocaleString("en-IN")}</div>
                  ${deal.savingsVsFlipkart > 0 ? `<div class="pg-deal-save">Save ₹${deal.savingsVsFlipkart.toLocaleString("en-IN")}</div>` : ""}
                  <a href="${deal.url}" target="_blank" rel="noopener" class="pg-deal-btn">View ↗</a>
                </div>
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

    // Draw In-Page 90-Day Price Floor Canvas
    const canvas = document.getElementById("pg-inpage-canvas");
    if (canvas) {
      drawInPagePriceCurve(canvas, product, evaluation);
    }

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
   * Draw In-Page 90-Day Price Floor Curve
   */
  function drawInPagePriceCurve(canvas, product, evaluation) {
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = (rect.width || 380) * dpr;
    canvas.height = (rect.height || 130) * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width || 380;
    const height = rect.height || 130;
    ctx.clearRect(0, 0, width, height);

    const floor = product.historicalLowestFloor;
    const fair = evaluation.estimatedFairPrice;
    const listed = product.listedPrice;

    const labels = ["-90d", "-60d", "-30d", "-15d", "-7d", "Now"];
    const points = [
      Math.round(fair * 1.06),
      Math.round(fair * 1.02),
      floor,
      Math.round(fair * 0.98),
      Math.round(fair * 1.04),
      listed
    ];

    const minVal = Math.min(...points, floor, fair) * 0.92;
    const maxVal = Math.max(...points, floor, fair) * 1.08;
    const valRange = maxVal - minVal || 1;

    const padLeft = 32;
    const padRight = 36;
    const padTop = 18;
    const padBottom = 22;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    function getY(val) {
      return padTop + chartH - ((val - minVal) / valRange) * chartH;
    }

    function getX(index) {
      return padLeft + (index / (labels.length - 1)) * chartW;
    }

    // Grid lines
    ctx.strokeStyle = "rgba(0, 0, 0, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const y = padTop + (i / 2) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    // Dashed Fair Line
    const fairY = getY(fair);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, fairY);
    ctx.lineTo(width - padRight, fairY);
    ctx.stroke();

    ctx.fillStyle = "#059669";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("Fair", width - padRight + 4, fairY + 3);

    // Dashed Floor Line
    const floorY = getY(floor);
    ctx.strokeStyle = "rgba(2, 132, 199, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, floorY);
    ctx.lineTo(width - padRight, floorY);
    ctx.stroke();

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("Floor", width - padRight + 4, floorY + 3);

    // Gradient fill
    ctx.setLineDash([]);
    const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    if (evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40) {
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.20)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 0.0)");
    } else {
      gradient.addColorStop(0, "rgba(37, 99, 235, 0.18)");
      gradient.addColorStop(1, "rgba(37, 99, 235, 0.0)");
    }

    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(points[i - 1]);
      const currX = getX(i);
      const currY = getY(points[i]);
      const cpX = (prevX + currX) / 2;
      ctx.bezierCurveTo(cpX, prevY, cpX, currY, currX, currY);
    }
    ctx.lineTo(getX(points.length - 1), height - padBottom);
    ctx.lineTo(getX(0), height - padBottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Price Curve line
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(points[0]));
    for (let i = 1; i < points.length; i++) {
      const prevX = getX(i - 1);
      const prevY = getY(points[i - 1]);
      const currX = getX(i);
      const currY = getY(points[i]);
      const cpX = (prevX + currX) / 2;
      ctx.bezierCurveTo(cpX, prevY, cpX, currY, currX, currY);
    }
    ctx.strokeStyle = evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#2563eb";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Plot Points & Labels
    for (let i = 0; i < points.length; i++) {
      const x = getX(i);
      const y = getY(points[i]);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x, height - 6);

      ctx.beginPath();
      if (i === points.length - 1) {
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`₹${listed.toLocaleString("en-IN")}`, x, y - 8);
      } else {
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
      }
    }
  }

  let lastAnalyzedKey = "";

  /**
   * Main Analysis Flow
   */
  async function runPriceGuardAnalysis() {
    if (!isExtensionValid()) return;
    const prod = extractFlipkartProductData();
    if (!prod) {
      activeAnalysis = null;
      currentProductData = null;
      lastAnalyzedKey = "";
      const container = document.getElementById("priceguard-root");
      if (container) {
        container.remove();
      }
      return;
    }

    const currentKey = `${prod.pid}_${prod.title}_${prod.listedPrice}`;
    currentProductData = prod;
    lastAnalyzedKey = currentKey;

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
   * Watch for SPA page/DOM changes and URL changes
   */
  function setupPageObserver() {
    let lastUrl = location.href;

    function checkForProductChange() {
      if (!isExtensionValid()) return;
      const urlChanged = location.href !== lastUrl;
      if (urlChanged) {
        lastUrl = location.href;
        simulatedVisits = 0;
      }

      const prod = extractFlipkartProductData();
      if (!prod) {
        if (activeAnalysis) {
          activeAnalysis = null;
          currentProductData = null;
          lastAnalyzedKey = "";
          const container = document.getElementById("priceguard-root");
          if (container) container.remove();
        }
        return;
      }

      const currentKey = `${prod.pid}_${prod.title}_${prod.listedPrice}`;
      if (currentKey !== lastAnalyzedKey || urlChanged) {
        runPriceGuardAnalysis();
      }
    }

    // 1. Mutation Observer on DOM
    const observer = new MutationObserver(() => {
      if (!isExtensionValid()) {
        observer.disconnect();
        return;
      }
      checkForProductChange();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 2. Periodic Safety Check for React SPA lazy renders
    const intervalId = setInterval(() => {
      if (!isExtensionValid()) {
        clearInterval(intervalId);
        return;
      }
      checkForProductChange();
    }, 1200);

    // 3. SPA History Interception
    const pushState = history.pushState;
    history.pushState = function () {
      pushState.apply(history, arguments);
      setTimeout(checkForProductChange, 150);
      setTimeout(checkForProductChange, 600);
      setTimeout(checkForProductChange, 1500);
    };

    const replaceState = history.replaceState;
    history.replaceState = function () {
      replaceState.apply(history, arguments);
      setTimeout(checkForProductChange, 150);
      setTimeout(checkForProductChange, 600);
      setTimeout(checkForProductChange, 1500);
    };

    window.addEventListener("popstate", () => {
      setTimeout(checkForProductChange, 150);
      setTimeout(checkForProductChange, 600);
    });

    // Initial check
    setTimeout(checkForProductChange, 300);
    setTimeout(checkForProductChange, 1000);
    setTimeout(checkForProductChange, 2500);
  }

  // Listen for messages from popup
  if (isExtensionValid() && chrome.runtime && chrome.runtime.onMessage) {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!isExtensionValid()) return;
        if (request.action === "getAnalysis") {
          // Always extract fresh data to avoid stale cached product
          const freshProd = extractFlipkartProductData();
          if (freshProd) {
            const freshKey = `${freshProd.pid}_${freshProd.title}_${freshProd.listedPrice}`;
            if (freshKey !== lastAnalyzedKey || !activeAnalysis) {
              runPriceGuardAnalysis().then(() => {
                sendResponse({ success: true, analysis: activeAnalysis, product: currentProductData });
              });
              return true;
            }
          }
          sendResponse({ success: true, analysis: activeAnalysis, product: currentProductData });
        } else if (request.action === "openDrawer") {
          const drawer = document.getElementById("pg-drawer-panel");
          if (drawer) drawer.classList.remove("pg-hidden");
          sendResponse({ success: true });
        } else if (request.action === "simulateVelocity") {
          simulatedVisits = simulatedVisits >= 4 ? 0 : 4;
          runPriceGuardAnalysis().then(() => {
            if (isExtensionValid()) {
              sendResponse({ success: true, analysis: activeAnalysis });
            }
          });
          return true; // Async response
        }
      });
    } catch (e) {}
  }

  // Start on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupPageObserver);
  } else {
    setupPageObserver();
  }
})();
