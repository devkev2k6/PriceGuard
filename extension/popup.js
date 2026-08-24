/**
 * PriceGuard AI - Popup Script with In-Popup 90-Day Price Floor & AI Valuation Curve
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
  const mrpPriceEl = document.getElementById("mrp-price");
  const fairPriceEl = document.getElementById("fair-price");
  const fairRangeEl = document.getElementById("fair-range");
  const markupAlert = document.getElementById("markup-alert");
  const signalsList = document.getElementById("signals-mini-list");
  const popupAlternatives = document.getElementById("popup-alternatives");

  const statFloor = document.getElementById("stat-floor");
  const statAvg = document.getElementById("stat-avg");
  const statFair = document.getElementById("stat-fair");
  const chartCanvas = document.getElementById("popup-price-canvas");

  const btnShowOverlay = document.getElementById("btn-show-overlay");
  const btnToggleSim = document.getElementById("btn-toggle-sim");

  const btnTestFlight = document.getElementById("btn-test-flight");
  const btnTestMobile = document.getElementById("btn-test-mobile");
  const btnTestHeadphones = document.getElementById("btn-test-headphones");

  const engine = new PriceGuardEngine(PriceGuardDataset);
  let activeTabId = null;

  // Query active tab
  if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && tab.url && (tab.url.includes("flipkart.com") || tab.url.includes("localhost") || tab.url.includes("127.0.0.1"))) {
        activeTabId = tab.id;

        // Try direct message to content script with auto-retry
        let responded = false;

        function tryGetAnalysis(attempt = 1) {
          chrome.tabs.sendMessage(tab.id, { action: "getAnalysis" }, (response) => {
            if (!chrome.runtime.lastError && response && response.analysis) {
              responded = true;
              renderAnalysis(response.analysis);
            } else if (attempt < 3 && !responded) {
              setTimeout(() => tryGetAnalysis(attempt + 1), 200);
            } else if (!responded) {
              // Fallback: Scrape DOM directly via chrome.scripting
              performFallbackDOMScrape(tab.id);
            }
          });
        }

        tryGetAnalysis(1);
      } else {
        showEmptyState();
      }
    } catch (e) {
      showEmptyState();
    }
  } else {
    showEmptyState();
  }

  function performFallbackDOMScrape(tabId) {
    if (!chrome.scripting) {
      showEmptyState();
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        func: () => {
          const url = location.href.toLowerCase();
          const isProductUrl = url.includes("/p/") || url.includes("?pid=") || url.includes("&pid=") || url.includes("/itm") || url.includes("mock-flipkart");

          function isPriceGuardElement(el) {
            if (!el) return false;
            return Boolean(
              el.closest("#priceguard-root") ||
              el.closest("#pg-drawer-panel") ||
              el.closest(".pg-floating-pill") ||
              (el.className && typeof el.className === "string" && el.className.includes("pg-"))
            );
          }

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

          // 1. Scrape Title (Visible DOM first, then URL slug)
          let title = "";
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
                  title = txt;
                  break;
                }
              }
            }
            if (title) break;
          }

          // Extract from URL Slug if DOM element not resolved
          if (!title) {
            const pathMatch = location.pathname.match(/^\/([^\/]+)\/p\//i);
            if (pathMatch && pathMatch[1]) {
              const slug = decodeURIComponent(pathMatch[1]).replace(/-/g, " ").trim();
              if (!isInvalidTitleText(slug)) {
                title = slug.replace(/\b\w/g, (l) => l.toUpperCase());
              }
            }
          }

          if (!title && document.title && !isInvalidTitleText(document.title)) {
            const cleaned = document.title.split(/\||-|Online at Best Price/i)[0].replace(/^Buy\s+/i, "").trim();
            if (!isInvalidTitleText(cleaned)) {
              title = cleaned;
            }
          }

          // 2. Scrape Price
          let listedPrice = 0;
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
            const elements = document.querySelectorAll(sel);
            for (const el of elements) {
              if (!isPriceGuardElement(el) && el.innerText) {
                const cleaned = el.innerText.replace(/[^0-9]/g, "");
                if (cleaned) {
                  const num = parseInt(cleaned, 10);
                  if (num > 0 && num < 10000000) {
                    listedPrice = num;
                    break;
                  }
                }
              }
            }
            if (listedPrice) break;
          }

          // Scan ₹ text nodes fallback
          if (!listedPrice) {
            const candidates = document.querySelectorAll("div, span, p, b, strong");
            for (const el of candidates) {
              if (el.children.length === 0 && el.innerText && el.innerText.includes("₹")) {
                const match = el.innerText.match(/₹\s*([0-9,]+)/);
                if (match) {
                  const num = parseInt(match[1].replace(/,/g, ""), 10);
                  if (num > 0 && num < 10000000) {
                    listedPrice = num;
                    break;
                  }
                }
              }
            }
          }

          // 3. Scrape MRP
          let mrp = 0;
          const mrpSelectors = [
            "div.yRaY8j.A68aKn",
            "div._3I9_wc._2p6lqe",
            "div.yRaY8j",
            "span.yRaY8j",
            "div._3I9_wc",
            "div._27Ah45",
            "div[class*='yRaY8j']",
            "div[class*='mrp']",
            "span[class*='strike']"
          ];
          for (const sel of mrpSelectors) {
            const el = document.querySelector(sel);
            if (el && el.innerText) {
              const cleaned = el.innerText.replace(/[^0-9]/g, "");
              if (cleaned) {
                const num = parseInt(cleaned, 10);
                if (num > listedPrice) {
                  mrp = num;
                  break;
                }
              }
            }
          }

          if (!isProductUrl && (!listedPrice || !title)) {
            return { isProduct: false };
          }

          if (!title || !listedPrice || listedPrice <= 0) {
            return { isProduct: false };
          }

          const hasUrgency = Boolean(document.body.innerText.match(/only \d+ left|hurry|few left|countdown/i));
          return {
            isProduct: true,
            title,
            listedPrice,
            mrp: mrp || Math.round(listedPrice * 1.25),
            hasUrgency
          };
        }
      },
      (results) => {
        if (results && results[0] && results[0].result && results[0].result.isProduct && results[0].result.listedPrice > 0) {
          const res = results[0].result;
          const analysis = engine.analyze({
            title: res.title,
            listedPrice: res.listedPrice,
            mrp: res.mrp,
            visitCount: 1,
            timeWindowMinutes: 30,
            scarcityBadges: res.hasUrgency ? ["Urgency indicator detected"] : []
          });
          renderAnalysis(analysis);
        } else {
          showEmptyState();
        }
      }
    );
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

    const { product, evaluation, signals, counterPurchasing } = analysis;

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
    mrpPriceEl.innerText = `MRP: ₹${product.mrp.toLocaleString("en-IN")}`;

    fairPriceEl.innerText = `₹${evaluation.estimatedFairPrice.toLocaleString("en-IN")}`;
    fairRangeEl.innerText = `Band: ₹${evaluation.fairPriceRange.low.toLocaleString("en-IN")} - ₹${evaluation.fairPriceRange.high.toLocaleString("en-IN")}`;

    if (evaluation.priceDifference > 0) {
      if (evaluation.surgeRiskScore >= 40) {
        markupAlert.innerHTML = `⚠️ <strong>₹${evaluation.priceDifference.toLocaleString("en-IN")} (${evaluation.markupPercentage}%)</strong> Dynamic Surge Markup`;
        markupAlert.style.backgroundColor = "rgba(239, 68, 68, 0.15)";
        markupAlert.style.borderColor = "#ef4444";
        markupAlert.style.color = "#fca5a5";
      } else {
        markupAlert.innerHTML = `💡 <strong>₹${evaluation.priceDifference.toLocaleString("en-IN")} (${evaluation.markupPercentage}%)</strong> Target Savings Available`;
        markupAlert.style.backgroundColor = "rgba(59, 130, 246, 0.15)";
        markupAlert.style.borderColor = "#3b82f6";
        markupAlert.style.color = "#93c5fd";
      }
    } else {
      markupAlert.innerHTML = `✅ <strong>Historic Floor Price Verified</strong> (Optimal time to buy)`;
      markupAlert.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
      markupAlert.style.borderColor = "#10b981";
      markupAlert.style.color = "#a7f3d0";
    }

    // Update Stats row for 90-day curve
    if (statFloor) statFloor.innerText = `₹${product.historicalLowestFloor.toLocaleString("en-IN")}`;
    if (statAvg) statAvg.innerText = `₹${product.historicalAverage.toLocaleString("en-IN")}`;
    if (statFair) statFair.innerText = `₹${evaluation.estimatedFairPrice.toLocaleString("en-IN")}`;

    // Draw the 90-Day Price Floor Canvas Curve
    drawPriceCurveCanvas(chartCanvas, product, evaluation);

    // Signals chips
    if (signals.length > 0) {
      signalsList.innerHTML = signals
        .slice(0, 3)
        .map((s) => `<div class="signal-chip ${s.type}"><strong>${s.title}</strong>: ${s.weight}</div>`)
        .join("");
    } else {
      signalsList.innerHTML = `<div class="signal-chip info"><strong>Normal Session Baseline</strong>: No dynamic velocity surge.</div>`;
    }

    // Multi-Store Live Price Comparison list
    if (popupAlternatives && counterPurchasing && counterPurchasing.alternativeDeals) {
      popupAlternatives.innerHTML = counterPurchasing.alternativeDeals
        .slice(0, 4)
        .map(
          (deal) => `
        <a href="${deal.url}" target="_blank" rel="noopener" class="popup-deal-row ${deal.isLowestPrice ? "best-deal" : ""}">
          <div class="popup-deal-left">
            <span class="popup-deal-logo">${deal.logo}</span>
            <div>
              <div class="popup-deal-name">
                ${deal.retailer}
                ${deal.isLowestPrice ? '<span class="popup-best-badge">BEST PRICE</span>' : ""}
              </div>
              <div class="popup-deal-perk">${deal.perk}</div>
            </div>
          </div>
          <div class="popup-deal-right">
            <div class="popup-deal-price">₹${deal.sellingPrice.toLocaleString("en-IN")}</div>
            ${deal.savingsVsFlipkart > 0 ? `<div class="popup-deal-save">Save ₹${deal.savingsVsFlipkart.toLocaleString("en-IN")}</div>` : ""}
            <span class="popup-deal-btn">View ↗</span>
          </div>
        </a>
      `
        )
        .join("");
    }

    // Button: Open in-page drawer
    if (btnShowOverlay) {
      btnShowOverlay.onclick = () => {
        if (activeTabId) {
          chrome.tabs.sendMessage(activeTabId, { action: "openDrawer" }, () => {
            window.close();
          });
        }
      };
    }

    // Button: Toggle Simulation
    if (btnToggleSim) {
      btnToggleSim.onclick = () => {
        if (activeTabId) {
          chrome.tabs.sendMessage(activeTabId, { action: "simulateVelocity" }, (res) => {
            if (res && res.analysis) {
              renderAnalysis(res.analysis);
            }
          });
        }
      };
    }
  }

  /**
   * High-Resolution 90-Day Price Floor & Valuation Canvas Renderer
   */
  function drawPriceCurveCanvas(canvas, product, evaluation) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = (rect.width || 350) * dpr;
    canvas.height = (rect.height || 140) * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width || 350;
    const height = rect.height || 140;

    ctx.clearRect(0, 0, width, height);

    const floor = product.historicalLowestFloor;
    const fair = evaluation.estimatedFairPrice;
    const listed = product.listedPrice;

    // Timeline data points
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
    const padTop = 20;
    const padBottom = 26;

    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    function getY(val) {
      return padTop + chartH - ((val - minVal) / valRange) * chartH;
    }

    function getX(index) {
      return padLeft + (index / (labels.length - 1)) * chartW;
    }

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const y = padTop + (i / 2) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    // Dashed Fair Baseline Line (Green)
    const fairY = getY(fair);
    ctx.strokeStyle = "rgba(52, 211, 153, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, fairY);
    ctx.lineTo(width - padRight, fairY);
    ctx.stroke();

    ctx.fillStyle = "#34d399";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("Fair", width - padRight + 4, fairY + 3);

    // Dashed Floor Baseline Line (Blue)
    const floorY = getY(floor);
    ctx.strokeStyle = "rgba(56, 189, 248, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(padLeft, floorY);
    ctx.lineTo(width - padRight, floorY);
    ctx.stroke();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("Floor", width - padRight + 4, floorY + 3);

    // Area Gradient under price curve
    ctx.setLineDash([]);
    const gradient = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    if (evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40) {
      gradient.addColorStop(0, "rgba(239, 68, 68, 0.25)");
      gradient.addColorStop(1, "rgba(239, 68, 68, 0.0)");
    } else {
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      gradient.addColorStop(1, "rgba(59, 130, 246, 0.0)");
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

    // Price Curve stroke
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
    ctx.strokeStyle = evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Plot Points & X-Axis Labels
    for (let i = 0; i < points.length; i++) {
      const x = getX(i);
      const y = getY(points[i]);

      // X label
      ctx.fillStyle = "#64748b";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x, height - 8);

      // Point circle
      ctx.beginPath();
      if (i === points.length - 1) {
        // Today point (Highlight)
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = evaluation.priceDifference > 0 && evaluation.surgeRiskScore >= 40 ? "#ef4444" : "#34d399";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Price label above today point
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.fillText(`₹${listed.toLocaleString("en-IN")}`, x, y - 8);
      } else {
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#38bdf8";
        ctx.fill();
      }
    }
  }

  // Quick Test Buttons (when not on Flipkart tab)
  if (btnTestFlight) {
    btnTestFlight.onclick = () => {
      const flightAnalysis = engine.analyze({
        listedPrice: 7800,
        mrp: 9999,
        title: "Bangalore to Kolkata flight/conference pass",
        visitCount: 4,
        timeWindowMinutes: 30,
        scarcityBadges: ["Only 1 seat left", "Hurry, fast selling"],
        hasCountdownTimer: true
      });
      renderAnalysis(flightAnalysis);
    };
  }

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

  if (btnTestHeadphones) {
    btnTestHeadphones.onclick = () => {
      const audioAnalysis = engine.analyze({
        listedPrice: 1499,
        mrp: 3999,
        title: "boAt Airdopes 141 Bluetooth Earbuds",
        visitCount: 1,
        timeWindowMinutes: 30,
        scarcityBadges: []
      });
      renderAnalysis(audioAnalysis);
    };
  }
});
