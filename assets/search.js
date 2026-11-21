// Site search and "Continue where you left off" (teacher's request, 2026-11-21).
// Loaded by theme.js on every page with a menu. The page list is in search-index.js (built by build-search.ps1),
// fetched only when someone opens the search. Nothing is sent anywhere: search runs in the browser, and the
// last lessons opened are kept in this browser's localStorage (keys wtc-last-dp, wtc-last-myp).
(function () {
  if (window.WTC_SEARCH_LOADED) return;
  window.WTC_SEARCH_LOADED = true;
  var me = document.currentScript;
  var src = me ? me.src : '';
  var base = src ? src.replace(/assets\/search\.js.*$/, '') : '';
  var ver = (src.match(/\?v=([0-9a-f]+)/) || [])[1] || '';
  var root = new URL(base || '.', location.href);
  var rel = decodeURIComponent(location.pathname.slice(root.pathname.length)) || 'index.html';
  if (/\/$/.test(rel) || rel === '') rel += 'index.html';

  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pageTitle() { return document.title.replace(/\s*\|\s*What the Cell\s*$/, ''); }

  // ---------- Styles (shared by the DP and MYP designs) ----------
  var css = '' +
    '.wtc-sbtn{display:inline-flex;align-items:center;gap:7px;font:700 15px var(--ui,system-ui,sans-serif);color:#fff;background:rgb(255 255 255/.14);border:1.5px solid rgb(255 255 255/.45);border-radius:99px;padding:4px 14px;cursor:pointer;line-height:1.4}' +
    '.wtc-sbtn:hover,.wtc-sbtn:focus-visible{background:rgb(255 255 255/.26)}' +
    '.wtc-sbtn kbd{font:600 11px ui-monospace,monospace;border:1px solid rgb(255 255 255/.5);border-radius:5px;padding:0 5px;opacity:.85}' +
    '@media (max-width:700px){.wtc-sbtn kbd{display:none}}' +
    '.wtc-sov{position:fixed;inset:0;z-index:9999;background:rgb(20 10 50/.55);display:flex;justify-content:center;align-items:flex-start;padding:8vh 16px 16px}' +
    '.wtc-sov[hidden]{display:none}' +
    '.wtc-spanel{width:min(680px,100%);max-height:84vh;display:flex;flex-direction:column;background:#fff;color:#1E0E4A;border-radius:20px;box-shadow:0 24px 70px rgb(20 10 50/.45);overflow:hidden;font-family:var(--body,system-ui,sans-serif)}' +
    '.wtc-shead{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #E4DAF7}' +
    '.wtc-shead svg{flex:none;color:#5F3DB8}' +
    '.wtc-sinput{flex:1;min-width:0;border:0;outline:0;font:600 19px var(--ui,system-ui,sans-serif);color:inherit;background:transparent}' +
    '.wtc-sclose{flex:none;border:0;background:#EFE6FF;color:#2A1D5E;border-radius:10px;font:700 13px var(--ui,system-ui,sans-serif);padding:6px 10px;cursor:pointer}' +
    '.wtc-sres{list-style:none;margin:0;padding:8px;overflow:auto}' +
    '.wtc-sres li a{display:block;padding:10px 12px;border-radius:12px;text-decoration:none;color:inherit}' +
    '.wtc-sres li a:hover,.wtc-sres li.on a{background:#F1EAFF}' +
    '.wtc-sres .t{display:block;font:700 16.5px/1.3 var(--ui,system-ui,sans-serif);color:#2A1D5E}' +
    '.wtc-sres .k{display:inline-block;font:700 11.5px var(--ui,system-ui,sans-serif);text-transform:uppercase;letter-spacing:.04em;border-radius:99px;padding:1px 8px;margin-right:6px;vertical-align:2px;color:#fff;background:#5F3DB8}' +
    '.wtc-sres .k.myp{background:#B0356F}.wtc-sres .k.sim{background:#1F7A7A}.wtc-sres .k.gen{background:#B5532A}' +
    '.wtc-sres .s{display:block;font-size:14px;color:#473B72;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.wtc-sres mark{background:#FBDD82;color:inherit;border-radius:3px;padding:0 1px}' +
    '.wtc-shint{padding:10px 18px 14px;font-size:14px;color:#473B72}' +
    '.wtc-shint b{color:#2A1D5E}' +
    '.wtc-shint button{border:1px solid #DCCFF5;background:#FAF6FF;color:#2A1D5E;border-radius:99px;padding:3px 11px;margin:6px 6px 0 0;font:600 13.5px var(--ui,system-ui,sans-serif);cursor:pointer}' +
    ':root[data-theme="dark"] .wtc-spanel{background:#241B47;color:#F3EEFF}' +
    ':root[data-theme="dark"] .wtc-shead{border-color:#40356F}' +
    ':root[data-theme="dark"] .wtc-shead svg{color:#C9B8F5}' +
    ':root[data-theme="dark"] .wtc-sclose,:root[data-theme="dark"] .wtc-shint button{background:#30265A;color:#F3EEFF;border-color:#40356F}' +
    ':root[data-theme="dark"] .wtc-sres li a:hover,:root[data-theme="dark"] .wtc-sres li.on a{background:#30265A}' +
    ':root[data-theme="dark"] .wtc-sres .t,:root[data-theme="dark"] .wtc-shint b{color:#fff}' +
    ':root[data-theme="dark"] .wtc-sres .s,:root[data-theme="dark"] .wtc-shint{color:#BDB1E0}' +
    ':root[data-theme="dark"] .wtc-sres mark{background:#7A5CE0;color:#fff}' +
    // Continue card
    '.wtc-cont{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:0 0 22px;padding:14px 18px;border-radius:18px;background:#fff;color:#1E0E4A;border:1px solid #DCCFF5;border-left:7px solid #B0356F;box-shadow:0 8px 24px rgb(95 61 184/.12)}' +
    '.wtc-cont[hidden]{display:none}' +
    '.wtc-cont .lab{font:800 17px var(--ui,system-ui,sans-serif);margin-right:4px}' +
    '.wtc-cont a.go{display:inline-flex;flex-direction:column;text-decoration:none;color:#fff;background:#5F3DB8;border-radius:14px;padding:7px 14px;font:700 15px/1.25 var(--ui,system-ui,sans-serif);max-width:100%}' +
    '.wtc-cont a.go.myp{background:#B0356F}' +
    '.wtc-cont a.go small{font:600 12px var(--ui,system-ui,sans-serif);opacity:.85}' +
    '.wtc-cont a.go:hover{filter:brightness(1.1)}' +
    '.wtc-cont .x{margin-left:auto;border:0;background:none;color:#473B72;font:600 13px var(--ui,system-ui,sans-serif);cursor:pointer;text-decoration:underline}' +
    ':root[data-theme="dark"] .wtc-cont{background:#241B47;color:#F3EEFF;border-color:#40356F}' +
    ':root[data-theme="dark"] .wtc-cont .x{color:#BDB1E0}' +
    '@media print{.wtc-sbtn,.wtc-cont,.wtc-sov{display:none!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  // ---------- Continue where you left off ----------
  var m;
  if ((m = /^subtopics\/(sl|ahl)-/.exec(rel))) {
    put('wtc-last-dp', { u: rel, t: pageTitle(), l: m[1] === 'sl' ? 'SL' : 'HL', at: Date.now() });
  } else if (/^myp\/[a-z]+-lesson-\d+\.html$/.test(rel) || /^myp\/myp\d-/.test(rel)) {
    var p = pageTitle().split('|');
    put('wtc-last-myp', { u: rel, t: p[0].trim(), s: (p[1] || '').trim(), at: Date.now() });
  }

  function showContinue() {
    var boxes = document.querySelectorAll('[data-wtc-continue]');
    if (!boxes.length) return;
    var dp = get('wtc-last-dp'), myp = get('wtc-last-myp');
    [].forEach.call(boxes, function (box) {
      var want = box.getAttribute('data-wtc-continue');
      var items = [];
      if (dp && dp.u && want !== 'myp') items.push({ at: dp.at, h: '<a class="go" href="' + esc(base + dp.u) + '"><span>' + esc(dp.t) + '</span><small>DP Biology &middot; ' + esc(dp.l) + '</small></a>' });
      if (myp && myp.u && want !== 'dp') items.push({ at: myp.at, h: '<a class="go myp" href="' + esc(base + myp.u) + '"><span>' + esc(myp.t) + '</span><small>' + esc(myp.s || 'MYP Science') + '</small></a>' });
      if (!items.length) { box.hidden = true; return; }
      items.sort(function (a, b) { return b.at - a.at; });
      box.className = 'wtc-cont';
      box.innerHTML = '<span class="lab">Continue where you left off</span>' + items.map(function (i) { return i.h; }).join('') + '<button type="button" class="x">Clear</button>';
      box.hidden = false;
      box.querySelector('.x').onclick = function () {
        try { if (want !== 'myp') localStorage.removeItem('wtc-last-dp'); if (want !== 'dp') localStorage.removeItem('wtc-last-myp'); } catch (e) {}
        box.hidden = true;
      };
    });
  }

  // ---------- Search ----------
  var ICON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
  var ov, input, list, hint, data = null, loading = false, sel = 0, shown = [];
  var TRY = ['osmosis', 'enzymes', 'photosynthesis', 'meiosis', 'Ohm’s law', 'command terms'];

  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’]/g, "'"); }

  function load(cb) {
    if (data) return cb();
    if (window.WTC_SEARCH) { prep(); return cb(); }
    if (loading) return;
    loading = true;
    var s = document.createElement('script');
    s.src = base + 'assets/search-index.js' + (ver ? '?v=' + ver : '');
    s.onload = function () { prep(); cb(); };
    s.onerror = function () { hint.innerHTML = 'Search could not load. Check your connection and try again.'; loading = false; };
    document.head.appendChild(s);
  }
  function prep() {
    data = (window.WTC_SEARCH || []).map(function (p) {
      return { p: p, t: norm(p.t), h: norm(p.h), w: norm(p.w), d: norm(p.d), k: norm(p.k) };
    });
  }

  function wordHit(text, tok) {   // 2 = starts a word, 1 = inside a word, 0 = none
    var i = text.indexOf(tok);
    if (i < 0) return 0;
    var re = new RegExp('(^|[^a-z0-9])' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return re.test(text) ? 2 : 1;
  }
  function search(q) {
    var nq = norm(q).trim();
    var toks = nq.split(/[\s,]+/).filter(function (x) { return x.length > 0; });
    if (!toks.length) return [];
    var res = [];
    data.forEach(function (e) {
      var score = 0, ok = true;
      toks.forEach(function (tok) {
        var a = wordHit(e.t, tok), b = wordHit(e.h, tok), c = wordHit(e.w, tok), d = wordHit(e.d, tok), k = wordHit(e.k, tok);
        if (!(a || b || c || d || k)) { ok = false; return; }
        score += a * 12 + b * 4 + c * 3 + d * 2 + k * 2;
      });
      if (!ok) return;
      if (toks.length > 1 && e.t.indexOf(nq) >= 0) score += 25;
      if (e.t.indexOf(nq) === 0) score += 10;
      if (/^dp topic|^myp 5 lesson/.test(e.k)) score += 3;
      if (/, sl$/.test(e.k)) score += 1;
      res.push({ e: e, s: score });
    });
    res.sort(function (a, b) { return b.s - a.s || a.e.p.t.length - b.e.p.t.length; });
    return res.slice(0, 14).map(function (r) { return r.e; });
  }
  function mark(text, toks) {
    var out = esc(text);
    toks.forEach(function (tok) {
      if (tok.length < 2) return;
      out = out.replace(new RegExp('(' + esc(tok).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }
  function snippet(e, toks) {
    var parts = (e.p.h + ' | ' + e.p.w).split(' | ');
    for (var i = 0; i < parts.length; i++) {
      var n = norm(parts[i]);
      if (n === e.t) continue;
      if (toks.every(function (t) { return n.indexOf(t) >= 0; })) return parts[i];
    }
    for (i = 0; i < parts.length; i++) { if (norm(parts[i]).indexOf(toks[0]) >= 0) return parts[i]; }
    return e.p.d;
  }
  function kindClass(k) { return /^myp/i.test(k) ? 'myp' : /simulation/i.test(k) ? 'sim' : /^dp topic/i.test(k) ? '' : 'gen'; }

  function render() {
    var q = input.value;
    if (!q.trim()) {
      list.innerHTML = '';
      hint.innerHTML = '<b>Search every topic, lesson and simulation.</b> Try: ' + TRY.map(function (t) { return '<button type="button">' + esc(t) + '</button>'; }).join('');
      [].forEach.call(hint.querySelectorAll('button'), function (b) { b.onclick = function () { input.value = b.textContent; render(); input.focus(); }; });
      hint.hidden = false; shown = []; return;
    }
    if (!data) { hint.hidden = false; hint.textContent = 'Loading…'; load(render); return; }
    var toks = norm(q).trim().split(/[\s,]+/).filter(Boolean);
    shown = search(q);
    sel = 0;
    if (!shown.length) {
      list.innerHTML = '';
      hint.hidden = false;
      hint.innerHTML = 'Nothing found for <b>' + esc(q) + '</b>. Check the spelling, or try a shorter word such as a topic name.';
      return;
    }
    hint.hidden = true;
    list.innerHTML = shown.map(function (e, i) {
      var sn = snippet(e, toks);
      return '<li role="option" id="wtc-r' + i + '"' + (i === 0 ? ' class="on" aria-selected="true"' : '') + '><a href="' + esc(base + e.p.u) + '"><span class="t"><span class="k ' + kindClass(e.p.k) + '">' + esc(e.p.k) + '</span>' + mark(e.p.t, toks) + '</span>' +
        (sn ? '<span class="s">' + mark(sn, toks) + '</span>' : '') + '</a></li>';
    }).join('');
  }
  function move(d) {
    if (!shown.length) return;
    var lis = list.children;
    lis[sel].className = ''; lis[sel].removeAttribute('aria-selected');
    sel = (sel + d + shown.length) % shown.length;
    lis[sel].className = 'on'; lis[sel].setAttribute('aria-selected', 'true');
    lis[sel].scrollIntoView({ block: 'nearest' });
    input.setAttribute('aria-activedescendant', 'wtc-r' + sel);
  }

  var opener = null;
  function open() {
    if (!ov) build();
    opener = document.activeElement;
    ov.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    input.focus(); input.select();
    render();
    load(function () { if (input.value.trim()) render(); });
  }
  function close() {
    ov.hidden = true;
    document.documentElement.style.overflow = '';
    if (opener && opener.focus) opener.focus();
  }
  function build() {
    ov = document.createElement('div');
    ov.className = 'wtc-sov'; ov.hidden = true;
    ov.innerHTML = '<div class="wtc-spanel" role="dialog" aria-modal="true" aria-label="Search What the Cell">' +
      '<div class="wtc-shead">' + ICON.replace('width="16" height="16"', 'width="22" height="22"') +
      '<input class="wtc-sinput" type="search" placeholder="Search topics, lessons, simulations…" aria-label="Search" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="wtc-sres">' +
      '<button type="button" class="wtc-sclose">Close</button></div>' +
      '<ul class="wtc-sres" id="wtc-sres" role="listbox"></ul><div class="wtc-shint"></div></div>';
    document.body.appendChild(ov);
    input = ov.querySelector('input'); list = ov.querySelector('.wtc-sres'); hint = ov.querySelector('.wtc-shint');
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') { if (shown[sel]) location.href = base + shown[sel].p.u; }
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('.wtc-sclose').onclick = close;
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
  }

  function mountButton() {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'wtc-sbtn';
    b.innerHTML = ICON + '<span>Search</span><kbd>/</kbd>';
    b.setAttribute('aria-label', 'Search the site');
    b.onclick = open;
    var nav = document.querySelector('.site-nav');
    if (nav) {
      var th = nav.querySelector('.theme-toggle');
      nav.insertBefore(b, th || null);
      return;
    }
    var row = document.querySelector('.theme-row');   // front page: beside the theme button
    if (row) { row.style.gap = '10px'; row.insertBefore(b, row.firstChild); return; }
    var band = document.querySelector('.band-in');
    if (band) band.insertBefore(b, band.firstChild);
  }

  document.addEventListener('keydown', function (e) {
    if (ov && !ov.hidden) return;
    var t = e.target, typing = t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName));
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K'))) { e.preventDefault(); open(); }
  });
  window.wtcSearch = { open: open, run: function (q) { return search(q).map(function (e) { return e.p.u; }); }, load: load };

  function start() { mountButton(); showContinue(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
