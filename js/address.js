/* Heavenly EcoServe: postcode finder. Type a UK postcode and get suggestions, the area, the distance from our kitchen
   and (for the delivery address) the street, ready for a house number. Works on any input marked data-addr.
   Free sources (no key, nothing stored): postcodes.io (postcode data) and OpenStreetMap Nominatim (street name).
   Optional: a browser key from Ideal Postcodes (set in the admin) lists every house address for the postcode. */
(function () {
  'use strict';
  var D = document, body = D.body;
  var KITCHEN = (body.dataset.kitchen || '').toUpperCase(), RADIUS = parseFloat(body.dataset.radius) || 0, KEY = body.dataset.addrkey || '';
  var PC = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;
  var cache = {}, kitchenPos = null, nominatimAt = 0;
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var norm = function (v) { var m = String(v || '').trim().match(PC); return m ? m[1].toUpperCase() + ' ' + m[2].toUpperCase() : ''; };

  function getJSON(url, opts) {
    var ctl = ('AbortController' in window) ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    return fetch(url, Object.assign({ headers: { Accept: 'application/json' }, signal: ctl && ctl.signal, referrerPolicy: 'strict-origin-when-cross-origin' }, opts || {})).then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function lookup(pc) {
    var k = pc.replace(/\s/g, ''); if (cache[k]) return cache[k];
    return (cache[k] = getJSON('https://api.postcodes.io/postcodes/' + encodeURIComponent(k)).then(function (j) { return j.result || null; }).catch(function (e) { if (/HTTP 404/.test(String(e.message))) return null; delete cache[k]; throw e; }));   // 404 = no such postcode
  }
  function miles(a, b) {   // great-circle distance in miles
    var R = 3958.8, rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function street(res) {   // nearest street to the postcode centre; Nominatim asks for at most 1 request a second, and we only ask once the postcode is complete
    var wait = Math.max(0, nominatimAt + 1100 - Date.now()); nominatimAt = Date.now() + wait;
    return new Promise(function (ok) { setTimeout(ok, wait); }).then(function () {
      return getJSON('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=17&accept-language=en-GB&lat=' + res.latitude + '&lon=' + res.longitude);
    }).then(function (j) { var a = (j && j.address) || {}; return { road: a.road || a.pedestrian || a.footway || '', town: a.suburb || a.town || a.village || a.city_district || '', city: a.city || a.town || a.county || '' }; }).catch(function () { return { road: '', town: '', city: '' }; });
  }
  function keyed(pc) {     // optional paid list of every address at the postcode
    return getJSON('https://api.ideal-postcodes.co.uk/v1/postcodes/' + encodeURIComponent(pc.replace(/\s/g, '')) + '?api_key=' + encodeURIComponent(KEY)).then(function (j) {
      return (j.result || []).map(function (a) { return [a.line_1, a.line_2, a.post_town, a.postcode].filter(Boolean).join(', '); });
    }).catch(function () { return null; });
  }

  function mount(input) {
    if (input.dataset.addrDone) return; input.dataset.addrDone = '1';
    var box = D.createElement('div'); box.className = 'addr'; box.setAttribute('aria-live', 'polite');
    var sug = D.createElement('ul'); sug.className = 'addr-sug'; sug.setAttribute('role', 'listbox'); sug.hidden = true;
    input.parentNode.insertBefore(sug, input.nextSibling); sug.parentNode.insertBefore(box, sug.nextSibling);
    input.setAttribute('autocomplete', 'off'); input.setAttribute('inputmode', 'text'); input.setAttribute('autocapitalize', 'characters'); input.setAttribute('aria-autocomplete', 'list');
    var state = { pc: '', res: null, list: null, line: '', street: null }, timer = 0, seq = 0, hl = -1;

    function full() {
      if (!state.pc) return input.value.trim();
      if (state.list && state.pick) return state.pick;
      var a = [state.line, state.street && state.street.road, state.street && state.street.town, state.res && state.res.admin_district && state.street && state.street.city !== (state.street && state.street.town) ? state.street.city : '', state.pc].filter(Boolean);
      return state.line || (state.street && state.street.road) ? a.join(', ') : state.pc;
    }
    input._heValue = full;
    function showSug(items) {
      hl = -1; if (!items.length) { sug.hidden = true; sug.innerHTML = ''; return; }
      sug.innerHTML = items.map(function (p, i) { return '<li role="option" id="' + (input.id || 'pc') + '-o' + i + '" data-v="' + esc(p) + '">' + esc(p) + '</li>'; }).join(''); sug.hidden = false;
    }
    function pickPc(p) { input.value = p; sug.hidden = true; check(); }
    sug.addEventListener('mousedown', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); pickPc(li.dataset.v); } });
    sug.addEventListener('touchstart', function (e) { var li = e.target.closest('li'); if (li) { e.preventDefault(); pickPc(li.dataset.v); } }, { passive: false });
    input.addEventListener('keydown', function (e) {
      var li = sug.querySelectorAll('li'); if (sug.hidden || !li.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); hl = (hl + 1) % li.length; } else if (e.key === 'ArrowUp') { e.preventDefault(); hl = (hl - 1 + li.length) % li.length; }
      else if (e.key === 'Enter' && hl >= 0) { e.preventDefault(); pickPc(li[hl].dataset.v); return; } else if (e.key === 'Escape') { sug.hidden = true; return; } else return;
      li.forEach(function (n, i) { n.classList.toggle('on', i === hl); n.setAttribute('aria-selected', i === hl); });
    });
    input.addEventListener('blur', function () { setTimeout(function () { sug.hidden = true; }, 150); });
    input.addEventListener('input', function () {
      clearTimeout(timer); var v = input.value.trim(); state.pc = ''; state.pick = ''; render(null);
      if (norm(v)) { sug.hidden = true; timer = setTimeout(check, 350); return; }
      if (v.length < 2) { sug.hidden = true; box.innerHTML = ''; return; }
      var my = ++seq; timer = setTimeout(function () {
        getJSON('https://api.postcodes.io/postcodes/' + encodeURIComponent(v.replace(/\s/g, '')) + '/autocomplete?limit=6').then(function (j) { if (my === seq && !norm(input.value)) showSug(j.result || []); }).catch(function () {});
      }, 250);
    });

    function render(msg) {
      if (msg === null) { box.className = 'addr'; box.innerHTML = ''; return; }
      box.className = 'addr ' + (msg.cls || ''); var h = '<p class="addr-s">' + msg.html + '</p>';
      if (msg.picker) h += msg.picker;
      box.innerHTML = h;
      var sel = box.querySelector('select'); if (sel) sel.addEventListener('change', function () { state.pick = sel.value; });
      var ln = box.querySelector('.addr-line'); if (ln) ln.addEventListener('input', function () { state.line = ln.value.trim(); });
      var pk = box.querySelector('.addr-pick'); if (pk) { state.pick = pk.value; }
    }
    function check() {
      var pc = norm(input.value), my = ++seq; if (!pc) return;
      render({ cls: 'wait', html: 'Looking up ' + esc(pc) + '…' });
      lookup(pc).then(function (res) {
        if (my !== seq) return;
        if (!res) { render({ cls: 'bad', html: 'We could not find <b>' + esc(pc) + '</b>. Please check it, or type your full address in your message.' }); return; }
        state.pc = pc; state.res = res; input.value = pc;
        var distP = KITCHEN ? (kitchenPos ? Promise.resolve(kitchenPos) : lookup(KITCHEN).then(function (k) { kitchenPos = k; return k; })) : Promise.resolve(null);
        return distP.then(function (k) {
          var d = k ? miles(res, k) : null, area = [res.admin_ward, res.admin_district].filter(Boolean).join(', '), note = '', cls = 'ok';
          if (d != null) {
            if (RADIUS && d > RADIUS) { cls = 'far'; note = ' · <b>' + d.toFixed(1) + ' miles</b> from our kitchen. This may be outside our delivery area; we will confirm on WhatsApp.'; }
            else note = ' · ' + (d < 0.15 ? 'right next to our kitchen' : d.toFixed(1) + ' miles from our kitchen') + (RADIUS ? ': <b>we deliver here</b>' : '');
          }
          render({ cls: cls, html: '&#10003; <b>' + esc(pc) + '</b> · ' + esc(area || res.region || '') + note });
          if (input.dataset.addr === 'postcode-only' || input.dataset.addr === 'venue') return;
          var addrP = KEY ? keyed(pc) : Promise.resolve(null);
          return addrP.then(function (list) {
            if (my !== seq) return;
            if (list && list.length) {
              state.list = list; state.pick = list[0];
              render({ cls: cls, html: '&#10003; <b>' + esc(pc) + '</b> · ' + esc(area || '') + note, picker: '<label class="addr-l">Choose your address (' + list.length + ' found)<select class="addr-pick">' + list.map(function (a) { return '<option>' + esc(a) + '</option>'; }).join('') + '</select></label>' });
              state.pick = box.querySelector('.addr-pick').value; return;
            }
            state.list = null;
            return street(res).then(function (st) {
              if (my !== seq) return; state.street = st; var line2 = [st.road, st.town].filter(Boolean).join(', ');
              render({ cls: cls, html: '&#10003; <b>' + esc(pc) + '</b> · ' + esc(area || '') + note,
                picker: line2 ? '<label class="addr-l">Your address <small>(we found this street for ' + esc(pc) + ')</small><span class="addr-row"><input class="addr-line" maxlength="40" placeholder="House no. / flat" autocomplete="address-line1" aria-label="House number or flat"><span class="addr-st">' + esc(line2) + ', ' + esc(pc) + '</span></span></label>' : '<small class="addr-hint">Add your house number and street in your message so we can find you.</small>' });
            });
          });
        });
      }).catch(function () { if (my === seq) render({ cls: 'bad', html: 'Postcode lookup is unavailable right now. You can still carry on: we will confirm your address on WhatsApp.' }); });
    }
    if (norm(input.value)) check();
  }
  D.querySelectorAll('input[data-addr]').forEach(mount);
  window.HE_ADDR = { value: function (input) { return input && input._heValue ? input._heValue() : (input ? input.value.trim() : ''); }, norm: norm };
})();
