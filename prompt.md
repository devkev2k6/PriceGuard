AI in Finance & E-Commerce (FinTech)
5. Domain: AI in Finance & E-Commerce (FinTech)
Problem Statement

Design and integrate an AI-powered price-checking and counter-purchasing feature into an existing e-commerce or finance platform like flipkart , etc . It should identify possible dynamic pricing, estimate a fair price, and suggest practical ways for users to find a better deal.

1. Introduction

Online prices can change quickly, and users may sometimes see higher prices because of timing, repeated searches, or other signals. Most shoppers have no simple way to understand whether a displayed price is reasonable or what alternatives may be available.

2. Challenges

• Online prices can change based on timing, repeated visits, or other context.
• Users may not know whether a price is close to a normal market price.
• Countdown timers and scarcity messages can create pressure.
• Users often have to search manually for cheaper alternatives.

3. Application Workflow

User views a product or booking → System checks available price and context information → AI estimates surge/manipulation risk → Fair-price estimate is shown → Counter-purchasing suggestions are provided.

4. User Roles & Capabilities

• Consumer: Check the price and see a fair-price estimate.
• Consumer: View warnings and alternative buying suggestions.
• Admin: Review pricing trends and fairness scores.

5. Core Feature Specifications

• Detect suspicious dynamic-price patterns.
• Estimate a fair market price.
• Show the difference between the listed price and estimated fair price.
• Provide practical counter-purchasing suggestions.

Test Scenario (Example)

Example:
Listing: Bangalore to Kolkata flight/conference pass — ₹7,800.
The item was viewed four times in 30 minutes and shows a "Only 1 seat left" countdown.
Expected result:
The system flags a high surge/manipulation risk, estimates a lower fair price, explains the warning signs, and suggests alternative booking options or a better time to check.

6. Expected Outcomes

• Helps users make more informed purchases.
• Makes possible pricing manipulation easier to understand.
• Provides actionable alternatives instead of only showing a warning.

7. Bonus Ideas

• Historical price-floor tracker.
• One-click bridge to verified alternative listings.
