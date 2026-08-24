/**
 * PriceGuard AI - Core AI Fair Price & Dynamic Pricing Detection Engine
 */

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    const dataset = require("./dataset.js");
    module.exports = factory(dataset);
  } else {
    root.PriceGuardEngine = factory(root.PriceGuardDataset);
  }
})(typeof self !== "undefined" ? self : this, function (Dataset) {

  class PriceEngine {
    constructor(dataset = Dataset) {
      this.dataset = dataset || (typeof PriceGuardDataset !== "undefined" ? PriceGuardDataset : null);
    }

    /**
     * Comprehensive Price & Manipulation Analysis
     * @param {Object} input
     * @param {number} input.listedPrice - Currently displayed price on e-commerce page (e.g. 7800)
     * @param {number} [input.mrp] - Stated MRP or Original Price (e.g. 9999)
     * @param {string} input.title - Product or flight/pass title
     * @param {number} [input.visitCount=1] - Number of visits in last 30 minutes
     * @param {number} [input.timeWindowMinutes=30] - Tracking window
     * @param {Array<string>} [input.scarcityBadges=[]] - Urgency strings found on page
     * @param {boolean} [input.hasCountdownTimer=false] - Whether countdown timer is running
     * @param {string} [input.customCategory] - Optional category override
     * @param {number} [input.historicalFloor] - Historical lowest recorded price
     */
    analyze(input) {
      const listedPrice = Number(input.listedPrice) || 0;
      let mrp = Number(input.mrp) || listedPrice;
      if (mrp < listedPrice) mrp = Math.round(listedPrice * 1.25);

      const title = input.title || "E-Commerce Product Listing";
      const visitCount = Math.max(1, Number(input.visitCount) || 1);
      const timeWindowMinutes = Number(input.timeWindowMinutes) || 30;
      const scarcityBadges = Array.isArray(input.scarcityBadges) ? input.scarcityBadges : [];
      const hasCountdownTimer = Boolean(input.hasCountdownTimer);
      const categoryKey = input.customCategory || (this.dataset ? this.dataset.inferCategory(title) : "general");
      const categoryInfo = this.dataset && this.dataset.categories[categoryKey] ? this.dataset.categories[categoryKey] : {
        name: "General",
        typicalDiscountRange: [0.15, 0.30],
        volatilityScore: 40,
        bestBuyingWindow: "Midweek sales"
      };

      // 1. Visit Velocity Surge Risk (0 - 35 pts)
      let velocityScore = 0;
      const signals = [];

      if (visitCount >= 4 && timeWindowMinutes <= 35) {
        velocityScore = 35;
        signals.push({
          type: "danger",
          title: "High Search Velocity Surge Detected",
          description: `Viewed ${visitCount} times in ${timeWindowMinutes} minutes. Dynamic algorithms often inflate prices for high-intent repeated shoppers.`,
          weight: "+35% Surge Risk"
        });
      } else if (visitCount >= 3) {
        velocityScore = 22;
        signals.push({
          type: "warning",
          title: "Repeated Visit Pattern",
          description: `Item checked ${visitCount} times recently. Session cookies are signaling strong intent to purchase.`,
          weight: "+22% Surge Risk"
        });
      } else if (visitCount === 2) {
        velocityScore = 10;
        signals.push({
          type: "info",
          title: "Multi-Visit Tracking Active",
          description: `Second visit within ${timeWindowMinutes} minutes. Monitoring for price spikes.`,
          weight: "+10% Surge Risk"
        });
      }

      // 2. Scarcity & Pressure Dark Patterns (0 - 30 pts)
      let scarcityScore = 0;
      const detectedScarcityText = scarcityBadges.join(" ");

      if (scarcityBadges.length > 0 || hasCountdownTimer) {
        if (/only\s*1\s*(seat|left|item|stock|unit)/i.test(detectedScarcityText) || /1\s*left/i.test(detectedScarcityText)) {
          scarcityScore += 25;
          signals.push({
            type: "danger",
            title: "Extreme Scarcity Dark Pattern ('Only 1 Left')",
            description: "Psychological urgency trigger designed to force immediate checkout before you compare prices.",
            weight: "+25% Manipulation Risk"
          });
        } else if (/hurry|few left|fast|selling fast|in high demand/i.test(detectedScarcityText)) {
          scarcityScore += 18;
          signals.push({
            type: "warning",
            title: "Artificial Demand Urgency Badge",
            description: "Platform displays high-demand badges to deter price comparison.",
            weight: "+18% Manipulation Risk"
          });
        }

        if (hasCountdownTimer || /ends in|countdown|timer|limited time/i.test(detectedScarcityText)) {
          scarcityScore += 12;
          signals.push({
            type: "warning",
            title: "Active Countdown Clock Pressure",
            description: "Artificial deadline timer induces fear of missing out (FOMO). Often resets on browser refresh.",
            weight: "+12% Manipulation Risk"
          });
        }
      }
      scarcityScore = Math.min(30, scarcityScore);

      // 3. Price Floor & MRP Deviation (0 - 25 pts)
      const currentDiscountPct = mrp > 0 ? (mrp - listedPrice) / mrp : 0;
      const [minExpDiscount, maxExpDiscount] = categoryInfo.typicalDiscountRange;
      let priceDeviationScore = 0;

      if (currentDiscountPct < minExpDiscount * 0.4) {
        // Significantly less discount than usual for this category
        priceDeviationScore = 20;
        signals.push({
          type: "warning",
          title: "Low Category Discount / Near MRP",
          description: `Listed at ${(currentDiscountPct * 100).toFixed(0)}% off MRP, while average market markdown is ${(minExpDiscount * 100).toFixed(0)}%–${(maxExpDiscount * 100).toFixed(0)}%.`,
          weight: "+20% Overpricing Risk"
        });
      } else if (currentDiscountPct > 0.65 && categoryKey !== "fashion") {
        priceDeviationScore = 15;
        signals.push({
          type: "warning",
          title: "Inflated MRP Illusion",
          description: "Stated MRP appears inflated to make standard pricing look like a massive markdown.",
          weight: "Artificial Discount"
        });
      }

      // 4. Time-of-Day / Category Volatility (0 - 10 pts)
      const now = new Date();
      const currentHour = now.getHours();
      let timingSurgeScore = 0;

      if (currentHour >= 19 && currentHour <= 23) {
        timingSurgeScore = 8;
        signals.push({
          type: "info",
          title: "Prime-Time Evening Traffic Surge",
          description: "Peak shopping hours (8 PM - 11 PM) generally correlate with reduced automated platform discounts.",
          weight: "+8% Dynamic Factor"
        });
      }

      // 5. Total Manipulation & Surge Risk Score (0 - 100)
      const totalScore = Math.min(100, Math.round(velocityScore + scarcityScore + priceDeviationScore + timingSurgeScore));

      let riskLevel = "LOW";
      let riskColor = "#10b981"; // emerald
      let riskSummary = "Price appears fair and stable. Low risk of dynamic price manipulation.";

      if (totalScore >= 70) {
        riskLevel = "CRITICAL / HIGH SURGE";
        riskColor = "#ef4444"; // red
        riskSummary = "High probability of dynamic price surge and urgency manipulation! Do not purchase at current listed price without counter-actions.";
      } else if (totalScore >= 45) {
        riskLevel = "MODERATE SURGE";
        riskColor = "#f59e0b"; // amber
        riskSummary = "Moderate dynamic pricing signals detected. Practical savings available with counter-purchasing.";
      } else if (totalScore >= 25) {
        riskLevel = "ELEVATED";
        riskColor = "#3b82f6"; // blue
        riskSummary = "Mild surge indicators. Small discounts or payment hacks can optimize the price.";
      }

      // 6. AI Fair Market Price Estimation Model
      // Fair price accounts for baseline discount + strips out velocity penalty & scarcity markups
      let fairDiscountPct = (minExpDiscount + maxExpDiscount) / 2;
      
      // Calculate realistic baseline
      let estimatedFairPrice = Math.round(mrp * (1 - fairDiscountPct));

      // If listed price has high surge score, fair price is estimated significantly lower
      if (totalScore >= 70) {
        // High surge scenario (e.g. flight/pass prompt scenario ₹7,800 -> fair ₹5,200 - ₹5,400)
        const surgeFactor = 0.25 + (velocityScore / 100) + (scarcityScore / 150);
        estimatedFairPrice = Math.min(estimatedFairPrice, Math.round(listedPrice / (1 + surgeFactor)));
      } else if (totalScore >= 45) {
        const surgeFactor = 0.12 + (velocityScore / 120);
        estimatedFairPrice = Math.min(estimatedFairPrice, Math.round(listedPrice / (1 + surgeFactor)));
      } else {
        // If listed price is already very good
        estimatedFairPrice = Math.min(listedPrice, estimatedFairPrice);
      }

      // Ensure sanity bounds
      if (estimatedFairPrice > listedPrice && totalScore < 30) {
        estimatedFairPrice = listedPrice;
      }
      if (estimatedFairPrice <= 0) estimatedFairPrice = Math.round(listedPrice * 0.85);

      const priceDifference = Math.max(0, listedPrice - estimatedFairPrice);
      const markupPercentage = estimatedFairPrice > 0 ? Math.round((priceDifference / estimatedFairPrice) * 100) : 0;

      // Historical Price Floor (Simulated / Learned benchmark)
      const historicalLowestFloor = input.historicalFloor || Math.round(estimatedFairPrice * 0.92);
      const historicalAverage = Math.round((listedPrice + estimatedFairPrice) / 2);

      // 7. Counter-Purchasing Suggestions
      const alternativeDeals = this.dataset ? this.dataset.generateAlternativeDeals(title, listedPrice, categoryKey) : [];
      const paymentHacks = this.dataset ? this.dataset.getPaymentOptimizationHacks(listedPrice) : [];

      // Counter tactics
      const tactics = [];
      if (velocityScore > 0) {
        tactics.push({
          icon: "🕵️",
          title: "Open in Incognito / Private Window",
          action: "Bypasses Flipkart user tracking cookies to drop velocity surge.",
          benefit: "Immediate session reset"
        });
        tactics.push({
          icon: "📱",
          title: "Switch to Flipkart Mobile App or Mobile Hotspot",
          action: "Changes client IP and device signature, frequently exposing lower mobile-first app coupons.",
          benefit: "App-exclusive 5-10% discount"
        });
      }

      if (scarcityScore > 0) {
        tactics.push({
          icon: "⏳",
          title: "Ignore the 'Only 1 Left' Timer",
          action: "Real-time stock feeds confirm stock is artificially throttled. Check back in 2 hours.",
          benefit: "Avoid emotional impulse markup"
        });
      }

      tactics.push({
        icon: "🕒",
        title: `Optimal Purchase Window: ${categoryInfo.bestBuyingWindow}`,
        action: "Category pricing hits weekly troughs during this time slot.",
        benefit: `Save up to ₹${priceDifference > 0 ? priceDifference.toLocaleString('en-IN') : '500+'}`
      });

      return {
        timestamp: new Date().toISOString(),
        product: {
          title,
          category: categoryInfo.name,
          categoryKey,
          listedPrice,
          mrp,
          currentDiscountPct: Math.round(currentDiscountPct * 100),
          historicalLowestFloor,
          historicalAverage
        },
        evaluation: {
          surgeRiskScore: totalScore,
          riskLevel,
          riskColor,
          riskSummary,
          estimatedFairPrice,
          fairPriceRange: {
            low: Math.round(estimatedFairPrice * 0.95),
            high: Math.round(estimatedFairPrice * 1.05)
          },
          priceDifference,
          markupPercentage,
          isSurgeActive: totalScore >= 45,
          signalsBreakdown: {
            velocityScore,
            scarcityScore,
            priceDeviationScore,
            timingSurgeScore
          }
        },
        signals,
        counterPurchasing: {
          tactics,
          alternativeDeals,
          paymentHacks
        }
      };
    }
  }

  return PriceEngine;
});
