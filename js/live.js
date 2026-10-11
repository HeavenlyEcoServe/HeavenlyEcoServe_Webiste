/* Heavenly EcoServe: live photo layer. Everything that moves on the site is a REAL photograph (no drawn 3D shapes).
   1) Round food photos drift down the page with your scroll and lean toward the cursor.
   2) A photo viewer for the tiffin: drag or tap to flip through real pictures, tilts with the pointer.
   Optional: reduced motion, data-saver or the "Live photo scene" switch in the theme menu turn the floating layer off. */
(function () {
  'use strict';
  var D = document, root = D.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  function pref() { try { return localStorage.getItem('he_3d'); } catch (e) { return null; } }
  function wants() { return pref() !== 'off' && !reduce && !saveData; }

  /* ---------- 1. floating real photos ---------- */
  var POOL = ['media/photos/samosa.jpg', 'media/photos/jalebi.jpg', 'media/photos/paneer.jpg', 'media/photos/chaat.jpg', 'media/photos/paratha.jpg', 'media/photos/barfi.jpg', 'media/photos/khir.jpg', 'media/photos/pavbhaji2.jpg', 'media/photos/snacks.jpg', 'media/photos/thepla.jpg'];
  // x%, y%, size(px), scroll speed, tilt degrees
  var SPOTS = [[3, 14, 210, 0.16, -8], [97, 24, 150, -0.1, 7], [2, 52, 130, 0.09, 5], [96, 62, 230, -0.18, -6], [4, 84, 170, 0.12, 9], [97, 93, 120, -0.07, -9]];   // x,y = centre of the photo in % of the screen
  var layer = null, orbs = [], raf = 0, mx = 0, my = 0, running = false, H = innerHeight, W = innerWidth;

  function build() {
    if (layer) return;
    layer = D.createElement('div'); layer.id = 'pscene'; layer.setAttribute('aria-hidden', 'true');
    var small = innerWidth < 760, spots = small ? SPOTS.filter(function (s, i) { return i % 2 === 0; }) : SPOTS;
    var k = Math.floor(Math.random() * POOL.length);
    spots.forEach(function (s, i) {
      var el = D.createElement('i'), name = POOL[(k + i * 3) % POOL.length], size = Math.round(s[2] * (small ? 0.62 : 1));
      el.className = 'orb'; el.style.width = el.style.height = size + 'px'; el.style.backgroundImage = 'url(' + name + ')';
      layer.appendChild(el); orbs.push({ el: el, x: s[0], y: s[1], size: size, speed: s[3], tilt: s[4], depth: 0.4 + (i % 3) * 0.3 });
    });
    D.body.insertBefore(layer, D.body.firstChild);
  }
  function place() {
    var sy = window.pageYOffset || 0, span = H + 320;
    orbs.forEach(function (o) {
      var base = o.y / 100 * H, y = ((base - sy * (0.35 + Math.abs(o.speed) * 3) * (o.speed < 0 ? -1 : 1)) % span + span) % span - 160;
      var x = o.x / 100 * W - o.size / 2 + mx * 22 * o.depth, yy = y + my * 18 * o.depth, rot = o.tilt + sy * 0.012 * (o.speed < 0 ? -1 : 1) + mx * 6;
      o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
    });
  }
  function loop() { place(); raf = running ? requestAnimationFrame(loop) : 0; }
  function start() { if (!wants()) return; build(); layer.hidden = false; if (!running) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; if (layer) layer.hidden = true; }
  addEventListener('resize', function () { H = innerHeight; W = innerWidth; });
  if (fine) addEventListener('pointermove', function (e) { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; }, { passive: true });
  addEventListener('he3d', function () { wants() ? start() : stop(); });
  D.addEventListener('visibilitychange', function () { if (D.hidden) running = false; else if (wants() && layer && !layer.hidden) { running = true; loop(); } });
  start();

  /* ---------- 2. tiffin photo viewer ---------- */
  D.querySelectorAll('.tfv').forEach(function (host) {
    var slides = [].slice.call(host.querySelectorAll('.tfv-s')), dots = host.querySelector('.tfv-dots'), cap = host.querySelector('.tfv-cap'), cur = 0, timer = 0, sx = 0, dx = 0, down = false, moved = false;
    slides.forEach(function (s, i) { var b = D.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Show picture ' + (i + 1)); b.onclick = function (e) { e.stopPropagation(); go(i); }; dots.appendChild(b); });
    function go(n) {
      cur = (n + slides.length) % slides.length;
      slides.forEach(function (s, i) { var d = (i - cur + slides.length) % slides.length; s.className = 'tfv-s' + (d === 0 ? ' on' : d === 1 ? ' next' : ' prev'); });
      [].forEach.call(dots.children, function (b, i) { b.className = i === cur ? 'on' : ''; });
      if (cap) cap.textContent = slides[cur].dataset.cap || '';
    }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { if (!down && !host.matches(':hover')) go(cur + 1); }, 5200); }
    host.addEventListener('pointerdown', function (e) { down = true; moved = false; sx = e.clientX; dx = 0; try { host.setPointerCapture(e.pointerId); } catch (x) {} });
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect();
      if (down) { dx = e.clientX - sx; if (Math.abs(dx) > 6) moved = true; host.style.setProperty('--drag', Math.max(-80, Math.min(80, dx)) + 'px'); }
      if (fine && !reduce) { host.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 12).toFixed(2) + 'deg'); host.style.setProperty('--rx', ((0.5 - (e.clientY - r.top) / r.height) * 10).toFixed(2) + 'deg'); }
    });
    function up() { if (!down) return; down = false; host.style.setProperty('--drag', '0px'); if (moved && Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1)); else if (!moved) go(cur + 1); auto(); }
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', function () { down = false; host.style.setProperty('--drag', '0px'); });
    host.addEventListener('pointerleave', function () { host.style.setProperty('--rx', '0deg'); host.style.setProperty('--ry', '0deg'); });
    host.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(cur + 1); else if (e.key === 'ArrowLeft') go(cur - 1); });
    go(0); auto();
  });
})();
