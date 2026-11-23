// Key-word glossary in the student's own language (teacher's request, 2026-11-23).
// Glossary only: no AI and no translated notes. Free and static.
// Added to pages by build-lang.ps1 as <script src=".../lang-help.js" data-set="dp|myp-xx" data-v="...">.
// Data: assets/lang/<set>/en.js (English meanings) and assets/lang/<set>/<code>.js ([term, meaning]),
// each calling WTC_LANG.gloss(code, {...}). Only the chosen language is loaded.
//   DP subtopic pages: picker above the notes, tap-a-word pop-ups on key words in the notes.
//   MYP lesson pages:  picker above the Key words table, which gets a column in the chosen language.
//   MYP unit pages:    a full "Unit glossary" section with every key word of the unit.
// Without this script every page works exactly as before.
(function () {
  'use strict';
  var LANGS = [
    ['en', 'English only', 'en', 'ltr'],
    ['vi', 'Tiếng Việt (Vietnamese)', 'vi', 'ltr'],
    ['zh', '简体中文 (Chinese)', 'zh-Hans', 'ltr'],
    ['ko', '한국어 (Korean)', 'ko', 'ltr'],
    ['ja', '日本語 (Japanese)', 'ja', 'ltr'],
    ['th', 'ไทย (Thai)', 'th', 'ltr'],
    ['id', 'Bahasa Indonesia', 'id', 'ltr'],
    ['ms', 'Bahasa Melayu (Malay)', 'ms', 'ltr'],
    ['hi', 'हिन्दी (Hindi)', 'hi', 'ltr'],
    ['ar', 'العربية (Arabic)', 'ar', 'rtl'],
    ['fr', 'Français (French)', 'fr', 'ltr'],
    ['de', 'Deutsch (German)', 'de', 'ltr'],
    ['es', 'Español (Spanish)', 'es', 'ltr'],
    ['pt', 'Português (Portuguese)', 'pt', 'ltr'],
    ['it', 'Italiano (Italian)', 'it', 'ltr'],
    ['nl', 'Nederlands (Dutch)', 'nl', 'ltr']
  ];
  var KEY = 'wtc-lang';
  var me = document.currentScript;
  if (!me) return;
  var set = me.getAttribute('data-set');
  var ver = me.getAttribute('data-v') || '1';
  var base = me.src.replace(/lang-help\.js.*$/, 'lang/' + set + '/');
  var data = {};
  window.WTC_LANG = { gloss: function (code, obj) { data[code] = obj; } };

  var loading = {};
  function load(code) {
    if (!loading[code]) loading[code] = new Promise(function (ok) {
      var s = document.createElement('script');
      s.src = base + code + '.js?v=' + ver;
      s.onload = s.onerror = function () { ok(); };
      document.head.appendChild(s);
    });
    return loading[code];
  }
  function info(code) { for (var i = 0; i < LANGS.length; i++) if (LANGS[i][0] === code) return LANGS[i]; return LANGS[0]; }
  var lang;
  try { lang = info(localStorage.getItem(KEY) || 'en')[0]; } catch (e) { lang = 'en'; }
  function ready() { return Promise.all([load('en'), lang === 'en' ? null : load(lang)]); }
  function norm(t) { return t.toLowerCase().replace(/[’']/g, "'").replace(/[:.,;]+$/, '').replace(/\s+/g, ' ').trim(); }
  function findKey(t) {
    var g = data.en || {}, k = norm(t);
    var bare = k.replace(/\s*\(.*?\)$/, '');
    var tries = [k, bare, bare.replace(/s$/, ''), k.replace(/s$/, ''), k.replace(/es$/, ''), k.replace(/ies$/, 'y'), k.replace(/i$/, 'us'), k.replace(/a$/, 'on'), k.replace(/ae$/, 'a')];
    for (var i = 0; i < tries.length; i++) if (g[tries[i]]) return tries[i];
    return null;
  }
  function tr(k) { return lang === 'en' ? null : (data[lang] || {})[k] || null; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function langEl(e) { var l = info(lang); e.lang = l[2]; e.dir = l[3]; return e; }
  var canSay = 'speechSynthesis' in window;
  function say(word) {
    if (!canSay) return;
    var u = new SpeechSynthesisUtterance(word.replace(/\s*\(.*?\)\s*/g, ' ')); u.lang = 'en-GB'; u.rate = 0.85;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  function sayBtn(word, small) {
    var b = el('button', 'lh-say', small ? '🔊' : '🔊 Say it'); b.type = 'button';
    b.setAttribute('aria-label', 'Say "' + word + '" in English');
    b.onclick = function (e) { e.stopPropagation(); say(word); };
    if (!canSay) b.hidden = true;
    return b;
  }

  // ---------- styles ----------
  var css = el('style');
  css.textContent = [
    '.lh-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;background:var(--soft,#EFE6FF);border-radius:16px;padding:12px 16px;margin:6px 0 14px}',
    '.lh-bar label{font-weight:700;font-size:15px}',
    '.lh-bar select{font:inherit;font-size:15px;font-weight:600;padding:6px 10px;border-radius:10px;border:2px solid var(--line,#DCCFF5);background:var(--surface,#fff);color:inherit;max-width:100%}',
    '.lh-bar small{flex:1 1 240px;opacity:.8;font-size:13px;line-height:1.4}',
    '.lh-term{cursor:pointer;text-decoration:underline dotted;text-decoration-color:var(--accent,#B0356F);text-decoration-thickness:2px;text-underline-offset:3px;border-radius:4px}',
    '.lh-term:hover,.lh-term:focus-visible{background:var(--soft,#EFE6FF);outline:none}',
    '.lh-pop{position:absolute;z-index:60;width:min(340px,calc(100vw - 32px));background:var(--surface,#fff);color:var(--fg,#1E0E4A);border:2px solid var(--line,#DCCFF5);border-radius:16px;box-shadow:0 10px 30px rgb(0 0 0/.18);padding:14px 16px;font-size:15px;line-height:1.45}',
    '.lh-pop .lh-h{display:flex;align-items:center;gap:8px;margin-bottom:4px}',
    '.lh-pop .lh-en{font-weight:700;font-size:18px;flex:1}',
    '.lh-say,.lh-x{font:inherit;font-size:13px;font-weight:600;border:0;border-radius:99px;padding:4px 10px;background:var(--soft,#EFE6FF);color:inherit;cursor:pointer}',
    '.lh-x{background:none;font-size:20px;line-height:1;padding:2px 6px}',
    '.lh-pop p{margin:0}',
    '.lh-pop .lh-tr{border-top:1px solid var(--line,#DCCFF5);margin-top:8px;padding-top:8px}',
    '.lh-tr b{display:block;font-size:1.1em}',
    '.lh-none{opacity:.75;font-size:13px;margin-top:6px!important}',
    'table.words td.lh-col{min-width:12em}',
    'table.words .lh-say{margin-left:6px;padding:2px 7px;vertical-align:middle}',
    '.lh-gloss .lh-find{font:inherit;font-size:15px;padding:7px 12px;border-radius:10px;border:2px solid var(--line,#DCCFF5);background:var(--surface,#fff);color:inherit;flex:1 1 180px;min-width:0}',
    '.lh-gloss .lh-wrap{overflow-x:auto}',
    '.lh-gloss table{width:100%;border-collapse:collapse;font-size:15px}',
    '.lh-gloss th,.lh-gloss td{text-align:start;vertical-align:top;padding:8px 10px;border-bottom:1px solid var(--line,#DCCFF5)}',
    '.lh-gloss thead th{font-size:13px;text-transform:uppercase;letter-spacing:.05em;opacity:.75}',
    '.lh-gloss tbody th{white-space:nowrap}',
    '.lh-gloss .lh-count{font-size:13px;opacity:.75;margin:8px 0 0}',
    '[lang="ar"]{font-family:"Segoe UI","Noto Naskh Arabic",Tahoma,sans-serif;font-size:1.05em}',
    '[lang="hi"]{font-family:"Nirmala UI","Noto Sans Devanagari",sans-serif}',
    '[lang="th"]{font-family:"Leelawadee UI","Noto Sans Thai",Tahoma,sans-serif}',
    '[lang="vi"]{font-family:"Segoe UI",Arial,"Noto Sans",sans-serif}',
    '@media print{.lh-bar,.lh-pop,.lh-say{display:none!important}.lh-term{text-decoration:none}}'
  ].join('\n');
  document.head.appendChild(css);

  // ---------- language picker (one per page; every copy stays in sync) ----------
  var selects = [];
  function picker(tipText) {
    var bar = el('div', 'lh-bar');
    var id = 'lh-select-' + selects.length;
    var lab = el('label', null, 'Key words in my language'); lab.htmlFor = id;
    var sel = el('select'); sel.id = id;
    LANGS.forEach(function (l) { var o = el('option', null, l[1]); o.value = l[0]; sel.appendChild(o); });
    sel.value = lang;
    sel.addEventListener('change', function () {
      lang = sel.value;
      try { localStorage.setItem(KEY, lang); } catch (e) {}
      selects.forEach(function (s) { s.value = lang; });
      closePop();
      ready().then(refresh);
    });
    selects.push(sel);
    bar.append(lab, sel, el('small', null, tipText));
    return bar;
  }
  var refreshers = [];
  function refresh() { refreshers.forEach(function (f) { f(); }); }

  // ---------- DP: pop-ups in the notes ----------
  var pop = null, popFor = null;
  function closePop() { if (pop) { pop.remove(); pop = null; if (popFor) popFor.focus(); popFor = null; } }
  function openPop(t) {
    closePop();
    var k = t.dataset.term, word = t.textContent.replace(/[:.,;]+$/, '').trim();
    pop = el('div', 'lh-pop'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Meaning of ' + word);
    var h = el('div', 'lh-h'), x = el('button', 'lh-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = closePop;
    h.append(el('span', 'lh-en', word), sayBtn(word), x); pop.append(h);
    pop.append(el('p', null, (data.en || {})[k] || ''));
    var t2 = tr(k);
    if (t2) { var p = langEl(el('p', 'lh-tr')); p.append(el('b', null, t2[0]), document.createTextNode(t2[1])); pop.append(p); }
    else if (lang === 'en') pop.append(el('p', 'lh-none', 'Choose your language above the notes to see this word translated.'));
    document.body.appendChild(pop);
    var r = t.getBoundingClientRect(), w = pop.offsetWidth, vw = document.documentElement.clientWidth;
    pop.style.left = Math.max(16, Math.min(r.left, vw - w - 16)) + scrollX + 'px';
    pop.style.top = (r.bottom + scrollY + 8) + 'px';
    popFor = t; x.focus();
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function makeTerm(e, k) { e.classList.add('lh-term'); e.dataset.term = k; e.setAttribute('role', 'button'); e.tabIndex = 0; e.setAttribute('aria-haspopup', 'dialog'); }
  function dpNotes(notes) {
    var intro = notes.querySelector('.notes-dl') || notes.querySelector('.block-intro') || notes.querySelector('h2');
    intro.after(picker('Tap any underlined key word in the notes to see what it means in your language. Learn the English word too: you use it in class and in exams.'));
    // Words with an everyday meaning too are linked only where the notes make them bold.
    var BOLD_ONLY = ['source', 'sink', 'matrix', 'cortex', 'envelope', 'conserved', 'reduced', 'oxidized', 'template', 'primer', 'threshold',
      'translocation', 'degenerate', 'medulla', 'resistant', 'segregation', 'checkpoint', 'richness', 'evenness', 'optimum', 'lysis', 'transect',
      'soluble', 'insoluble', 'valves', 'community', 'population', 'host', 'receptor', 'proteins', 'species', 'egg', 'replication', 'polar',
      'catalyst', 'condensation', 'cytoplasm', 'habitat', 'fitness', 'evolution', 'hormone', 'insertion', 'deletion', 'substitution', 'lipids'];
    var keys = Object.keys(data.en || {}).filter(function (k) { return k.length > 2 && BOLD_ONLY.indexOf(k) < 0; }).sort(function (a, b) { return b.length - a.length; });
    if (!keys.length) return;
    var re = new RegExp('(^|[^\\w-])(' + keys.map(function (k) { return esc(k) + '(?:e?s)?'; }).join('|') + ')(?![\\w-])', 'i');
    notes.querySelectorAll('.note-card').forEach(function (card) {
      var seen = {};
      card.querySelectorAll('b').forEach(function (b) {
        if (b.closest('header') || b.closest('.tip > b:first-child')) return;
        var k = findKey(b.textContent); if (!k) return;
        seen[k] = 1; makeTerm(b, k);
      });
      // The first plain mention of any other glossary word in this card.
      var body = card.querySelector('.note-body') || card;
      var w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
        var p = n.parentElement;
        return (!p || p.closest('header,b,i,a,.lh-term,summary,script,figure,.calc-eg,.pg-ref,code')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
      var list = []; while (w.nextNode()) list.push(w.currentNode);
      list.forEach(function (node) {
        var pos = 0, guard = 0;
        while (node && guard++ < 30) {
          var m = re.exec(node.nodeValue.slice(pos)); if (!m) break;
          var at = pos + m.index + m[1].length, word = m[2], k = findKey(word);
          if (!k || seen[k]) { pos = at + word.length; continue; }
          seen[k] = 1;
          var mid = node.splitText(at), after = mid.splitText(word.length);
          var span = el('span', null, mid.nodeValue); mid.replaceWith(span); makeTerm(span, k);
          node = after; pos = 0;
        }
      });
    });
    notes.addEventListener('click', function (e) { var t = e.target.closest('.lh-term'); if (t) { e.preventDefault(); e.stopPropagation(); openPop(t); } });
    notes.addEventListener('keydown', function (e) { var t = e.target.closest && e.target.closest('.lh-term'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openPop(t); } });
    document.addEventListener('click', function (e) { if (pop && !pop.contains(e.target)) closePop(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePop(); });
    refreshers.push(function () {});
  }

  // ---------- MYP lesson: extra column in the Key words table ----------
  function mypTable(table) {
    var box = table.closest('.box') || table;
    box.before(picker('Pick your language to see each key word and its meaning translated. Press 🔊 to hear the English word.'));
    var rows = [].slice.call(table.querySelectorAll('tr')).filter(function (r) { return r.querySelector('th') && r.querySelector('td'); });
    rows.forEach(function (r) {
      var th = r.querySelector('th'), word = th.textContent.trim();
      r.dataset.term = norm(word);
      th.append(sayBtn(word, true));
      var td = el('td', 'lh-col'); td.hidden = true; r.append(td);
    });
    function fill() {
      rows.forEach(function (r) {
        var td = r.querySelector('.lh-col'), t = tr(r.dataset.term);
        td.hidden = lang === 'en'; td.textContent = '';
        if (lang === 'en') return;
        langEl(td);
        if (t) { td.append(el('b', null, t[0]), document.createTextNode(t[1])); }
      });
    }
    refreshers.push(fill); fill();
  }

  // ---------- MYP unit page: the whole unit's glossary ----------
  function mypUnit(after) {
    var sec = el('section', 'm-sec lh-gloss'); sec.id = 'glossary'; sec.setAttribute('aria-labelledby', 'gloss-h');
    var h2 = el('h2'); h2.id = 'gloss-h';
    var dot = after.querySelector('h2 .dot'); if (dot) h2.append(dot.cloneNode(true));
    h2.append(document.createTextNode('Unit glossary'));
    sec.append(h2, el('p', null, 'Every key word in this unit, with its meaning. Choose your language to see each word and its meaning translated.'));
    var bar = picker('Press 🔊 to hear the English word.');
    var find = el('input', 'lh-find'); find.type = 'search'; find.placeholder = 'Find a word'; find.setAttribute('aria-label', 'Find a word in the glossary');
    bar.append(find); sec.append(bar);
    var wrap = el('div', 'box tbl lh-wrap'), table = el('table'), thead = el('thead'), tbody = el('tbody');
    var hr = el('tr'), hTr = el('th', null, ''); hr.append(el('th', null, 'Key word'), el('th', null, 'Meaning'), hTr); thead.append(hr);
    table.append(thead, tbody); wrap.append(table); sec.append(wrap);
    var count = el('p', 'lh-count'); sec.append(count);
    var en = data.en || {}, rows = [];
    Object.keys(en).sort(function (a, b) { return a.localeCompare(b); }).forEach(function (k) {
      var r = el('tr'), th = el('th', null, en[k][0]); th.append(sayBtn(en[k][0], true));
      var td = el('td', 'lh-col'); r.append(th, el('td', null, en[k][1]), td); tbody.append(r);
      rows.push({ r: r, k: k, td: td, text: (en[k][0] + ' ' + en[k][1]).toLowerCase() });
    });
    function fill() {
      var l = info(lang); hTr.textContent = lang === 'en' ? '' : l[1].replace(/\s*\(.*\)$/, ''); hTr.hidden = lang === 'en';
      rows.forEach(function (o) {
        o.td.hidden = lang === 'en'; o.td.textContent = ''; if (lang === 'en') return;
        langEl(o.td); var t = tr(o.k); if (t) o.td.append(el('b', null, t[0]), document.createTextNode(t[1]));
        o.tr = t ? (t[0] + ' ' + t[1]).toLowerCase() : '';
      });
      filter();
    }
    function filter() {
      var q = find.value.trim().toLowerCase(), n = 0;
      rows.forEach(function (o) { var show = !q || o.text.indexOf(q) >= 0 || (o.tr && o.tr.indexOf(q) >= 0); o.r.hidden = !show; if (show) n++; });
      count.textContent = n + ' of ' + rows.length + ' key words';
    }
    find.addEventListener('input', filter);
    after.after(sec);
    refreshers.push(fill); fill();
  }

  function start() {
    ready().then(function () {
      var notes = document.getElementById('notes');
      if (set === 'dp' && notes && notes.querySelector('.note-card')) return dpNotes(notes);
      var tbl = document.querySelector('table.words');
      if (tbl) return mypTable(tbl);
      var lessons = document.querySelector('section[aria-labelledby="lessons-h"]');
      if (lessons) mypUnit(lessons);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
