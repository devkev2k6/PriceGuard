# 🛡️ PriceGuard AI — FinTech Dynamic Pricing & Counter-Purchasing Shield

> **AI-Powered Price-Checking & Counter-Purchasing Feature for Flipkart & E-Commerce**  
> Problem Statement 5 (AI in Finance & E-Commerce / FinTech)

---

## 🌟 Overview & Capabilities

Online retail platforms often use dynamic pricing algorithms that inflate prices based on session duration, repeated searches, time of day, and artificial urgency tactics ("Only 1 left in stock", FOMO countdown timers).

**PriceGuard AI** protects consumers and equips them with counter-purchasing strategies by:
1. **Running directly on live Flipkart product pages (`flipkart.com`)** via a Manifest V3 Chrome Extension.
2. **Detecting Dynamic Pricing & Manipulation Signals**:
   - **Visit Velocity Surge**: Flags when a user visits/refreshes an item multiple times (e.g. 4 times in 30 minutes) using secure local timestamp tracking.
   - **Scarcity & Pressure Dark Patterns**: Identifies artificial inventory warnings ("Only 1 seat/item left", "Hurry! 12 people viewing", FOMO countdown clocks).
   - **Historical Floor & Deviation Analysis**: Checks listed price against historical 90-day price floor and category markdown averages.
3. **Estimating AI Fair Market Price**:
   - Strips out dynamic surge multipliers and session velocity markups to compute the genuine fair market value.
   - Computes explicit price markup: `Listed Price vs Fair Price (e.g., ₹7,800 vs ₹5,525 -> ₹2,275 markup)`.
4. **Actionable Counter-Purchasing Engine**:
   - **Verified Alternative Retailer Bridges**: Direct 1-click links to competing platforms (Amazon India, Croma, Reliance Digital, MakeMyTrip, EaseMyTrip).
   - **Behavioral Counter-Tactics**: Incognito mode / cookie wipe protocol, mobile app coupons, and optimal weekly purchasing time windows.
   - **Payment & Bank Card Optimizer**: Instant 10% card discounts, 5% unlimited cashback, and reward redemption.
5. **Admin Pricing Intelligence & Governance Console**:
   - Audit logs of flagged dynamic surges.
   - Category fairness index scores and dark pattern analytics.

---

## 🚀 Prompt Scenario Verification

| Parameter | Specification in Prompt | PriceGuard AI Output |
| :--- | :--- | :--- |
| **Listing** | Bangalore to Kolkata flight/pass — ₹7,800 | Detected & Parsed (₹7,800) |
| **Context** | Viewed 4 times in 30 mins | **High Search Velocity Surge Flagged** (+35% risk) |
| **Urgency Badge** | "Only 1 seat left" countdown | **Extreme Scarcity Dark Pattern Flagged** (+25% risk) |
| **Risk Score** | High Surge / Manipulation Risk | **65-75/100 (HIGH / CRITICAL SURGE)** |
| **Fair Price** | Lower Fair Price Estimate | **Estimated Fair Price: ~₹5,525 (Markup: ₹2,275 / 41%)** |
| **Counter Actions** | Alternative booking options & better time | MakeMyTrip / EaseMyTrip zero fee bridge, Incognito protocol, Tuesday booking window |

---

## 🛠️ How to Load and Test on Live Flipkart

### 1. Load the Chrome Extension (Manifest V3)
1. Open Google Chrome (or Edge / Brave).
2. Navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `extension` folder located inside this project directory (`c:\Users\Debargha\Downloads\FinanceProject\extension`).
6. The extension **"PriceGuard AI - Flipkart Fair Price & Counter-Purchasing"** will appear in your browser toolbar!

### 2. Test on Live Flipkart Website
1. Open **[https://www.flipkart.com](https://www.flipkart.com)**.
2. Open any product page (Smartphones, Laptops, Earbuds, Appliances, Flights).
3. The **PriceGuard AI** floating pill (`🛡️ PriceGuard AI`) will automatically appear in the bottom-right corner of the page.
4. Click the pill to open the slide-out panel showing the live dynamic pricing risk, AI fair market valuation, signals breakdown, and verified 1-click alternative store bridges!

---

## 🌐 Running the Standalone Web Dashboard & Admin Console

You can also run the full-stack web application with the live scenario runner and admin analytics:

```bash
# In the project directory
npm install
npm start
```

Open your browser:
- **Consumer Shield Dashboard**: `http://localhost:3000`
- **Admin Pricing Trends Console**: `http://localhost:3000/admin.html`
- **Mock Flipkart Testing Sandbox**: `http://localhost:3000/mock-flipkart.html`

---

## 📁 Project Architecture

```
FinanceProject/
├── extension/                       # Chrome Extension (Manifest V3)
│   ├── manifest.json                # Extension Manifest with Flipkart permissions
│   ├── content.js                   # Injected content script on Flipkart pages
│   ├── content.css                  # Glassmorphic in-page floating pill & drawer styles
│   ├── engine.js                    # AI Fair Price & Dynamic Pricing Algorithm
│   ├── dataset.js                   # Category knowledge base & retailer search generator
│   ├── popup.html                   # Extension toolbar popup UI
│   ├── popup.css                    # Popup styling
│   ├── popup.js                     # Popup controller
│   ├── background.js                # Background service worker
│   └── icons/                       # Extension icon assets (16px, 48px, 128px)
├── public/                          # Web Dashboard & Admin Application
│   ├── index.html                   # Consumer Price Checker & Scenario Test Suite
│   ├── admin.html                   # Admin Pricing Intelligence & Fairness Console
│   ├── mock-flipkart.html           # Mock Flipkart Product Sandbox with live content script
│   ├── style.css                    # FinTech design system & responsive styling
│   └── app.js                       # Dashboard UI controller & Chart.js graph renderer
├── server.js                        # Node.js Express server & REST API
├── package.json                     # Node dependencies (express, cors)
└── prompt.md                        # Original Problem Statement specification
```

---

## 🔒 Multi-Layer Scraper Resilience on Flipkart

Flipkart frequently updates its CSS class names. PriceGuard AI uses a **3-tier extraction pipeline**:
1. **Schema.org JSON-LD structured data** (`script[type="application/ld+json"]`) which is standardized for SEO and immune to CSS class obfuscation.
2. **OpenGraph & Microdata Fallback** (`meta[property="og:title"]`, canonical paths).
3. **Multi-pattern CSS selectors** (`.Nx9bqj`, `._30jeq3`, `.VU-ZEz`, `._16FRp0`, `.yRaY8j`, stock text scanners).
4. **SPA Navigation Observer** (`MutationObserver`) to automatically re-evaluate when browsing products without reloading the page.
