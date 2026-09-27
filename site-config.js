/*
 * Shared site content config for Heavenly EcoServe.
 * Read by the public site (index.html / public_site.html) and written
 * by the admin dashboard's "Homepage & Reel Settings" panel.
 *
 * IMPORTANT LIMITATION: this uses localStorage, which is per-browser,
 * per-device. Saving a change in the admin panel updates what THIS
 * browser sees on the live site instantly - it does not push the
 * change to other visitors on other devices, because a static site
 * has no server/database to broadcast it. Treat it as a content
 * preview/staging tool, not a real-time multi-user CMS.
 */
(function (global) {
  var STORAGE_KEY = 'hesSiteConfig';

  var DEFAULTS = {
    reelEnabled: true,
    reelHeadline: 'Watch: The Heavenly EcoServe Story',
    reelCaption: 'A calm, 24-second look at what makes our tableware different — real product photography, no stock footage.',
    marqueeText: "DON'T MISS OUT! · VALID FROM 1ST SEPTEMBER TO 15TH OCTOBER 2026 · AUSPICIOUS SAVINGS AWAIT! · GET LIMITED £40 FREE WALLET CREDIT ON REGISTRATION TODAY! · REGISTER WITH HEAVENLY ECOSERVE AND ENJOY £40 WALLET CREDIT AT CHECKOUT!",
    deliveryText: 'Free UK delivery on orders over £30',
    contactEmail: 'heavenlyecoserve@hotmail.com'
  };

  function load() {
    var cfg = {};
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cfg = JSON.parse(raw) || {};
    } catch (e) { /* localStorage unavailable or bad JSON - fall back to defaults */ }
    var merged = {};
    for (var k in DEFAULTS) merged[k] = (k in cfg) ? cfg[k] : DEFAULTS[k];
    return merged;
  }

  function save(cfg) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  global.HESConfig = { DEFAULTS: DEFAULTS, load: load, save: save, reset: reset };
})(window);
