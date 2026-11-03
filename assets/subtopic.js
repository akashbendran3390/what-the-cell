// Slide viewer, downloads, self-check and statement checklist for subtopic pages with resources.
const pageKey = 'wtc:' + location.pathname.split('/').pop();
function loadState(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } }
function saveState(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

function initViewer() {
  const v = document.getElementById('viewer');
  if (!v) return;
  const count = +v.dataset.count, img = document.getElementById('viewer-img'), range = document.getElementById('viewer-range'), num = document.getElementById('viewer-num');
  const prev = document.getElementById('viewer-prev'), next = document.getElementById('viewer-next');
  const src = n => v.dataset.base + 's' + String(n).padStart(2, '0') + '.png';
  const videoBox = document.getElementById('viewer-videos'), videoData = document.getElementById('slide-videos');
  const videos = videoData ? JSON.parse(videoData.textContent) : {};
  function showVideos(n) {
    if (!videoBox) return;
    const list = videos[n] || [];
    videoBox.hidden = !list.length;
    videoBox.textContent = '';
    if (!list.length) return;
    const label = document.createElement('span'); label.className = 'viewer-watch'; label.textContent = 'Watch with this slide';
    videoBox.append(label);
    list.forEach(([title, channel, id]) => {
      const a = document.createElement('a');
      a.href = 'https://www.youtube.com/watch?v=' + id; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = title + ' (' + channel + ')';
      videoBox.append(a);
    });
  }
  let at = 1;
  function show(n) {
    at = Math.min(count, Math.max(1, n));
    img.src = src(at); img.alt = 'Slide ' + at + ' of ' + count;
    range.value = at; num.textContent = at;
    prev.disabled = at === 1; next.disabled = at === count;
    showVideos(at);
    if (at < count) new Image().src = src(at + 1);
  }
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  range.addEventListener('input', () => show(+range.value));
  v.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
  show(1);
}

async function initDownloads() {
  const links = [...document.querySelectorAll('a.dl')];
  if (!links.length) return;
  links.forEach(a => { a.download = a.dataset.filename; });
  const status = document.getElementById('dl-status');
  const say = t => { if (status) status.textContent = t; };
  // Without the capability the links stay ordinary file links, which work on any normal web host.
  const downloads = window.claude?.use ? await window.claude.use('downloads') : null;
  if (!downloads) return;
  links.forEach(a => a.addEventListener('click', async e => {
    e.preventDefault();
    try {
      const res = await fetch(a.getAttribute('href'));
      if (!res.ok) throw new Error('fetch');
      await downloads.save({ filename: a.dataset.filename, data: await res.blob() });
    } catch (err) {
      if (err?.code !== 'declined') say('That file could not be saved here. Try opening the page in a browser.');
    }
  }));
}

// Plays YouTube links on the page. A link stays available in case a video's owner has switched off embedding.
function initYouTube() {
  if (window.claude?.use) return; // The Claude preview blocks embedded players, so links open on YouTube there.
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="youtube.com/watch"]');
    if (!a || a.classList.contains('yt-out') || e.ctrlKey || e.metaKey || e.shiftKey) return;
    e.preventDefault();
    const host = a.closest('.viewer-videos') || a.closest('li');
    const open = host.querySelector('.yt-player');
    const same = open && open.dataset.url === a.href;
    if (open) { open.remove(); host.classList.remove('has-player'); }
    if (same) return;
    const id = new URL(a.href).searchParams.get('v');
    const player = document.createElement('div'); player.className = 'yt-player'; player.dataset.url = a.href;
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?rel=0&autoplay=1';
    frame.title = a.querySelector('b')?.textContent || a.textContent;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allowFullscreen = true;
    const out = document.createElement('a'); out.className = 'yt-out'; out.href = a.href; out.target = '_blank'; out.rel = 'noopener';
    out.textContent = 'Video not playing? Open it on YouTube';
    player.append(frame, out); host.append(player); host.classList.add('has-player');
  });
}

function initQuiz() {
  const box = document.getElementById('quiz'), data = document.getElementById('quiz-data');
  if (!box || !data) return;
  const items = JSON.parse(data.textContent), score = document.getElementById('quiz-score');
  const answered = new Map();
  const update = () => { const right = [...answered.values()].filter(Boolean).length; score.textContent = right + ' correct out of ' + answered.size + ' answered, ' + items.length + ' questions'; };
  box.textContent = '';
  items.forEach((it, i) => {
    const fs = document.createElement('fieldset'); fs.className = 'q';
    const lg = document.createElement('legend');
    const tag = document.createElement('span'); tag.className = 'pill'; tag.textContent = it.s;
    lg.append(tag, ' ' + (i + 1) + '. ' + it.q); fs.append(lg);
    const fb = document.createElement('p'); fb.className = 'fb'; fb.setAttribute('role', 'status');
    it.o.forEach((text, j) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.textContent = text;
      b.addEventListener('click', () => {
        const right = j === it.a;
        answered.set(i, right);
        fs.querySelectorAll('.opt').forEach((o, k) => { o.disabled = true; if (k === it.a) o.classList.add('right'); else if (k === j) o.classList.add('wrong'); });
        fb.textContent = (right ? 'Correct. ' : 'Not quite. ') + it.e;
        update();
      });
      fs.append(b);
    });
    fs.append(fb); box.append(fs);
  });
  const again = document.createElement('button'); again.type = 'button'; again.className = 'again'; again.textContent = 'Start again';
  again.addEventListener('click', () => { initQuiz(); score.textContent = ''; document.getElementById('selfcheck').scrollIntoView(); });
  box.append(again);
}

function initChecklist() {
  const list = document.querySelector('#statements .stmts');
  if (!list) return;
  const key = pageKey + ':done', done = new Set(loadState(key, []));
  const head = document.querySelector('#statements h2');
  const tally = document.createElement('span'); tally.className = 'unit-meta';
  const wrap = document.createElement('div'); wrap.className = 'block-head'; head.replaceWith(wrap); wrap.append(head, tally);
  const rows = [...list.querySelectorAll('li')];
  const update = () => { tally.textContent = done.size + ' of ' + rows.length + ' ticked. Saved on this device.'; };
  rows.forEach(li => {
    const id = li.querySelector('.id').textContent;
    const box = document.createElement('input'); box.type = 'checkbox'; box.id = 'check-' + id; box.checked = done.has(id);
    box.setAttribute('aria-label', 'I can explain ' + id);
    box.addEventListener('change', () => { box.checked ? done.add(id) : done.delete(id); saveState(key, [...done]); update(); });
    li.classList.add('checkable'); li.prepend(box);
  });
  update();
}

initViewer(); initDownloads(); initYouTube(); initQuiz(); initChecklist();
