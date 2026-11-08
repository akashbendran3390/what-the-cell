// Slide viewer, downloads, self-check and statement checklist for subtopic pages with resources.
const pageKey = 'wtc:' + location.pathname.split('/').pop();
function loadState(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } }
function saveState(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }

function initViewer() {
  const v = document.getElementById('viewer');
  if (!v) return;
  let count = +v.dataset.count; const img = document.getElementById('viewer-img'), range = document.getElementById('viewer-range'), num = document.getElementById('viewer-num');
  const prev = document.getElementById('viewer-prev'), next = document.getElementById('viewer-next');
  const src = n => v.dataset.base + 's' + String(n).padStart(2, '0') + '.' + (v.dataset.ext || 'png');
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
    if (presenting()) { if (videos[at]) wake(); else if (!v.contains(document.activeElement) || document.activeElement === v) sleep(); }
  }
  // Full screen presenting. If the browser refuses full screen, as an embedded preview can, the slide still fills the window.
  const controls = document.createElement('div'); controls.className = 'viewer-controls';
  v.querySelector('.viewer-bar').before(controls);
  controls.append(v.querySelector('.viewer-bar'));
  if (videoBox) controls.append(videoBox);
  const full = document.createElement('button'); full.type = 'button'; full.id = 'viewer-full'; full.textContent = 'Full screen';
  next.after(full);
  const presenting = () => v.classList.contains('presenting');
  const fsElement = () => document.fullscreenElement || document.webkitFullscreenElement;
  let idleTimer;
  function sleep() { clearTimeout(idleTimer); if (!v.querySelector('.yt-player')) v.classList.add('idle'); }
  function wake() { v.classList.remove('idle'); clearTimeout(idleTimer); idleTimer = setTimeout(sleep, 3000); }
  function setPresenting(on) {
    v.classList.toggle('presenting', on);
    document.documentElement.classList.toggle('presenting-on', on);
    full.textContent = on ? 'Exit full screen' : 'Full screen';
    if (on) { v.tabIndex = -1; v.focus({ preventScroll: true }); wake(); }
    else { clearTimeout(idleTimer); v.classList.remove('idle'); }
  }
  async function enter() {
    setPresenting(true);
    const request = v.requestFullscreen || v.webkitRequestFullscreen;
    if (request) { try { await request.call(v); } catch (e) {} }
  }
  function leave() {
    if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    setPresenting(false);
  }
  const fsChange = () => { if (!fsElement() && presenting()) setPresenting(false); };
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);
  full.addEventListener('click', () => presenting() ? leave() : enter());
  img.addEventListener('click', e => {
    if (!presenting()) return;
    const box = img.getBoundingClientRect();
    show(e.clientX - box.left < box.width / 3 ? at - 1 : at + 1);
  });
  v.addEventListener('mousemove', () => { if (presenting()) wake(); });
  v.addEventListener('focusin', e => { if (presenting() && e.target !== v) wake(); });
  v.addEventListener('pointerdown', e => { if (presenting() && e.pointerType === 'touch') wake(); });
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  range.addEventListener('input', () => show(+range.value));
  v.addEventListener('keydown', e => {
    if (presenting()) return;
    if (e.key === 'ArrowLeft') show(at - 1);
    if (e.key === 'ArrowRight') show(at + 1);
    if (e.key === 'f' || e.key === 'F') enter();
  });
  // Clickers send Page Up and Page Down, so those move slides too.
  document.addEventListener('keydown', e => {
    if (!presenting() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' && e.target.closest('a,button')) return;
    const step = { ArrowRight: 1, ArrowDown: 1, PageDown: 1, ' ': 1, ArrowLeft: -1, ArrowUp: -1, PageUp: -1, Backspace: -1 }[e.key];
    if (step) show(at + step);
    else if (e.key === 'Home') show(1);
    else if (e.key === 'End') show(count);
    else if (e.key === 'Escape' || e.key === 'f' || e.key === 'F') leave();
    else return;
    e.preventDefault();
  });
  // Pages with several decks, such as Skills, switch the one viewer between them with tabs.
  const tabs = [...document.querySelectorAll('.deck-tab')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(o => o.setAttribute('aria-selected', o === t));
    v.dataset.base = t.dataset.base; v.dataset.ext = t.dataset.ext || 'png'; count = +t.dataset.count; range.max = count;
    const total = document.getElementById('viewer-total'); if (total) total.textContent = count;
    const pdf = document.getElementById('deck-pdf');
    if (pdf) { pdf.href = t.dataset.pdf; pdf.dataset.filename = t.dataset.filename; pdf.download = t.dataset.filename; }
    show(1);
  }));
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

// Folds each note card to one row. Without this script every note simply stays open.
function initNotes() {
  const cards = [...document.querySelectorAll('#notes .note-card')];
  if (!cards.length) return;
  const canFind = 'onbeforematch' in document.body;
  const all = document.createElement('button'); all.type = 'button'; all.className = 'notes-all';
  const isOpen = card => !card.classList.contains('closed');
  const syncAll = () => { all.textContent = cards.every(isOpen) ? 'Close all notes' : 'Open all notes'; };
  function setOpen(card, open) {
    const body = card.querySelector('.note-body');
    card.classList.toggle('closed', !open);
    card.querySelector('.note-toggle').setAttribute('aria-expanded', open);
    if (open) body.removeAttribute('hidden');
    else body.setAttribute('hidden', canFind ? 'until-found' : ''); // until-found lets the browser's page search open a note.
    syncAll();
  }
  cards.forEach(card => {
    const header = card.querySelector('header'), h4 = header.querySelector('h4');
    const body = document.createElement('div'); body.className = 'note-body'; body.id = card.id + '-body';
    while (header.nextSibling) body.append(header.nextSibling);
    card.append(body);
    const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'note-toggle';
    toggle.setAttribute('aria-controls', body.id);
    toggle.append(...h4.childNodes); h4.append(toggle);
    header.addEventListener('click', () => setOpen(card, !isOpen(card)));
    body.addEventListener('beforematch', () => setOpen(card, true));
    setOpen(card, false);
  });
  all.addEventListener('click', () => { const open = !cards.every(isOpen); cards.forEach(c => setOpen(c, open)); });
  document.querySelector('#notes .note-group, #notes .note-card').before(all);
  function openFromHash() {
    const target = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    const card = target && target.closest('.note-card');
    if (card && cards.includes(card)) { setOpen(card, true); target.scrollIntoView(); }
  }
  addEventListener('hashchange', openFromHash);
  openFromHash();
  // Printing always shows every note, then puts the page back as it was.
  let beforePrint = null;
  addEventListener('beforeprint', () => { beforePrint = cards.filter(isOpen); cards.forEach(c => setOpen(c, true)); });
  addEventListener('afterprint', () => { if (beforePrint) cards.forEach(c => setOpen(c, beforePrint.includes(c))); beforePrint = null; });
}

function initQuiz() {
  const box = document.getElementById('quiz'), data = document.getElementById('quiz-data');
  if (!box || !data) return;
  const items = JSON.parse(data.textContent), score = document.getElementById('quiz-score');
  const answered = new Map();
  const update = () => { const right = [...answered.values()].filter(Boolean).length; score.textContent = right + ' correct out of ' + answered.size + ' answered, ' + items.length + ' questions'; };
  box.textContent = '';
  // Houses the questions in one dropdown. Start again runs this function again, so it wraps only once.
  if (!box.closest('details')) {
    const drop = document.createElement('details'); drop.className = 'quiz-drop';
    const label = document.createElement('summary');
    const name = () => { label.textContent = (drop.open ? 'Hide the ' : 'Show the ') + items.length + ' questions'; };
    drop.addEventListener('toggle', name); name();
    box.before(drop); drop.append(label, box);
    const openDrop = () => { drop.open = true; };
    document.querySelectorAll('a[href="#selfcheck"]').forEach(a => a.addEventListener('click', openDrop));
    if (location.hash === '#selfcheck') openDrop();
  }
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

initViewer(); initNotes(); initDownloads(); initYouTube(); initQuiz(); initChecklist();
