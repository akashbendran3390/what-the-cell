/* Topic question generator (2026-11-12). Students pick level, topics, question types and length;
   the page builds a printable worksheet with a mark scheme. Questions are original, written for this site. */
(function () {
  var app = document.getElementById('qgen-app');
  if (!app || !window.COURSE) return;
  var INDEX = window.QBANK_INDEX || {};
  var TYPES = [['mcq', 'Multiple choice'], ['short', 'Short answer'], ['data', 'Data-based'], ['extended', 'Extended response']];
  var LETTERS = 'ABCD';

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function slugOf(href) { return (href || '').replace(/^.*\//, '').replace(/\.html$/, ''); }
  function titleOf(s, hl) {
    var ch = window.COURSE.chapters[s.code];
    var t = s.code + ' ' + (ch ? ch.title : '');
    if (s.lens) t += ' (' + s.lens.toLowerCase() + ')';
    if (hl) t += ' (HL)';
    return t;
  }
  function units(level) {
    var out = [];
    window.COURSE.sl.forEach(function (u) {
      out.push({ name: u.name, hl: false, subs: (u.subtopics || []).map(function (s) { return { slug: slugOf(s.href), title: titleOf(s, false) }; }) });
    });
    if (level === 'HL') {
      window.COURSE.ahl.forEach(function (u) {
        var subs = (u.core || []).concat(u.assorted && u.assorted.groups ? u.assorted.groups : []);
        out.push({ name: u.name, hl: true, subs: subs.map(function (s) { return { slug: slugOf(s.href), title: titleOf(s, true) }; }) });
      });
    }
    return out;
  }

  // ---------- form ----------
  var level = 'HL';
  var form = el('form', { 'class': 'qg-form' });
  form.innerHTML =
    '<fieldset class="qg-row"><legend>1. Level</legend>' +
    '<label><input type="radio" name="lvl" value="SL"> SL (core topics only)</label>' +
    '<label><input type="radio" name="lvl" value="HL" checked> HL (core and AHL topics)</label></fieldset>' +
    '<fieldset><legend>2. Topics</legend><p class="qg-hint">Tick the topics you want to practise.</p><div class="qg-units"></div></fieldset>' +
    '<fieldset class="qg-row"><legend>3. Question types</legend>' + TYPES.map(function (t) { return '<label><input type="checkbox" name="type" value="' + t[0] + '" checked> ' + t[1] + '</label>'; }).join('') + '</fieldset>' +
    '<fieldset class="qg-row"><legend>4. Length</legend><label>Number of questions <select name="n"><option>5</option><option selected>10</option><option>15</option><option>20</option><option value="999">All available</option></select></label></fieldset>' +
    '<div class="qg-actions"><button type="submit" class="qg-go">Make my worksheet</button><span class="qg-msg" role="status"></span></div>';
  app.appendChild(form);
  var out = el('div', { 'class': 'qg-out', hidden: '' });
  app.appendChild(out);
  var msg = form.querySelector('.qg-msg');

  function drawUnits() {
    var box = form.querySelector('.qg-units'); box.innerHTML = '';
    units(level).forEach(function (u) {
      var live = u.subs.filter(function (s) { return INDEX[s.slug]; });
      var d = el('details', { 'class': 'qg-unit' + (live.length ? '' : ' qg-empty') });
      if (live.length) d.open = true;
      var sum = el('summary', null, '<span>' + u.name + '</span><span class="qg-count">' + (live.length ? live.length + ' of ' + u.subs.length + ' topics ready' : 'coming soon') + '</span>');
      d.appendChild(sum);
      var list = el('div', { 'class': 'qg-subs' });
      u.subs.forEach(function (s) {
        var ok = !!INDEX[s.slug];
        list.appendChild(el('label', { 'class': ok ? '' : 'qg-off' }, '<input type="checkbox" name="topic" value="' + s.slug + '"' + (ok ? ' checked' : ' disabled') + '> ' + s.title + (ok ? ' <span class="qg-n">' + INDEX[s.slug].count + ' q</span>' : '')));
      });
      d.appendChild(list);
      box.appendChild(d);
    });
  }
  form.addEventListener('change', function (e) {
    if (e.target.name === 'lvl') { level = e.target.value; drawUnits(); }
  });
  drawUnits();

  // ---------- loading question files ----------
  var base = (document.querySelector('script[src*="qgen.js"]').getAttribute('src') || '').replace(/qgen\.js.*$/, '') + 'qbank/';
  function load(slug) {
    return new Promise(function (ok, bad) {
      if (window.QBANK && window.QBANK[slug]) return ok(window.QBANK[slug]);
      var s = document.createElement('script');
      s.src = base + slug + '.js?v=' + (INDEX[slug] ? INDEX[slug].count : 0) + (window.QBANK_VERSION || '');
      s.onload = function () { ok(window.QBANK[slug]); };
      s.onerror = bad;
      document.head.appendChild(s);
    });
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var ORDER = { mcq: 0, short: 1, data: 2, extended: 3 };

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var topics = [].slice.call(form.querySelectorAll('input[name=topic]:checked')).map(function (i) { return i.value; });
    var types = [].slice.call(form.querySelectorAll('input[name=type]:checked')).map(function (i) { return i.value; });
    var n = parseInt(form.querySelector('select[name=n]').value, 10);
    if (!topics.length) { msg.textContent = 'Tick at least one topic.'; return; }
    if (!types.length) { msg.textContent = 'Tick at least one question type.'; return; }
    msg.textContent = 'Building...';
    Promise.all(topics.map(load)).then(function (banks) {
      var pool = [];
      banks.forEach(function (b) {
        if (!b) return;
        b.questions.forEach(function (q) {
          if (types.indexOf(q.type) < 0) return;
          if (level === 'SL' && b.level === 'HL') return;
          pool.push({ q: q, topic: b.title + (b.level === 'HL' ? ' (HL)' : '') });
        });
      });
      if (!pool.length) { msg.textContent = 'No questions match those choices yet.'; return; }
      var pick = shuffle(pool).slice(0, n).sort(function (a, b) { return ORDER[a.q.type] - ORDER[b.q.type]; });
      render(pick, topics.length);
      msg.textContent = pick.length < n && n !== 999 ? 'Only ' + pick.length + ' questions match so far.' : '';
    }).catch(function () { msg.textContent = 'Some questions could not be loaded. Check your connection and try again.'; });
  });

  // ---------- worksheet ----------
  function lines(k) { var h = ''; for (var i = 0; i < k; i++) h += '<div class="qg-line"></div>'; return h; }
  function table(rows) {
    return '<div class="tbl"><table class="qg-table">' + rows.map(function (r, i) {
      return '<tr>' + r.map(function (c, j) { return (i === 0 || j === 0 ? '<th>' : '<td>') + c + (i === 0 || j === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
    }).join('') + '</table></div>';
  }
  function msList(arr, max) {
    return '<ul class="qg-ms">' + arr.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ul>' + (max && max < arr.length ? '<p class="qg-max">Award up to ' + max + ' marks.</p>' : '');
  }
  function render(pick, nTopics) {
    var total = pick.reduce(function (s, p) { return s + p.q.marks; }, 0);
    var html = '<div class="qg-bar"><button type="button" class="qg-btn" data-act="print">Print worksheet</button>' +
      '<button type="button" class="qg-btn qg-alt" data-act="answers">Show answers</button>' +
      '<button type="button" class="qg-btn qg-alt" data-act="again">New set</button></div>' +
      '<article class="qg-sheet"><header class="qg-head"><h2>Biology practice: ' + (level === 'HL' ? 'HL' : 'SL') + '</h2>' +
      '<p>' + pick.length + ' questions &middot; ' + total + ' marks &middot; ' + nTopics + ' topic' + (nTopics > 1 ? 's' : '') + '</p>' +
      '<p class="qg-name">Name: ______________________ &nbsp; Date: ____________</p></header><ol class="qg-list">';
    pick.forEach(function (p) {
      var q = p.q;
      html += '<li class="qg-q qg-' + q.type + '"><div class="qg-meta">' + p.topic + ' &middot; ' + q.stmt + '<span class="qg-marks">[' + q.marks + ']</span></div>';
      if (q.type === 'mcq') {
        html += '<p>' + q.q + '</p><ol class="qg-opts">' + q.options.map(function (o, i) { return '<li><b>' + LETTERS[i] + '</b> ' + o + '</li>'; }).join('') + '</ol>';
        html += '<div class="qg-ans" hidden><p><b>Answer: ' + LETTERS[q.answer] + '</b></p>' + msList(q.ms) + '</div>';
      } else if (q.type === 'data') {
        html += '<p>' + q.intro + '</p>' + (q.table ? table(q.table) : '') + '<ol class="qg-parts" type="a">';
        q.parts.forEach(function (pt) { html += '<li><p>' + pt.q + ' <span class="qg-marks">[' + pt.marks + ']</span></p>' + lines(pt.marks + 1) + '<div class="qg-ans" hidden>' + msList(pt.ms) + '</div></li>'; });
        html += '</ol>';
      } else {
        html += '<p>' + q.q + '</p>' + lines(q.type === 'extended' ? q.marks * 2 : q.marks + 1) + '<div class="qg-ans" hidden>' + msList(q.ms, q.max) + '</div>';
      }
      html += '</li>';
    });
    html += '</ol><p class="qg-foot">Questions written for What the Cell in the style of IB Biology papers. They are not IB questions.</p></article>';
    out.innerHTML = html; out.hidden = false;
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  out.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'print') window.print();
    if (b.dataset.act === 'again') form.requestSubmit();
    if (b.dataset.act === 'answers') {
      var showing = out.classList.toggle('qg-show');
      out.querySelectorAll('.qg-ans').forEach(function (a) { a.hidden = !showing; });
      b.textContent = showing ? 'Hide answers' : 'Show answers';
    }
  });
})();
