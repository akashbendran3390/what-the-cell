/* Internal Assessment pages: saved checklists, due-date calculator, question builder, test chooser */
(function () {
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  var page = location.pathname.split('/').pop() || 'ia';

  // Tick boxes: saved on this device
  var boxes = document.querySelectorAll('.ia-doc li > input[type=checkbox]');
  var saved = {};
  try { saved = JSON.parse(store('wtc-ia-' + page) || '{}'); } catch (e) { saved = {}; }
  boxes.forEach(function (b, i) {
    b.disabled = false;
    b.setAttribute('aria-label', (b.parentNode.textContent || '').trim().slice(0, 80));
    if (saved[i]) b.checked = true;
    b.addEventListener('change', function () { saved[i] = b.checked ? 1 : 0; store('wtc-ia-' + page, JSON.stringify(saved)); });
  });

  // Due dates from the class start date (Friday of each week; the final is 7 weeks after the complete draft)
  var start = document.getElementById('ia-start');
  if (start) {
    var fmt = function (d) { return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
    var fill = function () {
      var v = start.value; store('wtc-ia-start', v || null);
      var base = v ? new Date(v + 'T12:00:00') : null;
      document.querySelectorAll('[data-week]').forEach(function (td) {
        if (!base) { td.textContent = ''; return; }
        var d = new Date(base); d.setDate(d.getDate() + (parseInt(td.dataset.week, 10) - 1) * 7 + 4); td.textContent = fmt(d);
      });
      document.querySelectorAll('[data-final]').forEach(function (td) {
        if (!base) { td.textContent = ''; return; }
        var d = new Date(base); d.setDate(d.getDate() + 8 * 7 + 4 + 49); td.textContent = 'about ' + fmt(d);
      });
    };
    start.value = store('wtc-ia-start') || '';
    start.addEventListener('change', fill); fill();
  }

  // Topic check
  var quiz = document.getElementById('topic-quiz');
  if (quiz) {
    var qb = quiz.querySelectorAll('input'), out = quiz.querySelector('.ia-quiz-result');
    var upd = function () {
      var n = 0; qb.forEach(function (b) { if (b.checked) n++; });
      out.textContent = n === qb.length ? 'All five: your topic looks workable. Write your Task 1 proposal.' : (n ? n + ' of ' + qb.length + ' so far. Talk to your teacher about the rest before Task 1.' : '');
    };
    qb.forEach(function (b) { b.addEventListener('change', upd); });
  }

  // Research question builder
  var rq = document.getElementById('rq-builder-form');
  if (rq) {
    var outq = rq.querySelector('.ia-rq-out');
    var get = function (k) { var el = rq.querySelector('[data-rq=' + k + ']'); return el.value.trim() || el.placeholder; };
    var any = function () { var a = false; rq.querySelectorAll('input').forEach(function (i) { if (i.value.trim()) a = true; }); return a; };
    var build = function () {
      if (!any()) { outq.textContent = ''; return; }
      outq.innerHTML = '';
      outq.append('How does ' + get('iv') + ' (' + get('levels') + ') affect ' + get('dv') + ', measured by ' + get('method') + ', in ');
      var em = document.createElement('em'); em.textContent = get('org'); outq.append(em, '?');
    };
    rq.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', build); });
  }

  // Statistical test chooser
  var ch = document.getElementById('test-chooser-form');
  if (ch) {
    var res = ch.querySelector('.ia-test-out');
    var val = function (q) { var s = ch.querySelector('[data-q=' + q + ']'); return s ? s.value : ''; };
    var show = function (which) { ch.querySelectorAll('[data-for]').forEach(function (l) { l.classList.toggle('hide', l.dataset.for !== which); }); };
    var tell = function (t) { res.textContent = t; };
    var decide = function () {
      var s = val('shape'); show(s);
      if (s === 'groups') {
        var n = val('n'), k = val('skew');
        if (!n || !k) return tell('');
        if (k === 'yes') return tell(n.charAt(0) === '2' ? (n === '2p' ? 'Wilcoxon signed-rank test on the medians. Show medians and IQR on a box plot.' : 'Mann-Whitney U test on the medians. Show medians and IQR on a box plot.') : 'Kruskal-Wallis test, then a Dunn post-hoc test to show which groups differ. Show medians and IQR on box plots.');
        if (n === '2u') return tell('Unpaired t-test (two-tailed). Show means with ± 1 SD error bars on a bar chart.');
        if (n === '2p') return tell('Paired t-test. Show the before and after means with ± 1 SD error bars.');
        if (n === '3') return tell('One-way ANOVA, then a Tukey post-hoc test to show which levels differ. Plot the means with ± 1 SD error bars.');
        return tell('Spearman\'s rank correlation on all the data, or ANOVA with a post-hoc test if you want to compare particular levels. Plot the means with ± 1 SD error bars and a trendline.');
      }
      if (s === 'pairs') { var l = val('line'); if (!l) return tell(''); return tell(l === 'lin' ? 'Pearson\'s correlation (r), with a scatter graph, linear trendline and R².' : 'Spearman\'s rank correlation (rs), with a scatter graph and a fitted curve.'); }
      if (s === 'counts') { var c = val('chi'); if (!c) return tell(''); return tell(c === 'fit' ? 'Chi-squared goodness of fit: compare observed counts with the counts your expected ratio predicts.' : 'Chi-squared test of association, using a contingency table of counts (for example, quadrats with both species, one, or neither).'); }
      tell('');
    };
    ch.querySelectorAll('select').forEach(function (s) { s.addEventListener('change', decide); });
  }
})();
