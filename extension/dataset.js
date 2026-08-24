/**
 * PriceGuard AI - Pricing Knowledge Base & Multi-Store Search Engine
 *
 * IMPORTANT: We do NOT fabricate or estimate competitor prices.
 * We link users directly to live search results on each platform
 * so they see the actual real-time price themselves.
 */

const PriceGuardDataset = {
  // Category baselines and normal retail markdowns
  categories: {
    smartphones: {
      name: "Smartphones & Mobiles",
      typicalDiscountRange: [0.08, 0.22],
      volatilityScore: 45,
      competitors: ["Amazon India", "Croma", "Reliance Digital", "Brand Store"],
      bestBuyingWindow: "Tuesday/Wednesday night (11 PM - 2 AM)"
    },
    audio: {
      name: "Audio & Wearables",
      typicalDiscountRange: [0.35, 0.65],
      volatilityScore: 60,
      competitors: ["Amazon India", "Croma", "Headphone Zone"],
      bestBuyingWindow: "Weekend Flash Deals (Saturday morning)"
    },
    laptops: {
      name: "Laptops & Computers",
      typicalDiscountRange: [0.10, 0.28],
      volatilityScore: 35,
      competitors: ["Amazon India", "Croma", "Vijay Sales"],
      bestBuyingWindow: "Month-End Payday Sales"
    },
    appliances: {
      name: "Home & Kitchen Appliances",
      typicalDiscountRange: [0.20, 0.40],
      volatilityScore: 30,
      competitors: ["Amazon India", "Croma", "Reliance Digital"],
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
      competitors: ["Myntra", "Ajio", "Amazon Fashion"],
      bestBuyingWindow: "End of Season Sales (EOSS)"
    },
    general: {
      name: "General Merchandise",
      typicalDiscountRange: [0.15, 0.35],
      volatilityScore: 40,
      competitors: ["Amazon India", "Tata CLiQ", "JioMart"],
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

  /**
   * Multi-Store Search Links — NO FABRICATED PRICES
   *
   * Returns clickable search links for platforms that actually carry the
   * product category. Users will see live real prices on each site.
   * We never estimate or invent competitor prices.
   */
  generateAlternativeDeals(title = "", currentPrice = 0, category = "general") {
    let cleanTitle = title || "";

    // Reject internal UI text that may have leaked from PriceGuard elements
    if (
      cleanTitle.match(/Dynamic Pricing|Manipulation|PriceGuard|Flipkart Product Listing|Browse Mode/i) ||
      cleanTitle.trim().length < 3
    ) {
      const categoryFallbacks = {
        smartphones: "Smartphones",
        audio: "Earbuds Soundbar",
        laptops: "Laptops",
        appliances: "Home Appliances",
        fashion: "Fashion",
        travel: "Flights",
        general: "Electronics"
      };
      cleanTitle = categoryFallbacks[category] || "Electronics";
    }

    // Build clean search keyword: brand + model, max 5 words, no noise
    let cleanQuery = cleanTitle
      .replace(/\(.*?\)/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/(Pantone|Color|Colour|Edition|Special|Exclusive|Offer|\d+GB\s*RAM|\d+GB\s*Storage|\d+\s*MP)/gi, " ")
      .replace(/(\b(with|and|by|for|in|exclusive|offer|special|gb|ram|rom|dynamic|pricing|manipulation|priceguard|flipkart)\b)/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const queryWords = cleanQuery.split(" ").filter(w => w.length > 1).slice(0, 4).join(" ");
    const encoded = encodeURIComponent(queryWords || cleanTitle.slice(0, 40));
    const alternatives = [];

    if (category === "travel") {
      // Travel — link to flight search engines
      alternatives.push({
        retailer: "Google Flights",
        checkPriceLabel: "Search Flights",
        perk: "Compare all airlines instantly — usually beats Flipkart OTA price",
        url: `https://www.google.com/travel/flights?q=${encoded}`,
        logo: "🌐",
        isBestBet: true
      });
      alternatives.push({
        retailer: "EaseMyTrip",
        checkPriceLabel: "Check Fare",
        perk: "Zero convenience fee available with promo code",
        url: `https://www.easemytrip.com/`,
        logo: "🎫",
        isBestBet: false
      });
      alternatives.push({
        retailer: "MakeMyTrip",
        checkPriceLabel: "Check Fare",
        perk: "₹800–₹1,500 bank card offer at checkout",
        url: `https://www.makemytrip.com/flights/`,
        logo: "✈️",
        isBestBet: false
      });

    } else if (category === "fashion") {
      // Fashion — Myntra & Ajio carry it, Reliance Digital does NOT
      alternatives.push({
        retailer: "Myntra",
        checkPriceLabel: "Search on Myntra",
        perk: "Stackable 15% Insider Coupon available",
        url: `https://www.myntra.com/${encoded.replace(/%20/g, "-")}`,
        logo: "👗",
        isBestBet: true
      });
      alternatives.push({
        retailer: "Ajio",
        checkPriceLabel: "Search on Ajio",
        perk: "Flash Points available at checkout",
        url: `https://www.ajio.com/search/?text=${encoded}`,
        logo: "🛍️",
        isBestBet: false
      });
      alternatives.push({
        retailer: "Amazon Fashion",
        checkPriceLabel: "Search on Amazon",
        perk: "Prime delivery + card cashback applicable",
        url: `https://www.amazon.in/s?k=${encoded}&rh=n%3A1571271031`,
        logo: "📦",
        isBestBet: false
      });

    } else if (category === "audio") {
      // Audio — Amazon & Croma carry all audio. Reliance Digital carries major brands only.
      alternatives.push({
        retailer: "Amazon India",
        checkPriceLabel: "Search on Amazon",
        perk: "Largest audio selection — Prime 1-day delivery",
        url: `https://www.amazon.in/s?k=${encoded}`,
        logo: "📦",
        isBestBet: true
      });
      alternatives.push({
        retailer: "Croma",
        checkPriceLabel: "Search on Croma",
        perk: "NeuCoins + HDFC/ICICI instant discount",
        url: `https://www.croma.com/searchB?q=${encoded}`,
        logo: "🏬",
        isBestBet: false
      });
      alternatives.push({
        retailer: "Headphone Zone",
        checkPriceLabel: "Search on Headphone Zone",
        perk: "Specialist audio retailer — best for premium headphones",
        url: `https://www.headphonezone.in/search?type=product&q=${encoded}`,
        logo: "🎧",
        isBestBet: false
      });

    } else if (category === "laptops") {
      // Laptops — Amazon, Croma, Vijay Sales. Reliance Digital carries limited laptop brands.
      alternatives.push({
        retailer: "Amazon India",
        checkPriceLabel: "Search on Amazon",
        perk: "Prime delivery + No Cost EMI options",
        url: `https://www.amazon.in/s?k=${encoded}`,
        logo: "📦",
        isBestBet: true
      });
      alternatives.push({
        retailer: "Croma",
        checkPriceLabel: "Search on Croma",
        perk: "NeuCoins + Tata verified purchase protection",
        url: `https://www.croma.com/searchB?q=${encoded}`,
        logo: "🏬",
        isBestBet: false
      });
      alternatives.push({
        retailer: "Vijay Sales",
        checkPriceLabel: "Search on Vijay Sales",
        perk: "Exchange offers + HDFC/ICICI discounts offline",
        url: `https://www.vijaysales.com/search/${encoded.replace(/%20/g, "-")}`,
        logo: "🖥️",
        isBestBet: false
      });

    } else if (category === "appliances") {
      // Appliances — Amazon, Croma, Reliance Digital all carry appliances
      alternatives.push({
        retailer: "Amazon India",
        checkPriceLabel: "Search on Amazon",
        perk: "Free installation + No Cost EMI on large appliances",
        url: `https://www.amazon.in/s?k=${encoded}`,
        logo: "📦",
        isBestBet: true
      });
      alternatives.push({
        retailer: "Croma",
        checkPriceLabel: "Search on Croma",
        perk: "Extended warranty + NeuCoins on Tata Pay",
        url: `https://www.croma.com/searchB?q=${encoded}`,
        logo: "🏬",
        isBestBet: false
      });
      alternatives.push({
        retailer: "Reliance Digital",
        checkPriceLabel: "Search on Reliance Digital",
        perk: "Jio Points + store pickup same day",
        url: `https://www.reliancedigital.in/search?q=${encoded}`,
        logo: "⚡",
        isBestBet: false
      });

    } else {
      // Smartphones & General — Amazon always carries. Croma carries major brands.
      // Reliance Digital shown only for smartphones (they stock phones well).
      alternatives.push({
        retailer: "Amazon India",
        checkPriceLabel: "Search on Amazon",
        perk: "Prime 1-day delivery + instant bank card offers",
        url: `https://www.amazon.in/s?k=${encoded}`,
        logo: "📦",
        isBestBet: true
      });
      alternatives.push({
        retailer: "Croma",
        checkPriceLabel: "Search on Croma",
        perk: "NeuCoins + HDFC/ICICI instant card discount",
        url: `https://www.croma.com/searchB?q=${encoded}`,
        logo: "🏬",
        isBestBet: false
      });
      if (category === "smartphones") {
        alternatives.push({
          retailer: "Reliance Digital",
          checkPriceLabel: "Search on Reliance Digital",
          perk: "Jio Points + official brand activation included",
          url: `https://www.reliancedigital.in/search?q=${encoded}`,
          logo: "⚡",
          isBestBet: false
        });
      } else {
        alternatives.push({
          retailer: "Tata CLiQ",
          checkPriceLabel: "Search on Tata CLiQ",
          perk: "Assured genuine products + easy returns",
          url: `https://www.tatacliq.com/search/?searchCategory=all&text=${encoded}`,
          logo: "🛒",
          isBestBet: false
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
        saving: `Save ₹${Math.min(2500, Math.round(currentPrice * 0.05)).toLocaleString("en-IN")}`,
        description: "Unlimited 5% cashback credited directly to statement next billing cycle."
      });
    }
    if (currentPrice > 3000) {
      hacks.push({
        title: "HDFC / ICICI Instant Bank Coupon",
        saving: `Save up to ₹${Math.min(1500, Math.round(currentPrice * 0.10)).toLocaleString("en-IN")}`,
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
