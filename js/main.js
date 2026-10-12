/* Heavenly EcoServe – motion, basket and device adaptation */
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;   // laptop/desktop mouse
  var saver = navigator.connection && navigator.connection.saveData;
  var WA = document.body.dataset.wa || '';

  // Tag the device class so CSS/JS can adapt (phone / tablet / desktop)
  function device() {
    var w = innerWidth, d = document.documentElement;
    d.dataset.device = w < 700 ? 'phone' : w < 1100 ? 'tablet' : 'desktop';
    d.dataset.input = canHover ? 'mouse' : 'touch';
  }
  device(); addEventListener('resize', device); addEventListener('orientationchange', device);

  /* ---------- Videos: lazy mount, pause off-screen ---------- */
  function mountVideo(box) {
    if (box.dataset.mounted || reduce || saver) return;
    var name = box.dataset.video; if (!name) return;
    box.dataset.mounted = '1';
    var v = document.createElement('video');
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('muted', '');
    v.preload = 'metadata'; v.setAttribute('aria-hidden', 'true'); v.disablePictureInPicture = true;
    // iOS Safari plays MP4/H.264; Android Chrome prefers WebM. Browser picks the first it supports.
    ['webm', 'mp4'].forEach(function (ext) {
      var s = document.createElement('source');
      s.src = 'media/' + name + '.' + ext; s.type = 'video/' + ext; v.appendChild(s);
    });
    v.addEventListener('loadeddata', function () { box.classList.add('has-video'); });
    v.addEventListener('error', function () { v.remove(); }, true);
    box.appendChild(v);
  }
  function play(box) { mountVideo(box); var v = box.querySelector('video'); if (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } }
  function pause(box) { var v = box.querySelector('video'); if (v) v.pause(); }

  var vio = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      var box = e.target;
      // Mouse devices: tiles/cards play on hover. Touch devices: play when in view.
      var hoverOnly = canHover && box.closest('[data-hoverplay]');
      if (e.isIntersecting) { hoverOnly ? mountVideo(box) : play(box); } else pause(box);
    });
  }, { rootMargin: '150px', threshold: 0.25 });
  document.querySelectorAll('.motion[data-video]').forEach(function (b) { vio ? vio.observe(b) : mountVideo(b); });

  document.querySelectorAll('[data-hoverplay]').forEach(function (el) {
    var box = el.querySelector('.motion'); if (!box || !canHover) return;
    el.addEventListener('mouseenter', function () { play(box); });
    el.addEventListener('mouseleave', function () { pause(box); });
    el.addEventListener('focusin', function () { play(box); });
    el.addEventListener('focusout', function () { pause(box); });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) document.querySelectorAll('video').forEach(function (v) { v.pause(); });
  });

  /* ---------- Scroll reveal ---------- */
  var rio = 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
  }, { threshold: .1 });
  document.querySelectorAll('.reveal').forEach(function (r) { rio ? rio.observe(r) : r.classList.add('in'); });

  /* ---------- Mobile nav ---------- */
  var bg = document.querySelector('.burger'), ul = document.querySelector('nav ul');
  if (bg) {
    bg.addEventListener('click', function () { var o = ul.classList.toggle('open'); bg.setAttribute('aria-expanded', o); });
    ul.addEventListener('click', function (e) { if (e.target.tagName === 'A') { ul.classList.remove('open'); bg.setAttribute('aria-expanded', 'false'); } });
  }

  /* ---------- Menu filter chips ---------- */
  var chips = document.querySelectorAll('.chip');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c); });
      var f = c.dataset.f;
      document.querySelectorAll('[data-cat]').forEach(function (s) { s.hidden = !(f === 'all' || s.dataset.cat === f); });
    });
  });

  /* ---------- Basket ---------- */
  var cart = {}, skus = {};
  try { skus = JSON.parse(localStorage.getItem('he_cart_sku') || '{}'); } catch (e) {}
  try { cart = JSON.parse(localStorage.getItem('he_cart') || '{}'); } catch (e) {}
  var count = document.getElementById('cartcount'), list = document.getElementById('dlist'),
      drawer = document.getElementById('drawer'), scrim = document.getElementById('scrim');
  function total() { return Object.keys(cart).reduce(function (n, k) { return n + cart[k]; }, 0); }
  function save() { try { localStorage.setItem('he_cart', JSON.stringify(cart)); } catch (e) {} }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function priceOf(k) { var m = String(k).match(/£\s*(\d+(?:\.\d{1,2})?)\s*$/); return m ? parseFloat(m[1]) : 0; }
  function money(n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); }
  function sums() {
    var sub = 0; Object.keys(cart).forEach(function (k) { sub += cart[k] * priceOf(k); }); sub = Math.round(sub * 100) / 100;
    var fee = parseFloat(document.body.dataset.fee), free = parseFloat(document.body.dataset.free), del = null, hint = '';
    if (!isNaN(fee) && sub > 0) { if (!isNaN(free) && sub > free) del = 0; else { del = fee; if (!isNaN(free)) hint = 'Spend ' + money(Math.max(free - sub, 0.01)) + ' more for free delivery.'; } }
    return { sub: sub, del: del, hint: hint, tot: Math.round((sub + (del || 0)) * 100) / 100 };
  }
  function render() {
    if (count) count.textContent = total();
    if (!list) return;
    var ks = Object.keys(cart);
    list.innerHTML = ks.length ? ks.map(function (k) {
      var p = priceOf(k), base = k.replace(/\s*£\s*\d+(?:\.\d{1,2})?\s*$/, ''), pm = base.match(/^(.*?)\s*\(([^)]*)\)\s*$/), nm = pm ? pm[1] : base, pack = pm ? pm[2] : '', e = esc(k);
      return '<li><div class="li-t"><b>' + esc(nm) + '</b>' + (pack ? '<small>' + esc(pack) + '</small>' : '') + (p ? '<em>' + money(p) + ' each</em>' : '') + '</div>' +
        '<div class="li-r"><span class="q"><button data-d="-1" data-k="' + e + '" aria-label="One less ' + esc(nm) + '">&minus;</button><b>' + cart[k] + '</b><button data-d="1" data-k="' + e + '" aria-label="One more ' + esc(nm) + '">+</button></span>' +
        '<span class="li-p">' + (p ? money(p * cart[k]) : '') + '</span><button class="li-x" data-rm="' + e + '" aria-label="Remove ' + esc(nm) + ' from basket" title="Remove">&times;</button></div></li>';
    }).join('') : '<li class="empty">Your basket is empty. Add something delicious.</li>';
    var bar = document.getElementById('dbar'), dc = document.getElementById('dcount'), conf = document.getElementById('dconf');
    if (bar) { bar.hidden = !ks.length; document.getElementById('dbtxt').textContent = ks.length + (ks.length === 1 ? ' item' : ' items') + ' · ' + total() + ' in total'; }
    if (dc) dc.textContent = ks.length ? '(' + total() + ')' : '';
    if (conf && !ks.length) conf.hidden = true;
    var box = document.getElementById('dsum');
    if (box) {
      if (!ks.length) box.hidden = true;
      else { var s = sums(); box.hidden = false;
        box.innerHTML = '<div><span>Subtotal</span><b>' + money(s.sub) + '</b></div>' + (s.del === null ? '<div><span>Delivery</span><b>Confirmed on WhatsApp</b></div>' : '<div><span>Delivery</span><b>' + (s.del === 0 ? 'FREE' : money(s.del)) + '</b></div>') +
          '<div class="t"><span>Total</span><b>' + money(s.tot) + '</b></div>' + (s.hint ? '<p>' + s.hint + '</p>' : ''); }
    }
    save();
  }
  if (list) list.addEventListener('click', function (e) {
    var rm = e.target.closest('button[data-rm]'); if (rm) { delete cart[rm.dataset.rm]; render(); return; }
    var b = e.target.closest('button[data-k]'); if (!b) return;
    var k = b.dataset.k; cart[k] = (cart[k] || 0) + parseInt(b.dataset.d, 10);
    if (cart[k] <= 0) delete cart[k]; render();
  });
  var clr = document.getElementById('dclear'), cf = document.getElementById('dconf');
  if (clr) clr.addEventListener('click', function () { if (cf) { cf.hidden = false; document.getElementById('dyes').focus(); } });
  if (cf) {
    document.getElementById('dno').addEventListener('click', function () { cf.hidden = true; });
    document.getElementById('dyes').addEventListener('click', function () {
      cart = {}; skus = {}; try { localStorage.removeItem('he_cart'); localStorage.removeItem('he_cart_sku'); } catch (e) {} cf.hidden = true; render();
      var t = document.getElementById('toast'); if (t) { t.querySelector('b').textContent = 'Basket cleared'; t.classList.add('show'); setTimeout(function () { t.classList.remove('show'); }, 2000); }
    });
  }
  function openDrawer(o) {
    if (!drawer) return; drawer.classList.toggle('open', o); scrim.classList.toggle('open', o);
    drawer.setAttribute('aria-hidden', !o); document.body.style.overflow = o ? 'hidden' : '';
    if (o) drawer.querySelector('#dclose').focus();
  }
  var cb = document.getElementById('cartbtn'); if (cb) cb.addEventListener('click', function () { openDrawer(true); });
  var dc = document.getElementById('dclose'); if (dc) dc.addEventListener('click', function () { openDrawer(false); });
  if (scrim) scrim.addEventListener('click', function () { openDrawer(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') openDrawer(false); });
  function details() {   // shared by "Pay by card" and "WhatsApp": reads and checks the name, postcode and notes
    var nameEl = document.getElementById('dname'), pcEl = document.getElementById('dpc'), noteEl = document.getElementById('dnote'), warn = document.getElementById('dwarn');
    var nm = (nameEl.value || '').trim().replace(/\s+/g, ' '), pc = (pcEl.value || '').trim(), note = (noteEl.value || '').trim().replace(/\s+/g, ' ');
    var addr = window.HE_ADDR ? HE_ADDR.value(pcEl) : pc, bad = '';
    if (!nm) { bad = 'Please add your name so we deliver to the right person.'; nameEl.focus(); } else if (!pc) { bad = 'Please add your delivery postcode.'; pcEl.focus(); }
    [nameEl, pcEl].forEach(function (el) { el.addEventListener('input', function () { if (warn) warn.hidden = true; }, { once: true }); });
    if (warn) { warn.textContent = bad; warn.hidden = !bad; }
    return bad ? null : { nm: nm, pc: pc, note: note, addr: addr, warn: warn };
  }
  // card payment only appears once Stripe is switched on for the site (keys on the server); until then the basket offers WhatsApp only
  (function () { var box = document.getElementById('dpay'); if (!box) return; document.body.classList.add('nopay');
    fetch('api/pay-ready.php', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ready) document.body.classList.remove('nopay'); }).catch(function () {}); })();
  var pay = document.getElementById('dpay');
  if (pay) pay.addEventListener('click', function () {
    var ks = Object.keys(cart); if (!ks.length) return; var d = details(); if (!d) return;
    var items = [], missing = false; ks.forEach(function (k) { if (skus[k]) items.push({ sku: skus[k], qty: cart[k] }); else missing = true; });
    function fail(msg) { d.warn.textContent = msg; d.warn.hidden = false; pay.disabled = false; pay.classList.remove('busy'); }
    if (missing || !items.length) return fail('Please remove and re-add the items in your basket, then try again.');
    pay.disabled = true; pay.classList.add('busy');
    fetch('api/checkout.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: items, name: d.nm, postcode: d.pc.toUpperCase(), address: d.addr, note: d.note }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) { if (x.ok && x.j.url && /^https:\/\/checkout\.stripe\.com\//.test(x.j.url)) { location.href = x.j.url; } else fail(x.j.error || 'We could not start the payment. Please try again or use WhatsApp.'); })
      .catch(function () { fail('No connection. Please try again, or order on WhatsApp.'); });
  });
  var send = document.getElementById('dsend');
  if (send) send.addEventListener('click', function () {
    var ks = Object.keys(cart); if (!ks.length) return; var d = details(); if (!d) return; var nm = d.nm, pc = d.pc, note = d.note, addr = d.addr;
    var s = sums(), msg = 'Hello Heavenly EcoServe, I would like to order:\n' + ks.map(function (k) { var p = priceOf(k); return '- ' + cart[k] + ' x ' + k + (p ? ' = ' + money(cart[k] * p) : ''); }).join('\n') +
      '\n\nSubtotal: ' + money(s.sub) + (s.del === null ? '' : '\nDelivery: ' + (s.del === 0 ? 'FREE' : money(s.del))) + '\nTotal: ' + money(s.tot) +
      '\n\nName: ' + nm + '\nDelivery address: ' + addr + (note ? '\nDriver instructions: ' + note : '') + '\n\nAllergies / notes: ';
    location.href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);   // same-tab: avoids iOS pop-up blocking
  });

  function sparkle(x, y) {
    if (reduce) return;
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span'); s.className = 'spark';
      var a = Math.random() * 6.28, d = 30 + Math.random() * 40;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--x', Math.cos(a) * d + 'px'); s.style.setProperty('--y', Math.sin(a) * d + 'px');
      document.body.appendChild(s); setTimeout(function (n) { n.remove(); }.bind(null, s), 900);
    }
  }
  var toast = document.getElementById('toast'), tt;
  document.querySelectorAll('.add').forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.dataset.item; cart[name] = (cart[name] || 0) + 1; if (b.dataset.sku) { skus[name] = b.dataset.sku; try { localStorage.setItem('he_cart_sku', JSON.stringify(skus)); } catch (e) {} } render();
      var r = b.getBoundingClientRect(); sparkle(r.left + r.width / 2, r.top + r.height / 2);
      if (toast) {
        toast.querySelector('b').textContent = name + ' added';
        toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 2200);
      }
    });
  });
  render();

  /* ---------- Offline/installable (PWA) ---------- */
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
