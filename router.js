/**
 * router.js — viadecide.com
 * Lightweight client-side router.
 * Handles ?go= and #go= redirects to real .html subpages.
 * Must be loaded BEFORE the main app script in index.html.
 */
(function () {
  "use strict";

  // List of real .html subpages that should be navigated to directly
  var REAL_SUBPAGES = [
    "SwipeOS.html",
    "StudentResearch.html",
    "Brief.html",
    "DecisionBrief.html",
    "Alchemist.html",
    "PromptAlchemy.html",
    "ONDC-demo.html",
    "engine-deals.html",
    "EngineLicense.html",
    "Contact.html",
    "CashbackRules.html",
    "CashbackClaim.html"
  ];

  function isRealSubpage(filename) {
    if (!filename) return false;
    var f = filename.split("/").pop().split("?")[0].split("#")[0];
    return REAL_SUBPAGES.some(function (s) {
      return s.toLowerCase() === f.toLowerCase();
    });
  }

  function getParam(key) {
    try {
      var u = new URL(location.href);
      var val = u.searchParams.get(key);
      if (val) return val.trim();
      var h = location.hash || "";
      var m = h.match(new RegExp("(?:^|[&#])" + key + "=([^&]+)", "i"));
      if (m && m[1]) return decodeURIComponent(m[1]).trim();
    } catch (e) {}
    return null;
  }

  // Handle ?go= or #go= deep links
  var go = getParam("go");
  if (go && isRealSubpage(go)) {
    var aff = getParam("tag") || getParam("aff") || "viadecide";
    var dest = go + "?tag=" + encodeURIComponent(aff);
    location.replace(dest);
    return; // stop execution
  }

  // Expose a small global router API for index.html to use
  window.__router = {
    isRealSubpage: isRealSubpage,
    getParam: getParam
  };
})();
