/*
 * Shared site content config for Heavenly EcoServe.
 * Read by the public site (index.html / public_site.html) and written
 * by the admin dashboard's content-management panels.
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

  var DEFAULT_PRODUCTS = [
    { id: 'p-10rd',    name: '10″ Round Palm Leaf Plate — 25 Pack',        category: 'round',       price: 14.99, badge: 'Bestseller', image: 'images/amisol-10in-round-plate.jpg' },
    { id: 'p-10sq',    name: '10″ Square Palm Leaf Plate — 25 Pack',       category: 'square',      price: 14.99, badge: '',           image: 'images/amisol-10in-square-plate.jpg' },
    { id: 'p-9rd',     name: '9″ Round Palm Leaf Plate — 25 Pack',         category: 'round',       price: 12.99, badge: '',           image: 'images/amisol-9in-round-plate.jpg' },
    { id: 'p-9sq',     name: '9″ Square Palm Leaf Plate — 25 Pack',        category: 'square',      price: 12.99, badge: '',           image: 'images/amisol-9in-square-plate.jpg' },
    { id: 'p-55bowl',  name: '5.5″ Square Palm Leaf Bowl — 25 Pack',       category: 'bowl',        price: 12.99, badge: '',           image: 'images/amisol-55in-square-bowl.jpg' },
    { id: 'p-16bowl',  name: '16cm Round Palm Leaf Bowl — 25 Pack',             category: 'bowl',        price: 13.49, badge: 'New',        image: 'images/amisol-16cm-round-bowl.jpg' },
    { id: 'p-4cp',     name: '12″ 4-Compartment Party Plate — 25 Pack',    category: 'compartment', price: 23.99, badge: 'New',        image: 'images/amisol-12in-4cp-plate.jpg' },
    { id: 'p-3cp',     name: '10″ 3-Compartment Plate — 25 Pack',          category: 'compartment', price: 14.49, badge: '',           image: 'images/amisol-10in-3cp-plate.jpg' },
    { id: 'p-cutlery', name: 'Brichwood Cutlery Set — Knife, Fork & Spoon',     category: 'cutlery',     price: 6.99,  badge: 'New',        image: 'images/brand-birchwood-cutlery-set.jpg' },
    { id: 'p-spoon',   name: 'Palm Leaf Soup Spoon — 25 Pack',                  category: 'spoon',       price: 8.99,  badge: 'New',        image: 'images/brand-palm-leaf-soup-spoon.jpg' }
  ];

  var CATEGORY_LABELS = {
    round: 'Round Plates', square: 'Square Plates', bowl: 'Bowls',
    compartment: 'Compartment Plates', cutlery: 'Brichwood Cutlery', spoon: 'Soup Spoons'
  };

  var DEFAULTS = {
    reelEnabled: true,
    reelHeadline: 'Watch: The Heavenly EcoServe Story',
    reelCaption: 'A calm, 24-second look at what makes our tableware different — real product photography, no stock footage.',
    marqueeText: "DON'T MISS OUT! · VALID FROM 1ST SEPTEMBER TO 15TH OCTOBER 2026 · AUSPICIOUS SAVINGS AWAIT! · GET LIMITED £40 FREE WALLET CREDIT ON REGISTRATION TODAY! · REGISTER WITH HEAVENLY ECOSERVE AND ENJOY £40 WALLET CREDIT AT CHECKOUT!",
    deliveryText: 'Free UK delivery on orders over £30',
    contactEmail: 'heavenlyecoserve@hotmail.com',
    heroHeadline: 'Set the table without the guilt.',
    heroSub: 'Eight plates and bowls pressed from fallen areca palm leaves — no trees cut, no plastic lining, no chemicals. Sturdy enough for a Sunday roast, gone completely within 60–90 days.',
    storyHeadline: 'We got tired of choosing between "eco" and "actually works."',
    storyIntro: 'Heavenly EcoServe started with a simple frustration: every "sustainable" plate we tried either fell apart under a hot dinner or turned out to be plastic-lined greenwash in disguise. So we went looking for tableware that didn’t ask us to compromise — and built a UK business around the suppliers who could prove it, not just claim it.',
    products: DEFAULT_PRODUCTS
  };

  function load() {
    var cfg = {};
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) cfg = JSON.parse(raw) || {};
    } catch (e) { /* localStorage unavailable or bad JSON - fall back to defaults */ }
    var merged = {};
    for (var k in DEFAULTS) merged[k] = (k in cfg) ? cfg[k] : DEFAULTS[k];
    if (!merged.products || !merged.products.length) merged.products = DEFAULT_PRODUCTS;
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

  function categoryCounts(products) {
    var counts = {};
    products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }

  global.HESConfig = {
    DEFAULTS: DEFAULTS,
    DEFAULT_PRODUCTS: DEFAULT_PRODUCTS,
    CATEGORY_LABELS: CATEGORY_LABELS,
    load: load,
    save: save,
    reset: reset,
    categoryCounts: categoryCounts
  };
})(window);
