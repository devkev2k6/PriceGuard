/**
 * PriceGuard AI - Background Service Worker (Manifest V3)
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("PriceGuard AI Extension Installed and Monitoring.");
});

// Update badge when navigating on Flipkart
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    if (tab.url.includes("flipkart.com")) {
      chrome.action.setBadgeText({ tabId, text: "AI" });
      chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563eb" });
    } else {
      chrome.action.setBadgeText({ tabId, text: "" });
    }
  }
});
