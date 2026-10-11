/* Heavenly EcoServe: Share Studio. Pick dishes, draw a branded card, send card + message to WhatsApp. No libraries, no data leaves the device. */
(function () {
  'use strict';
  var D = window.HE_SHARE || { items: [], photos: [], wa: '' };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var gbp = function (n) { return '£' + Number(n).toFixed(2); };
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var SERIF = '"Playfair Display", Georgia, "Times New Roman", serif', SANS = 'Inter, "Segoe UI", system-ui, -apple-system, sans-serif';
  var KEY = 'he_share_v1';
  var params = new URLSearchParams(location.search);

  /* ---------------- small helpers ---------------- */
  function toast(msg) {
    var t = $('#toast'); if (!t) return; var b = t.querySelector('b'); if (b) b.textContent = msg;
    t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ sel: S.sel, custom: S.custom.map(function (i) { return i.photo && i.photo.slice(0, 5) === 'data:' ? Object.assign({}, i, { photo: guessPhoto(i.name) }) : i; }), title: S.title, titleAuto: S.titleAuto, greet: S.greet, style: S.style, layout: S.layout, prices: S.prices, link: S.link, num: S.num })); } catch (e) {} }
  function digits(v) { var d = String(v || '').replace(/\D/g, ''); if (d.indexOf('00') === 0) d = d.slice(2); if (d.charAt(0) === '0') d = '44' + d.slice(1); return d; }
  function waUrl(num, text) { return 'https://wa.me/' + (num || '') + '?text=' + encodeURIComponent(text); }
  function baseUrl() { return (D.url ? D.url + '/' : location.href.split('?')[0].replace(/[^\/]*$/, '')) + 'share.html'; }

  /* closest-looking photo for an item that is not on the menu yet */
  var GUESS = [[/samosa/, 'samosa2'], [/roll|puff|pakora|pakoda|kachori|tikki|snack|nugget|bite|wrap|spring/, 'snacks'], [/thepla/, 'thepla'], [/paratha|parantha/, 'paratha'], [/chapati|roti|naan|bread|phulka|wrap/, 'chapati'],
    [/jalebi|sweet|gulab|ras/, 'jalebi'], [/barfi|burfi|ladoo|laddu|halwa|peda/, 'barfi'], [/khir|kheer|pudding|rice/, 'khir'], [/paneer|manchurian|noodle|chilli|chow/, 'paneer'], [/pav|bhaji/, 'pavbhaji'], [/chaat|puri|pani/, 'chaat'],
    [/tiffin|meal|thali|curry|dal/, 'tiffin'], [/family|pack|party/, 'family'], [/savour|mix|chevda|chivda|bhujia/, 'savouries']];
  function guessPhoto(name) {
    var n = String(name || '').toLowerCase(), hit = null;
    GUESS.some(function (g) { if (g[0].test(n)) { hit = g[1]; return true; } return false; });
    var want = 'media/photos/' + (hit || 'snacks') + '.jpg';
    return (D.photos || []).indexOf(want) >= 0 ? want : ((D.photos || [])[0] || '');
  }
  /* ---------------- state ---------------- */
  var saved = load() || {};
  var S = { sel: saved.sel || {}, custom: saved.custom || [], title: saved.title || '', titleAuto: saved.titleAuto !== false, greet: saved.greet || '', style: saved.style || 'night',
    layout: saved.layout || 'layers', photos: true, prices: saved.prices !== false, link: saved.link !== false, num: saved.num || '', filter: 'all', q: '' };
  var hasFrozen = D.items.some(function (i) { return i.frozen; });
  var cats = []; D.items.forEach(function (i) { if (cats.indexOf(i.cat) < 0) cats.push(i.cat); });
  function all() { return D.items.concat(S.custom); }
  function chosen() { return all().filter(function (i) { return S.sel[i.sku]; }); }
  function shown() {
    var q = S.q.trim().toLowerCase();
    return all().filter(function (i) {
      if (S.filter === 'frozen' && !i.frozen) return false;
      if (S.filter !== 'all' && S.filter !== 'frozen' && i.cat !== S.filter) return false;
      return !q || (i.name + ' ' + i.pack + ' ' + (i.cat || '')).toLowerCase().indexOf(q) >= 0;
    });
  }
  function autoTitle() { return S.filter === 'frozen' ? 'Frozen Range' : (S.filter !== 'all' ? S.filter : 'Our Menu'); }

  /* ---------------- themes for the card ---------------- */
  var TH = {
    night:   { tone: 'dark', name: 'Midnight', bg1: '#06100c', bg2: '#0f3d2e', ink: '#fbf6ea', mut: '#c5d0c6', gold: '#e8c877', onGold: '#0f3d2e', frame: 'rgba(232,200,119,.4)', glow: 'rgba(232,200,119,.22)', logo: 'img/logo-reversed.png', sw: 'linear-gradient(135deg,#06100c,#0f3d2e)' },
    sunrise: { tone: 'dark', name: 'Sunrise', bg1: '#2b1307', bg2: '#b5652e', ink: '#fff6e6', mut: '#f3d9b9', gold: '#ffd27a', onGold: '#2b1307', frame: 'rgba(255,210,122,.45)', glow: 'rgba(255,190,90,.3)', logo: 'img/logo-reversed.png', sw: 'linear-gradient(135deg,#2b1307,#e0842f)' },
    garden:  { tone: 'dark', name: 'Garden', bg1: '#0a3324', bg2: '#2e9e5b', ink: '#f4fff6', mut: '#cfe9d6', gold: '#f2dc8a', onGold: '#0a3324', frame: 'rgba(242,220,138,.45)', glow: 'rgba(160,255,190,.22)', logo: 'img/logo-reversed.png', sw: 'linear-gradient(135deg,#0a3324,#2e9e5b)' },
    cream:   { tone: 'light', name: 'Cream', bg1: '#fbf6ea', bg2: '#efe2bd', ink: '#0f3d2e', mut: '#5c5a50', gold: '#b88a28', onGold: '#fffdf5', frame: 'rgba(15,61,46,.28)', glow: 'rgba(201,162,75,.25)', logo: 'img/logo.png', sw: 'linear-gradient(135deg,#fbf6ea,#e6d6a4)' }
  };
  if (!TH[S.style]) S.style = 'night';

  /* ---------------- canvas helpers ---------------- */
  var cache = {};
  function fontsReady() { try { return Promise.all([document.fonts.load('700 40px "Playfair Display"'), document.fonts.load('600 28px Inter'), document.fonts.load('400 28px Inter')]).catch(function () {}); } catch (e) { return Promise.resolve(); } }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function cover(c, img, x, y, w, h) { var s = Math.max(w / img.width, h / img.height), dw = img.width * s, dh = img.height * s; c.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }
  function lines(c, text, maxW, maxLines) {
    var words = String(text).split(/\s+/), out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var t = cur ? cur + ' ' + words[i] : words[i];
      if (c.measureText(t).width > maxW && cur) { out.push(cur); cur = words[i]; } else cur = t;
    }
    if (cur) out.push(cur);
    if (out.length > maxLines) { out = out.slice(0, maxLines); var last = out[maxLines - 1]; while (c.measureText(last + '…').width > maxW && last.length > 1) last = last.slice(0, -1); out[maxLines - 1] = last + '…'; }
    return out;
  }
  function spaced(c, v) { try { c.letterSpacing = v; } catch (e) {} }

  var cv = $('#shcanvas'), tok = 0;
  /* Photos: normally the website's own files. When the page is opened straight from a file, browsers refuse to export a canvas that
     used files from disk, so the embedded copies in js/share-photos.js (data: addresses) are used instead. */
  var FILE = location.protocol === 'file:', BLOCK = false;
  function photoSrc(path) { if (!path) return null; if (path.slice(0, 5) === 'data:') return path; if (BLOCK) return null; if (FILE) return (window.HE_PHOTOS && window.HE_PHOTOS[path]) || null; return path; }
  function loadImg(path) { var src = photoSrc(path); if (!src) return Promise.resolve(null); return cache[src] || (cache[src] = new Promise(function (res) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; })); }
  function loadEmbedded() {
    if (!FILE || window.HE_PHOTOS) return Promise.resolve();
    return new Promise(function (res) { var s = document.createElement('script'); s.src = 'js/share-photos.js'; s.onload = res; s.onerror = function () { BLOCK = true; res(); }; document.head.appendChild(s); });
  }
  function render() {
    var t = ++tok, items = chosen();
    updateUI(items);
    if (!cv) return Promise.resolve();
    var th = TH[S.style];
    return loadEmbedded().then(function () {
      return Promise.all([fontsReady(), loadImg(th.logo)].concat(items.map(function (it) { return loadImg(it.photo); })));
    }).then(function (r) { if (t !== tok) return; draw(items, r[1], r.slice(2)); });
  }
  // image covering w x h whose lower part (from fraction a to b of the height) fades to transparent
  function faded(src, w, h, a, b) {
    var o = document.createElement('canvas'); o.width = w; o.height = h; var x = o.getContext('2d'); cover(x, src, -60, -60, w + 120, h + 120);
    x.globalCompositeOperation = 'destination-in'; var g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#000'); g.addColorStop(a, '#000'); g.addColorStop(b, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); return o;
  }
  function hexA(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function tiny(img, w) { var c = document.createElement('canvas'); c.width = w; c.height = Math.max(1, Math.round(w * img.height / img.width)); var x = c.getContext('2d'); try { x.imageSmoothingQuality = 'high'; } catch (e) {} x.drawImage(img, 0, 0, c.width, c.height); return c; }   // shrink then stretch = a cheap blur that works in every browser
  function mono(c, th, x, y, w, h, letter) {
    var g = c.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#165a43'); g.addColorStop(1, '#06100c'); c.fillStyle = g; c.fillRect(x, y, w, h);
    c.fillStyle = '#e8c877'; c.globalAlpha = 0.4; c.font = '700 ' + Math.round(Math.min(w, h) * 0.6) + 'px ' + SERIF; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText((letter || '').toUpperCase(), x + w / 2, y + h / 2 + 4); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.globalAlpha = 1;
  }
  // a photo in a rounded frame with ring and shadow; rot in degrees; r = corner radius (w/2 for a circle)
  function shape(c, th, img, letter, x, y, w, h, r, o) {
    o = o || {}; c.save(); c.translate(x + w / 2, y + h / 2); if (o.rot) c.rotate(o.rot * Math.PI / 180);
    var rw = o.ringW == null ? 8 : o.ringW;
    c.shadowColor = 'rgba(0,0,0,' + (o.sh == null ? 0.5 : o.sh) + ')'; c.shadowBlur = o.blur || 34; c.shadowOffsetY = o.dy == null ? 18 : o.dy;
    c.fillStyle = o.ring || th.gold; rr(c, -w / 2 - rw, -h / 2 - rw, w + 2 * rw, h + 2 * rw, r + rw); c.fill();
    c.shadowColor = 'rgba(0,0,0,0)'; c.save(); rr(c, -w / 2, -h / 2, w, h, r); c.clip();
    if (img) cover(c, img, -w / 2, -h / 2, w, h); else mono(c, th, -w / 2, -h / 2, w, h, letter);
    c.restore(); c.restore();
  }
  function textLogo(c, th, P) {
    c.fillStyle = th.gold; c.beginPath(); c.arc(P + 38, 112, 34, 0, 7); c.fill(); c.fillStyle = th.onGold; c.beginPath(); c.arc(P + 38, 120, 18, 0, 7); c.fill();
    c.fillStyle = th.ink; c.font = '700 70px ' + SERIF; c.fillText('Heavenly', P + 92, 118); c.fillStyle = th.gold; c.font = '600 22px ' + SANS; spaced(c, '8px'); c.fillText('ECOSERVE', P + 96, 156); spaced(c, '0px');
  }
  function footer(c, th, W, P, fy, bg) {
    if (bg) { var fh = 440, o = faded(tiny(bg, 40), W, fh, 0.0, 1); var m = document.createElement('canvas'); m.width = W; m.height = fh; var x = m.getContext('2d'); cover(x, tiny(bg, 40), -60, -60, W + 120, fh + 120);
      x.globalCompositeOperation = 'destination-in'; var g = x.createLinearGradient(0, 0, 0, fh); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, '#000'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, W, fh); c.save(); c.globalAlpha = 0.3; c.drawImage(m, 0, fy - 150); c.restore(); }
    c.fillStyle = th.gold; c.fillRect(P, fy, W - 2 * P, 3);
    c.fillStyle = th.gold; c.font = '600 24px ' + SANS; spaced(c, '6px'); c.fillText('ORDER ON WHATSAPP', P, fy + 56); spaced(c, '0px');
    c.fillStyle = th.ink; c.font = '700 74px ' + SERIF; c.fillText(D.phone || '', P, fy + 142);
    c.fillStyle = th.mut; c.font = '400 28px ' + SANS; var sub = (D.url ? D.url.replace(/^https?:\/\//, '') : 'heavenlyecoserve.com') + (D.delivery ? '  ·  Delivery: ' + D.delivery : ''); c.fillText(lines(c, sub, W - 2 * P, 1)[0], P, fy + 190);
    c.font = '400 22px ' + SANS; c.fillStyle = th.mut; c.globalAlpha = 0.9; c.fillText('Allergies? Please ask us before ordering.' + (D.rating ? '   Food Hygiene Rating: ' + String(D.rating).split(' ')[0] : ''), P, fy + 236); c.globalAlpha = 1;
  }
  function backdrop(c, th, W, H, hero, headH) {
    var g = c.createLinearGradient(0, 0, W * 0.7, H); g.addColorStop(0, th.bg1); g.addColorStop(1, th.bg2); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (hero) { c.save(); c.globalAlpha = th.tone === 'light' ? 0.45 : 0.65; c.drawImage(faded(tiny(hero, 40), W, headH + 260, 0.55, 1), 0, 0); c.restore(); }
    if (headH) { var ov = c.createLinearGradient(0, 0, 0, headH + 260); ov.addColorStop(0, hexA(th.bg1, 0.3)); ov.addColorStop(0.55, hexA(th.bg1, 0.78)); ov.addColorStop(1, hexA(th.bg1, 0)); c.fillStyle = ov; c.fillRect(0, 0, W, headH + 260); }
    var rg = c.createRadialGradient(W - 100, 140, 10, W - 100, 140, 560); rg.addColorStop(0, th.glow); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
  }
  function draw(items, logo, imgs) {
    var th = TH[S.style], W = 1080, P = 60, n = items.length, c;
    if (S.layout === 'layers') return drawLayers(items, logo, imgs, th);
    var grid = S.layout === 'grid', G = 24, TW = 468, TH_ = 330, y0 = 455, bodyH;
    if (!n) bodyH = 0; else bodyH = grid ? Math.ceil(n / 2) * (TH_ + G) : n * 108 + 20;
    var H = Math.max(1350, y0 + bodyH + 330); cv.width = W; cv.height = H; c = cv.getContext('2d');
    backdrop(c, th, W, H, null, 0);
    c.strokeStyle = th.frame; c.lineWidth = 2; rr(c, 22, 22, W - 44, H - 44, 34); c.stroke();
    if (logo) { var lw = 380, lh = lw * logo.height / logo.width; c.drawImage(logo, P, 60, lw, lh); } else textLogo(c, th, P);
    c.textBaseline = 'alphabetic'; c.fillStyle = th.gold; c.font = '600 24px ' + SANS; spaced(c, '6px'); c.fillText('FROM OUR LEICESTER KITCHEN', P, 225); spaced(c, '0px');
    var title = S.title || autoTitle(), fs = 108; c.font = '700 ' + fs + 'px ' + SERIF;
    while (c.measureText(title).width > W - 2 * P && fs > 52) { fs -= 4; c.font = '700 ' + fs + 'px ' + SERIF; }
    c.fillStyle = th.ink; c.fillText(title, P, 335); c.fillStyle = th.gold; c.fillRect(P, 365, 150, 6);
    c.fillStyle = th.mut; c.font = '400 28px ' + SANS; c.fillText(n ? n + (n === 1 ? ' dish' : ' dishes') + '  ·  homemade with love' : 'Pick your dishes', P, 410);
    items.forEach(function (it, i) {
      if (grid) {
        var odd = (n % 2 === 1 && i === n - 1 && n > 1), col = i % 2, row = Math.floor(i / 2), w = odd ? W - 2 * P : TW, x = odd ? P : P + col * (TW + G), y = y0 + row * (TH_ + G);
        c.save(); rr(c, x, y, w, TH_, 28); c.clip(); if (imgs[i]) cover(c, imgs[i], x, y, w, TH_); else mono(c, th, x, y, w, TH_, it.name.charAt(0));
        var sh = c.createLinearGradient(0, y + TH_ * 0.35, 0, y + TH_); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.82)'); c.fillStyle = sh; c.fillRect(x, y, w, TH_); c.restore();
        c.strokeStyle = th.frame; c.lineWidth = 2; rr(c, x, y, w, TH_, 28); c.stroke();
        c.fillStyle = '#fffaf0'; c.font = '700 36px ' + SERIF; var nl = lines(c, it.name, w - 56, 2), by = y + TH_ - 30 - (it.pack ? 34 : 0) - (nl.length - 1) * 42;
        nl.forEach(function (l, k) { c.fillText(l, x + 28, by + k * 42); });
        if (it.pack) { c.fillStyle = 'rgba(255,250,240,.82)'; c.font = '400 25px ' + SANS; c.fillText(it.pack, x + 28, y + TH_ - 26); }
        if (S.prices && it.price != null && it.price !== '') { var pt = gbp(it.price); c.font = '700 30px ' + SANS; var pw = c.measureText(pt).width + 36; c.fillStyle = th.gold; rr(c, x + w - pw - 18, y + 18, pw, 52, 26); c.fill(); c.fillStyle = th.onGold; c.fillText(pt, x + w - pw, y + 54); }
      } else {
        var ry = y0 + i * 108; c.fillStyle = th.gold; c.beginPath(); c.arc(P + 14, ry + 52, 9, 0, 7); c.fill();
        c.fillStyle = th.ink; c.font = '700 40px ' + SERIF; c.fillText(it.name, P + 44, ry + 56); c.fillStyle = th.mut; c.font = '400 26px ' + SANS; if (it.pack) c.fillText(it.pack, P + 44, ry + 92);
        if (S.prices && it.price != null && it.price !== '') { c.fillStyle = th.gold; c.font = '700 40px ' + SANS; c.textAlign = 'right'; c.fillText(gbp(it.price), W - P, ry + 56); c.textAlign = 'left'; }
        c.strokeStyle = th.frame; c.lineWidth = 1; c.beginPath(); c.moveTo(P, ry + 106); c.lineTo(W - P, ry + 106); c.stroke();
      }
    });
    footer(c, th, W, P, y0 + bodyH + 36, null);
  }
  function drawLayers(items, logo, imgs, th) {
    var W = 1080, P = 60, n = items.length, CH = 196, GY = 48, STAG = 44;
    var c0 = document.createElement('canvas').getContext('2d'), ttl = S.title || autoTitle(), tfs = 118, twords = ttl.split(/\s+/);
    c0.font = '700 ' + tfs + 'px ' + SERIF; while (Math.max.apply(null, twords.map(function (w) { return c0.measureText(w).width; })) > 470 && tfs > 56) { tfs -= 4; c0.font = '700 ' + tfs + 'px ' + SERIF; }
    var tlines = lines(c0, ttl, 520, 3), tyEnd = 340 + (tlines.length - 1) * tfs * 0.98 + 130;      // bottom of the headline + "N dishes / homemade with love"
    var cy2 = Math.max(610, tyEnd + 40), headH = Math.max(905, cy2 + 330);
    var rows = Math.ceil(n / 2), bodyH = n ? rows * (CH + GY) + (n > 1 ? STAG : 0) : 0, H = Math.max(1350, headH + bodyH + 360);
    cv.width = W; cv.height = H; var c = cv.getContext('2d'); c.textBaseline = 'alphabetic';
    var pics = imgs.filter(Boolean), names = items.length ? items : [{ name: 'Menu' }];
    var P0 = pics[0] || null, P1 = pics[1] || pics[0] || null, P2 = pics[2] || pics[0] || null, P3 = pics[3] || pics[1] || pics[0] || null;
    /* layer 1: blurred photo backdrop + colour wash */
    backdrop(c, th, W, H, P0, headH);
    /* layer 2: giant ghost word + rings */
    var title = S.title || autoTitle(), ghost = title.split(/\s+/)[0].toUpperCase(), gs = 330; c.font = '700 ' + gs + 'px ' + SERIF; while (c.measureText(ghost).width > W + 40 && gs > 120) { gs -= 10; c.font = '700 ' + gs + 'px ' + SERIF; }
    c.fillStyle = hexA(th.ink, 0.07); c.fillText(ghost, -14, 640);
    c.strokeStyle = hexA(th.gold, 0.28); c.lineWidth = 3; [250, 340, 430].forEach(function (r, k) { c.globalAlpha = 1 - k * 0.28; c.beginPath(); c.arc(W - 40, 420, r, 0, 7); c.stroke(); }); c.globalAlpha = 1;
    /* layer 3: photo collage (tilted card, two circles, small tile) */
    var tall = P0 && P0.height > P0.width * 1.15, hw = tall ? 430 : 540, hh = tall ? Math.min(570, cy2 + 140 - 250) : 440, hx = tall ? 548 : 470;
    shape(c, th, P0, names[0].name.charAt(0), hx, 250, hw, hh, 44, { rot: 3.2, ring: th.tone === 'light' ? '#ffffff' : '#fffaf0', ringW: 10, blur: 46, dy: 26, sh: 0.6 });
    shape(c, th, P1, (names[1] || names[0]).name.charAt(0), 850, Math.max(690, 250 + hh + 20), 190, 190, 95, { ring: th.gold, ringW: 8 });
    shape(c, th, P2, (names[2] || names[0]).name.charAt(0), 70, cy2, 280, 280, 140, { ring: th.gold, ringW: 9, blur: 40, dy: 22 });
    shape(c, th, P3, (names[3] || names[0]).name.charAt(0), 372, cy2 + 120, 170, 170, 34, { rot: -7, ring: '#fffaf0', ringW: 7 });
    /* layer 4: frame, logo, words */
    c.strokeStyle = th.frame; c.lineWidth = 2; rr(c, 22, 22, W - 44, H - 44, 34); c.stroke();
    if (logo) { var lw = 360, lh = lw * logo.height / logo.width; c.drawImage(logo, P, 58, lw, lh); } else textLogo(c, th, P);
    c.fillStyle = th.gold; c.font = '600 22px ' + SANS; spaced(c, '6px'); c.fillText('FROM OUR LEICESTER KITCHEN', P, 232); spaced(c, '0px');
    var fs = tfs; c.font = '700 ' + fs + 'px ' + SERIF;
    var tl = tlines; c.save(); c.shadowColor = th.tone === 'light' ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.7)'; c.shadowBlur = 26; c.shadowOffsetY = 4; c.fillStyle = th.ink;
    tl.forEach(function (l, k) { c.fillText(l, P, 340 + k * fs * 0.98); }); c.restore();
    var ty = 340 + (tl.length - 1) * fs * 0.98; c.fillStyle = th.gold; c.fillRect(P, ty + 30, 150, 6);
    c.fillStyle = th.ink; c.globalAlpha = 0.9; c.font = '600 30px ' + SANS; c.fillText(n ? n + (n === 1 ? ' dish' : ' dishes') : 'Pick your dishes', P, ty + 84); c.font = '400 25px ' + SANS; c.globalAlpha = 0.75; c.fillText('homemade with love', P, ty + 120); c.globalAlpha = 1;
    /* stamp badge */
    var lo = null; items.forEach(function (it) { if (it.price != null && it.price !== '' && (lo === null || it.price < lo)) lo = it.price; });
    c.save(); c.translate(965, 300); c.rotate(0.2); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 24; c.shadowOffsetY = 10; c.fillStyle = th.gold; c.beginPath(); c.arc(0, 0, 84, 0, 7); c.fill(); c.shadowColor = 'rgba(0,0,0,0)';
    c.strokeStyle = th.onGold; c.globalAlpha = 0.45; c.lineWidth = 2; c.setLineDash([3, 7]); c.beginPath(); c.arc(0, 0, 72, 0, 7); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.fillStyle = th.onGold; c.textAlign = 'center'; if (S.prices && lo !== null) { c.font = '600 20px ' + SANS; c.fillText('FROM', 0, -22); c.font = '700 44px ' + SERIF; c.fillText(gbp(lo), 0, 24); } else { c.font = '700 54px ' + SERIF; c.fillText(String(n || 0), 0, 6); c.font = '600 20px ' + SANS; c.fillText(n === 1 ? 'DISH' : 'DISHES', 0, 38); }
    c.restore(); c.textAlign = 'left';
    /* layer 5: stacked item cards with overlapping photo circles and price tags */
    var pills = [];
    items.forEach(function (it, i) {
      var odd = (n % 2 === 1 && i === n - 1 && n > 1), col = i % 2, row = Math.floor(i / 2), w = odd ? W - 2 * P : 468, x = odd ? P : P + col * (468 + 24), y = headH + row * (CH + GY) + (col && !odd ? STAG : 0);
      c.save(); c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 30; c.shadowOffsetY = 14; c.fillStyle = th.tone === 'light' ? 'rgba(255,255,255,.78)' : 'rgba(255,255,255,.09)'; rr(c, x, y, w, CH, 34); c.fill(); c.restore();
      c.strokeStyle = th.frame; c.lineWidth = 2; rr(c, x, y, w, CH, 34); c.stroke();
      shape(c, th, imgs[i], it.name.charAt(0), x - 12, y + (CH - 176) / 2, 176, 176, 88, { ring: th.gold, ringW: 6, blur: 26, dy: 12, sh: 0.5 });
      var tx = x + 188, tw = w - 188 - 24; c.fillStyle = th.ink; c.font = '700 33px ' + SERIF; var nl = lines(c, it.name, tw, 2), by = y + 78 - (nl.length - 1) * 20;
      nl.forEach(function (l, k) { c.fillText(l, tx, by + k * 40); });
      if (it.pack) { c.fillStyle = th.mut; c.font = '400 23px ' + SANS; c.fillText(lines(c, it.pack, tw, 1)[0], tx, y + CH - 52 + (nl.length > 1 ? 10 : 0)); }
      pills.push([it, x, y, w]);
    });
    pills.forEach(function (q) { var it = q[0], x = q[1], y = q[2], w = q[3]; if (S.prices && it.price != null && it.price !== '') { var pt = gbp(it.price); c.font = '700 30px ' + SANS; var pw = c.measureText(pt).width + 38; c.save(); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 16; c.shadowOffsetY = 8; c.fillStyle = th.gold; rr(c, x + w - pw + 8, y + CH - 34, pw, 56, 28); c.fill(); c.restore(); c.fillStyle = th.onGold; c.fillText(pt, x + w - pw + 8 + 19, y + CH + 4); } });
    footer(c, th, W, P, headH + bodyH + 50, P1);
  }

  /* ---------------- message ---------------- */
  function customParam() { return S.custom.filter(function (i) { return S.sel[i.sku]; }).map(function (i) { return [i.name, i.pack, i.price == null ? '' : i.price]; }); }
  function linkUrl() {
    var ids = chosen().filter(function (i) { return !i.custom; }).map(function (i) { return i.sku; }), u = baseUrl() + '?v=1&i=' + ids.join(',');
    var cu = customParam(); if (cu.length) u += '&x=' + encodeURIComponent(JSON.stringify(cu));
    return u + '&t=' + encodeURIComponent(S.title || autoTitle());
  }
  function message() {
    var items = chosen(), L = ['*Heavenly EcoServe* 🌿', '*' + (S.title || autoTitle()) + '*'];
    if (S.greet.trim()) L.push('', S.greet.trim());
    L.push('');
    items.forEach(function (it) { L.push('▪ *' + it.name + '*' + (it.pack ? ' · ' + it.pack : '') + (S.prices && it.price != null && it.price !== '' ? ' — ' + gbp(it.price) : '')); });
    L.push('', '💬 Order on WhatsApp: https://wa.me/' + D.wa);
    if (S.link && items.length) L.push('🔗 See and order: ' + linkUrl());
    L.push('', '_Allergies? Please ask us before ordering._');
    return L.join('\n');
  }

  /* ---------------- picker UI ---------------- */
  function drawChips() {
    var defs = [['all', 'All']]; if (hasFrozen) defs.push(['frozen', 'Frozen']); cats.forEach(function (c) { defs.push([c, c]); });
    $('#shchips').innerHTML = defs.map(function (d) { return '<button class="chip" type="button" data-f="' + esc(d[0]) + '" aria-pressed="' + (S.filter === d[0]) + '">' + esc(d[1]) + '</button>'; }).join('');
  }
  function drawGrid() {
    var list = shown();
    $('#shgrid').innerHTML = list.length ? list.map(function (i) {
      var on = !!S.sel[i.sku];
      return '<button type="button" class="shp' + (on ? ' on' : '') + '" role="checkbox" aria-checked="' + on + '" data-k="' + esc(i.sku) + '">' +
        (i.photo ? '<img src="' + esc(i.photo) + '" alt="" loading="lazy" decoding="async">' : '<span class="shp-mono">' + esc(i.name.charAt(0)) + '</span>') +
        '<span class="shp-tick" aria-hidden="true"></span>' + (i.frozen ? '<span class="shp-frz">Frozen</span>' : '') + '<span class="shp-t"><b>' + esc(i.name) + '</b><small>' + esc(i.pack || '') + '</small>' + (i.price != null && i.price !== '' ? '<em>' + gbp(i.price) + '</em>' : '') + '</span></button>';
    }).join('') : '<p class="sh-none">No dishes match. Try another filter, or add your own item below.</p>';
  }
  function swatches() {
    $('#shsw').innerHTML = Object.keys(TH).map(function (k) { return '<button type="button" class="sw' + (S.style === k ? ' on' : '') + '" data-s="' + k + '" aria-pressed="' + (S.style === k) + '"><i style="background:' + TH[k].sw + '"></i>' + TH[k].name + '</button>'; }).join('');
  }
  function layouts() {
    $('#shlay').innerHTML = [['layers', 'Layers'], ['grid', 'Photo grid'], ['list', 'Simple list']].map(function (d) { return '<button type="button" class="sw txt' + (S.layout === d[0] ? ' on' : '') + '" data-l="' + d[0] + '" aria-pressed="' + (S.layout === d[0]) + '">' + d[1] + '</button>'; }).join('');
  }
  function updateUI(items) {
    var n = items.length;
    $('#shcount').textContent = n ? n + (n === 1 ? ' dish selected' : ' dishes selected') : 'Nothing selected yet';
    $('#shempty').style.display = n ? 'none' : 'flex'; cv.style.opacity = n ? 1 : 0.07;
    $('#shbubble').textContent = n ? message() : 'Your WhatsApp message will appear here.';
    var bar = $('#shbar'); if (bar) { bar.hidden = !n; $('#shbarn').textContent = n + (n === 1 ? ' dish' : ' dishes') + ' selected'; }
    ['shwa', 'shshare', 'shcopyimg', 'shdl', 'shcopytxt'].forEach(function (id) { $('#' + id).disabled = !n; });
  }
  function refreshAll() { drawChips(); drawGrid(); render(); save(); }

  /* ---------------- sending ---------------- */
  function target() { return digits(S.num); }
  // export the card; if the browser says the picture is "tainted" (local file), redraw without photos and try again
  function toBlob(cb, type, q) {
    function go(retry) {
      try { cv.toBlob(function (b) { cb(b); }, type || 'image/jpeg', q || 0.92); }
      catch (e) { if (!BLOCK && !retry) { BLOCK = true; noteMode(); render().then(function () { go(true); }); } else cb(null); }
    }
    go(false);
  }
  function noteMode() { var n = $('#shfile'); if (n) n.hidden = !BLOCK; }
  function copyPlain(text) {
    return new Promise(function (res) {
      function legacy() { try { var t = document.createElement('textarea'); t.value = text; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(t); t.select(); t.setSelectionRange(0, 99999); var ok = document.execCommand('copy'); t.remove(); res(!!ok); } catch (e) { res(false); } }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { res(true); }, legacy); else legacy();
    });
  }
  function sendText() { var items = chosen(); if (!items.length) return toast('Pick at least one dish first'); location.href = waUrl(target(), message()); }
  function shareCard() {
    if (!chosen().length) return toast('Pick at least one dish first');
    setTimeout(function () {
      toBlob(function (b) {
        if (!b) return toast('Could not make the card. Try again.');
        var file; try { file = new File([b], 'heavenly-ecoserve-menu.jpg', { type: 'image/jpeg' }); } catch (e) { file = null; }
        var data = file ? { files: [file], text: message(), title: S.title || autoTitle() } : null;
        if (data && navigator.canShare && navigator.canShare(data)) {
          copyPlain(message());
          navigator.share(data).catch(function () {}); toast('Choose WhatsApp. The message is also copied if you need to paste it.');
        } else { download(); toast('Card saved. Now attach it in WhatsApp (message opens next).'); setTimeout(sendText, 900); }
      });
    }, 60);
  }
  function download() { toBlob(function (b) { if (!b) return toast('Could not save the card. Try another browser.'); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'heavenly-ecoserve-' + (S.title || autoTitle()).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.jpg'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); }); }
  function copyImg() {
    toBlob(function (b) {
      if (!b) return toast('Could not copy the card. Try Download card instead.');
      try { navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]).then(function () { toast('Card copied. Paste it into WhatsApp (Ctrl+V or Cmd+V).'); }, function () { download(); toast('Your browser would not copy the picture, so it was saved instead.'); }); }
      catch (e) { download(); toast('Your browser would not copy the picture, so it was saved instead.'); }
    }, 'image/png');
  }
  function copyText() {
    copyPlain(message()).then(function (ok) { toast(ok ? 'Message copied' : 'Could not copy. Select the message text and copy it by hand.'); });
  }

  /* ---------------- wire up ---------------- */
  function init() {
    // selection grid
    $('#shgrid').addEventListener('click', function (e) { var b = e.target.closest('.shp'); if (!b) return; var k = b.dataset.k; if (S.sel[k]) delete S.sel[k]; else S.sel[k] = 1; b.classList.toggle('on', !!S.sel[k]); b.setAttribute('aria-checked', !!S.sel[k]); render(); save(); });
    $('#shchips').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; S.filter = b.dataset.f; if (S.titleAuto) { S.title = ''; $('#stitle').value = ''; } $('#stitle').placeholder = autoTitle(); drawChips(); drawGrid(); render(); });
    $('#shq').addEventListener('input', function () { S.q = this.value; drawGrid(); });
    $('#shall').addEventListener('click', function () { shown().forEach(function (i) { S.sel[i.sku] = 1; }); refreshAll(); });
    $('#shnone').addEventListener('click', function () { S.sel = {}; refreshAll(); });
    // custom item
    var ph = $('#cphoto'); ph.options[0].textContent = 'Auto (closest match)'; var upload = ''; D.photos.forEach(function (p) { var o = document.createElement('option'); o.value = p; o.textContent = p.replace(/^.*\//, '').replace(/\.jpg$/, '').replace(/-/g, ' '); ph.appendChild(o); });
    $('#cadd').addEventListener('click', function () {
      var name = $('#cname').value.trim(); if (!name) { toast('Give the item a name first'); return; }
      var pr = parseFloat($('#cprice').value.replace(',', '.')); var it = { sku: 'X' + Date.now().toString(36), name: name, pack: $('#cpack').value.trim(), price: isFinite(pr) ? pr : null, photo: upload || ph.value || guessPhoto(name), custom: true, cat: 'Your items', frozen: false };
      S.custom.push(it); S.sel[it.sku] = 1; upload = ''; $('#cfile').value = ''; $('#cfilen').textContent = ''; ['cname', 'cpack', 'cprice'].forEach(function (id) { $('#' + id).value = ''; }); toast(name + ' added'); refreshAll();
    });
    $('#cfile').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 900 / im.width), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); upload = c.toDataURL('image/jpeg', 0.85); $('#cfilen').textContent = '✓ ' + f.name; }; im.onerror = function () { toast('That file is not a picture'); }; im.src = r.result; };
      r.readAsDataURL(f);
    });
    // words & style
    $('#stitle').value = S.title; $('#stitle').placeholder = autoTitle(); $('#sgreet').value = S.greet; $('#snum').value = S.num;
    $('#stitle').addEventListener('input', function () { S.title = this.value; S.titleAuto = !this.value.trim(); render(); save(); });
    $('#sgreet').addEventListener('input', function () { S.greet = this.value; render(); save(); });
    $('#snum').addEventListener('input', function () { S.num = this.value; save(); });
    $('#shlay').addEventListener('click', function (e) { var b = e.target.closest('.sw'); if (!b) return; S.layout = b.dataset.l; layouts(); render(); save(); });
    $('#shsw').addEventListener('click', function (e) { var b = e.target.closest('.sw'); if (!b) return; S.style = b.dataset.s; swatches(); render(); save(); });
    [['tprices', 'prices'], ['tlink', 'link']].forEach(function (p) { var el = $('#' + p[0]); el.checked = S[p[1]]; el.addEventListener('change', function () { S[p[1]] = this.checked; render(); save(); }); });
    // actions
    $('#shwa').addEventListener('click', sendText); $('#shbarsend').addEventListener('click', sendText); $('#shshare').addEventListener('click', shareCard);
    $('#shcopyimg').addEventListener('click', copyImg); $('#shdl').addEventListener('click', download); $('#shcopytxt').addEventListener('click', copyText);
    var canFiles = false; try { canFiles = !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.png', { type: 'image/png' })] })); } catch (e) {}
    $('#shhint').innerHTML = canFiles ? '<b>On your phone:</b> tap <em>Share card + message</em>, choose WhatsApp, pick the chat. The picture and the text go together.' : '<b>On a computer:</b> tap <em>Copy card</em>, open WhatsApp Web, paste the picture, then use <em>Send on WhatsApp</em> for the message. Or <em>Download card</em> and drag it into the chat.';
    if (!canFiles) $('#shshare').textContent = 'Save card, then send message';
    noteMode(); swatches(); layouts(); refreshAll();
    var q = params.get('pick'); if (q === 'frozen' && hasFrozen) { S.filter = 'frozen'; drawChips(); drawGrid(); }
  }

  /* ---------------- customer view (opened from a shared link) ---------------- */
  function initView() {
    $('#shbuild').hidden = true; $('#shview').hidden = false; document.title = 'A selection from Heavenly EcoServe';
    var ids = (params.get('i') || '').split(',').filter(Boolean), items = D.items.filter(function (i) { return ids.indexOf(i.sku) >= 0; }), x = [];
    try { x = JSON.parse(params.get('x') || '[]'); } catch (e) {}
    x.slice(0, 30).forEach(function (a, k) { if (a && a[0]) items.push({ sku: 'X' + k, name: String(a[0]).slice(0, 40), pack: String(a[1] || '').slice(0, 30), price: a[2] === '' || a[2] == null ? null : Number(a[2]), photo: guessPhoto(a[0]) }); });
    $('#vtitle').textContent = (params.get('t') || 'Our menu').slice(0, 40); var qty = {};
    function vTotals() {
      var sub = Math.round(items.reduce(function (s, i) { return s + (qty[i.sku] || 0) * (i.price || 0); }, 0) * 100) / 100, del = null;
      if (typeof D.fee === 'number' && sub > 0) del = (typeof D.free === 'number' && sub > D.free) ? 0 : D.fee;
      return { sub: sub, del: del, tot: Math.round((sub + (del || 0)) * 100) / 100 };
    }
    function draw() {
      $('#vgrid').innerHTML = items.map(function (i) {
        return '<div class="vc"><div class="vimg">' + (i.photo ? '<img src="' + esc(i.photo) + '" alt="" loading="lazy">' : '<span>' + esc(i.name.charAt(0)) + '</span>') + '</div><div class="vt"><b>' + esc(i.name) + '</b><small>' + esc(i.pack) + '</small>' + (i.price != null ? '<em>' + gbp(i.price) + '</em>' : '') + '</div>' +
          '<div class="vq"><button type="button" data-k="' + esc(i.sku) + '" data-d="-1" aria-label="Fewer ' + esc(i.name) + '">−</button><span>' + (qty[i.sku] || 0) + '</span><button type="button" data-k="' + esc(i.sku) + '" data-d="1" aria-label="More ' + esc(i.name) + '">+</button></div></div>';
      }).join('') || '<p class="sh-none">This selection is empty. <a href="menu.html">See the full menu</a>.</p>';
      var t = vTotals(); $('#vtotal').textContent = gbp(t.tot); $('#vsub').textContent = t.sub ? 'Items ' + gbp(t.sub) + (t.del === null ? '' : ' + delivery ' + (t.del === 0 ? 'FREE' : gbp(t.del))) + ' = total' : 'Total';
    }
    $('#vgrid').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; var k = b.dataset.k; qty[k] = Math.max(0, Math.min(50, (qty[k] || 0) + Number(b.dataset.d))); draw(); });
    $('#vsend').addEventListener('click', function () {
      var chosenV = items.filter(function (i) { return qty[i.sku]; }); if (!chosenV.length) return toast('Choose how many of each first');
      var L = ['*Order for Heavenly EcoServe*', ''], tot = 0;
      chosenV.forEach(function (i) { var n = qty[i.sku]; tot += n * (i.price || 0); L.push('▪ ' + n + ' × *' + i.name + '*' + (i.pack ? ' (' + i.pack + ')' : '') + (i.price != null ? ' — ' + gbp(n * i.price) : '')); });
      var vt = vTotals(); L.push('', 'Subtotal: ' + gbp(vt.sub)); if (vt.del !== null) L.push('Delivery: ' + (vt.del === 0 ? 'FREE' : gbp(vt.del))); L.push('Total: ' + gbp(vt.tot), '', 'Delivery postcode: ', 'Allergies / notes: '); location.href = waUrl(D.wa, L.join('\n'));
    }); draw();
  }

  if (params.get('v') === '1') initView(); else init();
})();
