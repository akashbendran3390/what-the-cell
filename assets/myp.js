// MYP Science pages: slide viewer with full screen, per-slide video and simulation links, and an embedded video player.
// The viewer reads data-base, data-count, data-ext and data-links (JSON: {"slide": [["v", youtubeId, title, length] or ["s", url, title]]}).
(function () {
  var viewer = document.querySelector('.viewer');
  var player = document.getElementById('player');
  var frame = player && player.querySelector('.pv-frame');
  var ptitle = player && player.querySelector('.pv-title');
  var plink = player && player.querySelector('.pv-yt');

  function openVideo(id, title) {
    if (!player) { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" title="' + title.replace(/"/g, '&quot;') + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    ptitle.textContent = title; plink.href = 'https://www.youtube.com/watch?v=' + id;
    player.hidden = false; player.querySelector('.pv-close').focus();
  }
  function closeVideo() { if (!player) return; player.hidden = true; frame.innerHTML = ''; }
  if (player) {
    player.querySelector('.pv-close').addEventListener('click', closeVideo);
    player.addEventListener('click', function (e) { if (e.target === player) closeVideo(); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-video]');
    if (b) { e.preventDefault(); openVideo(b.getAttribute('data-video'), b.getAttribute('data-title') || 'Video'); }
  });

  // Lesson pages: give each video in the list a clickable thumbnail in place of the plain time badge (2026-11-23).
  Array.prototype.forEach.call(document.querySelectorAll('.res li'), function (li) {
    var b = li.querySelector('button[data-video]'), badge = li.querySelector('.badge');
    if (!b || !badge || li.querySelector('.vthumb')) return;
    var t = document.createElement('button');
    t.type = 'button'; t.className = 'vthumb'; t.setAttribute('data-video', b.getAttribute('data-video'));
    t.setAttribute('data-title', b.getAttribute('data-title') || ''); t.setAttribute('aria-label', 'Play ' + (b.getAttribute('data-title') || 'video'));
    t.innerHTML = '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(b.getAttribute('data-video')) + '/mqdefault.jpg" alt="" loading="lazy"><i></i>';
    t.querySelector('i').textContent = badge.textContent;
    badge.replaceWith(t); li.classList.add('has-thumb');
  });

  if (!viewer) return;
  var base = viewer.getAttribute('data-base'), n = +viewer.getAttribute('data-count'), ext = viewer.getAttribute('data-ext') || 'png';
  var links = {}; try { links = JSON.parse(viewer.getAttribute('data-links') || '{}'); } catch (e) {}
  var img = viewer.querySelector('.stage img'), count = viewer.querySelector('.count'), range = viewer.querySelector('.v-range');
  var withBox = viewer.querySelector('.with'), thumbs = viewer.querySelector('.thumbs'), fsBtn = viewer.querySelector('.fs');
  var i = 0;
  function src(k) { var s = (window.SLIDE_SRC && window.SLIDE_SRC[k]) || (base + 's' + (k + 1 < 10 ? '0' : '') + (k + 1) + '.' + ext); return s; }
  range.max = n;
  for (var k = 0; k < n; k++) {
    var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Slide ' + (k + 1));
    b.innerHTML = '<img loading="lazy" alt="" src="' + src(k) + '">' + (links[k + 1] ? '<i title="Video or simulation"></i>' : '');
    (function (k) { b.addEventListener('click', function () { show(k); }); })(k);
    thumbs.appendChild(b);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function show(k) {
    i = Math.max(0, Math.min(n - 1, k));
    img.src = src(i); img.alt = 'Slide ' + (i + 1) + ' of ' + n;
    count.textContent = 'Slide ' + (i + 1) + ' of ' + n; range.value = i + 1;
    var L = links[i + 1] || [], h = '<span class="lab">With this slide</span>';
    if (!L.length) h += '<span class="none">No video or simulation for this slide.</span>';
    L.forEach(function (x) {
      if (x[0] === 'v') h += '<button type="button" class="btn vid" data-video="' + esc(x[1]) + '" data-title="' + esc(x[2]) + '">&#9654; Video: ' + esc(x[2]) + ' (' + esc(x[3]) + ')</button>';
      else h += '<a class="btn sim" href="' + esc(x[1]) + '" target="_blank" rel="noopener">Simulation: ' + esc(x[2]) + '</a>';
    });
    withBox.innerHTML = h;
    paintAnswers();
    Array.prototype.forEach.call(thumbs.children, function (b, j) { b.setAttribute('aria-current', j === i ? 'true' : 'false'); });
    var c = thumbs.children[i]; if (c) thumbs.scrollLeft = c.offsetLeft - thumbs.clientWidth / 2 + 46;
  }
  // Answers to the "Working with data" slides (answers.json beside the slides, 2026-11-26): each stays hidden until clicked
  var answers = {}, ansBox = document.createElement('div'); ansBox.className = 'm-answers'; ansBox.hidden = true;
  withBox.parentNode.insertBefore(ansBox, withBox.nextSibling);
  function paintAnswers() {
    var d = answers[i + 1]; ansBox.innerHTML = ''; ansBox.hidden = !d; if (!d) return;
    var head = document.createElement('div'); head.className = 'ma-head';
    head.innerHTML = '<span class="lab">Answers for this slide</span>';
    var items = [];
    d.q.forEach(function (x, j) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ma-btn'; b.setAttribute('aria-expanded', 'false');
      b.textContent = 'Answer ' + (j + 1); b.title = x[0];
      var p = document.createElement('div'); p.className = 'ma-text'; p.hidden = true;
      var tag = /^\d+$/.test(String(x[1])) ? ' [' + x[1] + ']' : ' (level ' + x[1] + ')';
      p.innerHTML = '<b>' + (j + 1) + '. ' + esc(x[0]) + esc(tag) + '</b><p>' + esc(x[2]) + '</p>';
      b.addEventListener('click', function () { var open = p.hidden; p.hidden = !open; b.setAttribute('aria-expanded', open); b.classList.toggle('open', open); });
      head.appendChild(b); items.push([b, p]);
    });
    var all = document.createElement('button'); all.type = 'button'; all.className = 'ma-btn ma-all'; all.textContent = 'Show all';
    all.addEventListener('click', function () {
      var open = items.some(function (t) { return t[1].hidden; });
      items.forEach(function (t) { t[1].hidden = !open; t[0].setAttribute('aria-expanded', open); t[0].classList.toggle('open', open); });
      all.textContent = open ? 'Hide all' : 'Show all';
    });
    head.appendChild(all); ansBox.appendChild(head);
    items.forEach(function (t) { ansBox.appendChild(t[1]); });
  }
  if (window.fetch) fetch(base + '../answers.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { answers = j || {}; paintAnswers(); }).catch(function () {});
  viewer.querySelector('.prev').addEventListener('click', function () { show(i - 1); });
  viewer.querySelector('.next').addEventListener('click', function () { show(i + 1); });
  range.addEventListener('input', function () { show(range.value - 1); });
  img.addEventListener('click', function () { show(i + 1); });

  function isFull() { return document.fullscreenElement === viewer || viewer.classList.contains('fill'); }
  function paintFs() { fsBtn.textContent = isFull() ? 'Exit full screen' : 'Full screen'; }
  function toggleFs() {
    if (document.fullscreenElement === viewer) { document.exitFullscreen(); return; }
    if (viewer.classList.contains('fill')) { viewer.classList.remove('fill'); paintFs(); return; }
    var p = viewer.requestFullscreen ? viewer.requestFullscreen() : null;
    if (p && p.catch) p.catch(function () { viewer.classList.add('fill'); paintFs(); });
    else if (!p) { viewer.classList.add('fill'); paintFs(); }
  }
  fsBtn.addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', paintFs);
  // Keyboard and presentation clickers (they send arrow or page keys) work whenever no video is open
  document.addEventListener('keydown', function (e) {
    if (player && !player.hidden) { if (e.key === 'Escape') closeVideo(); return; }
    var t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    var r = viewer.getBoundingClientRect(), onScreen = r.bottom > 0 && r.top < innerHeight;
    if (!onScreen && !isFull()) return;
    if (['ArrowRight', 'PageDown', ' '].indexOf(e.key) >= 0 && (isFull() || e.key !== ' ')) { e.preventDefault(); show(i + 1); }
    else if (['ArrowLeft', 'PageUp'].indexOf(e.key) >= 0) { e.preventDefault(); show(i - 1); }
    else if (e.key === 'Home') { show(0); } else if (e.key === 'End') { show(n - 1); }
    else if (e.key === 'f' || e.key === 'F') { toggleFs(); }
    else if (e.key === 'Escape' && viewer.classList.contains('fill')) { viewer.classList.remove('fill'); paintFs(); }
  });
  var m = /^#slide-(\d+)$/.exec(location.hash); show(m ? +m[1] - 1 : 0);
})();
