/**
 * PriceGuard AI - Pricing Knowledge Base & Retailer Intelligence
 */

const PriceGuardDataset = {
  // Category baselines and normal retail markdowns
  categories: {
    smartphones: {
      name: "Smartphones & Mobiles",
      typicalDiscountRange: [0.08, 0.22],
      volatilityScore: 45,
      competitors: ["Amazon", "Croma", "Reliance Digital", "Brand Store"],
      bestBuyingWindow: "Tuesday/Wednesday night (11 PM - 2 AM)"
    },
    audio: {
      name: "Audio & Wearables",
      typicalDiscountRange: [0.35, 0.65],
      volatilityScore: 60,
      competitors: ["Amazon", "Croma", "Headphone Zone", "Brand Store"],
      bestBuyingWindow: "Weekend Flash Deals (Saturday morning)"
    },
    laptops: {
      name: "Laptops & Computers",
      typicalDiscountRange: [0.10, 0.28],
      volatilityScore: 35,
      competitors: ["Amazon", "Croma", "Reliance Digital", "Vijay Sales"],
      bestBuyingWindow: "Month-End Payday Sales"
    },
    appliances: {
      name: "Home & Kitchen Appliances",
      typicalDiscountRange: [0.20, 0.40],
      volatilityScore: 30,
      competitors: ["Amazon", "Croma", "Reliance Digital"],
      bestBuyingWindow: "Festival / Festive Clearance periods"
    },
    travel: {
      name: "Flights & Travel Passes",
      typicalDiscountRange: [0.0, 0.15],
      volatilityScore: 85,
      competitors: ["MakeMyTrip", "EaseMyTrip", "Airline Direct", "Yatra"],
      bestBuyingWindow: "6-8 weeks in advance on Tuesday afternoons"
    },
    fashion: {
      name: "Fashion & Lifestyle",
      typicalDiscountRange: [0.40, 0.70],
      volatilityScore: 50,
      competitors: ["Myntra", "Ajio", "Amazon Fashion", "Tata CLiQ"],
      bestBuyingWindow: "End of Season Sales (EOSS)"
    },
    general: {
      name: "General Merchandise",
      typicalDiscountRange: [0.15, 0.35],
      volatilityScore: 40,
      competitors: ["Amazon", "Tata CLiQ", "JioMart"],
      bestBuyingWindow: "Super Value Days (1st to 7th of month)"
    }
  },

  // Detect product category from title & breadcrumbs
  inferCategory(title = "", breadcrumbs = "") {
    const text = (title + " " + breadcrumbs).toLowerCase();
    if (text.match(/flight|flight pass|airline|bangalore to|delhi to|mumbai to|kolkata to|boarding|air ticket/i)) {
      return "travel";
    }
    if (text.match(/iphone|galaxy|phone|mobile|oneplus|realme|redmi|poco|pixel|smartphone|motorola|iqoo/i)) {
      return "smartphones";
    }
    if (text.match(/earbuds|earphone|headphone|airpods|neckband|bluetooth speaker|tws|soundbar|soundcore|boat airdopes|noise earbuds/i)) {
      return "audio";
    }
    if (text.match(/laptop|macbook|notebook|thinkpad|ideapad|gaming laptop|desktop|pc|intel core|ryzen/i)) {
      return "laptops";
    }
    if (text.match(/refrigerator|washing machine|air conditioner|microwave|tv|smart tv|geyser|cooler|vacuum/i)) {
      return "appliances";
    }
    if (text.match(/t-shirt|shirt|jeans|shoes|sneakers|dress|watch|jacket|kurti|saree|sandals/i)) {
      return "fashion";
    }
    return "general";
  },

  // Generate verified cross-retailer search query links
  generateAlternativeDeals(title = "", currentPrice = 0, category = "general") {
    // Clean up title for concise cross-search (remove storage, color, unwanted tags)
    let cleanQuery = title
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/(\b(with|and|by|for|in|exclusive|offer|special|black|blue|green|white|silver|gb|ram|rom)\b)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Limit to first 5-6 words for accurate match
    const queryWords = cleanQuery.split(" ").slice(0, 5).join(" ");
    const encoded = encodeURIComponent(queryWords || title.slice(0, 40));

    const alternatives = [];

    if (category === "travel") {
      alternatives.push({
        retailer: "MakeMyTrip Flights",
        badge: "Meta-Search Baseline",
        discountEstimate: "₹800 - ₹1,500 lower on zero-convenience fee codes",
        url: `https://www.makemytrip.com/flights/`,
        directSearch: true,
        logo: "✈️"
      });
      alternatives.push({
        retailer: "EaseMyTrip (No Convenience Fee)",
        badge: "Zero Fee Guarantee",
        discountEstimate: "Avoids ₹400-₹650 surge booking fee",
        url: `https://www.easemytrip.com/`,
        directSearch: true,
        logo: "🎫"
      });
      alternatives.push({
        retailer: "Official Airline Website (Direct)",
        badge: "Bypass Dynamic Intermediaries",
        discountEstimate: "Base fare locked with student/corporate discount",
        url: `https://www.google.com/travel/flights?q=${encoded}`,
        directSearch: true,
        logo: "🌐"
      });
    } else {
      alternatives.push({
        retailer: "Amazon India",
        badge: "Prime Fast Price Match",
        discountEstimate: `Estimated ${Math.round(currentPrice * 0.94).toLocaleString('en-IN')}`,
        url: `https://www.amazon.in/s?k=${encoded}`,
        directSearch: true,
        logo: "📦"
      });

      if (category === "smartphones" || category === "audio" || category === "laptops" || category === "appliances") {
        alternatives.push({
          retailer: "Croma Retail",
          badge: "Tata Verified Store",
          discountEstimate: "Includes instant bank card tie-ups",
          url: `https://www.croma.com/searchB?q=${encoded}`,
          directSearch: true,
          logo: "🏬"
        });
        alternatives.push({
          retailer: "Reliance Digital",
          badge: "Direct Electronics Hub",
          discountEstimate: "Often has offline store price match",
          url: `https://www.reliancedigital.in/search?q=${encoded}`,
          directSearch: true,
          logo: "⚡"
        });
      }

      if (category === "fashion") {
        alternatives.push({
          retailer: "Myntra",
          badge: "Fashion Special Deals",
          discountEstimate: "Coupon stackable up to 20% extra",
          url: `https://www.myntra.com/${encoded.replace(/%20/g, "-")}`,
          directSearch: true,
          logo: "👗"
        });
        alternatives.push({
          retailer: "Ajio Trends",
          badge: "Reliance Fashion Hub",
          discountEstimate: "Flash loyalty points available",
          url: `https://www.ajio.com/search/?text=${encoded}`,
          directSearch: true,
          logo: "🛍️"
        });
      }
    }

    return alternatives;
  },

  // Active payment & checkout hacks to beat dynamic surge
  getPaymentOptimizationHacks(currentPrice = 0) {
    const hacks = [];
    if (currentPrice > 1000) {
      hacks.push({
        title: "Flipkart Axis Bank Card (5% Cashback)",
        saving: `Save ₹${Math.min(2500, Math.round(currentPrice * 0.05)).toLocaleString('en-IN')}`,
        description: "Unlimited 5% cashback credited directly to statement next billing cycle."
      });
    }
    if (currentPrice > 3000) {
      hacks.push({
        title: "HDFC / ICICI Instant Bank Coupon",
        saving: `Save up to ₹${Math.min(1500, Math.round(currentPrice * 0.10)).toLocaleString('en-IN')}`,
        description: "Check for Instant 10% discount on Credit Cards at the payment screen."
      });
    }
    hacks.push({
      title: "Flipkart SuperCoins Redemption",
      saving: "Save up to 10% using reward coins",
      description: "Redeem stored SuperCoins on the payment page for direct price deduction."
    });
    hacks.push({
      title: "Incognito / Cookie Purge Protocol",
      saving: "Bypass Repeated Search Surge",
      description: "Open the product in an Incognito tab with VPN or cellular data to drop session-specific markups."
    });
    return hacks;
  }
};

// Export for extension and browser environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = PriceGuardDataset;
}
