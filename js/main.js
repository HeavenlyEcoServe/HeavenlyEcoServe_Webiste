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
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('he_cart') || '{}'); } catch (e) {}
  var count = document.getElementById('cartcount'), list = document.getElementById('dlist'),
      drawer = document.getElementById('drawer'), scrim = document.getElementById('scrim');
  function total() { return Object.keys(cart).reduce(function (n, k) { return n + cart[k]; }, 0); }
  function save() { try { localStorage.setItem('he_cart', JSON.stringify(cart)); } catch (e) {} }
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function render() {
    if (count) count.textContent = total();
    if (!list) return;
    var ks = Object.keys(cart);
    list.innerHTML = ks.length ? ks.map(function (k) {
      return '<li><span>' + esc(k) + '</span><span class="q"><button data-d="-1" data-k="' + esc(k) + '" aria-label="Remove one ' + esc(k) + '">&minus;</button><b>' + cart[k] + '</b><button data-d="1" data-k="' + esc(k) + '" aria-label="Add one ' + esc(k) + '">+</button></span></li>';
    }).join('') : '<li class="empty">Your basket is empty. Add something delicious.</li>';
    save();
  }
  if (list) list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-k]'); if (!b) return;
    var k = b.dataset.k; cart[k] = (cart[k] || 0) + parseInt(b.dataset.d, 10);
    if (cart[k] <= 0) delete cart[k]; render();
  });
  function openDrawer(o) {
    if (!drawer) return; drawer.classList.toggle('open', o); scrim.classList.toggle('open', o);
    drawer.setAttribute('aria-hidden', !o); document.body.style.overflow = o ? 'hidden' : '';
    if (o) drawer.querySelector('#dclose').focus();
  }
  var cb = document.getElementById('cartbtn'); if (cb) cb.addEventListener('click', function () { openDrawer(true); });
  var dc = document.getElementById('dclose'); if (dc) dc.addEventListener('click', function () { openDrawer(false); });
  if (scrim) scrim.addEventListener('click', function () { openDrawer(false); });
  addEventListener('keydown', function (e) { if (e.key === 'Escape') openDrawer(false); });
  var send = document.getElementById('dsend');
  if (send) send.addEventListener('click', function () {
    var ks = Object.keys(cart); if (!ks.length) return;
    var pc = (document.getElementById('dpc').value || '').trim();
    var msg = 'Hello Heavenly EcoServe, I would like to order:\n' + ks.map(function (k) { return '- ' + cart[k] + ' x ' + k; }).join('\n') + '\n\nDelivery postcode: ' + pc;
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
      var name = b.dataset.item; cart[name] = (cart[name] || 0) + 1; render();
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
