// ─────────────────────────────────────────────────────────────
// „Seite im Aufbau“ für lismusic.de
//
// EIN- UND AUSSCHALTEN: nur die Zeile MODUS unten ändern.
//   'a'  schmales Banner ganz oben
//   'b'  Hinweis im Hero und im Footer
//   'c'  Platzhalter (Artist Eins, Songtitel …) als „Coming soon“-Slots
//   'd'  eigene Aufbau-Startseite vor der ganzen Seite (mit Zugangscode)
//   Kombinieren mit Komma, z. B. 'a,c'. Ganz aus: ''
//
// KOMPLETT ENTFERNEN: diese Datei löschen und in index.html die Zeile
//   <script src="/aufbau.js"></script>   löschen. Sonst ändert sich nichts.
//
// VORSCHAU ohne Code zu ändern: an die Adresse ?aufbau=a (oder b, c, d, a,c, aus) hängen.
// ─────────────────────────────────────────────────────────────
(() => {
const MODUS = 'a,c';
const BANNER_TEXT = 'Seite im Aufbau. Erste Releases ab Dezember 2026.';
const ZUGANGSCODE = 'lis'; // Variante D: Code für die volle Seite. Kein echter Schutz, nur ein Vorhang.
const KONTAKT = 'team@lismusic.de';
// Was als Platzhalter zählt (Variante C). Echte Namen werden nie angefasst.
const IST_PLATZHALTER_ARTIST = n => /^artist\b/i.test(String(n).trim());
const IST_PLATZHALTER_TITEL = t => /^(songtitel|ep-titel|albumtitel|titel)$/i.test(String(t).trim());

const q = new URLSearchParams(location.search).get('aufbau');
const modus = (q === null ? MODUS : q === 'aus' ? '' : q).toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
if (!modus.length) return;
const an = k => modus.includes(k);
const $ = s => document.querySelector(s);
const css = t => { const s = document.createElement('style'); s.textContent = t; document.head.appendChild(s) };

// ── A: Banner ganz oben ─────────────────────────────────────
if (an('a')) {
  css(`:root{--wip:34px}
  .wip-bar{position:fixed;top:0;left:0;right:0;z-index:60;height:var(--wip);display:flex;align-items:center;justify-content:center;gap:10px;background:var(--rd-ink);color:#fff;font:600 13px/1 Manrope,sans-serif;letter-spacing:.02em;padding:0 var(--pad)}
  .wip-bar button{background:none;border:0;color:inherit;font:inherit;text-decoration:underline;text-underline-offset:3px;cursor:pointer;padding:4px}
  .wip-bar i{width:7px;height:7px;border-radius:50%;background:#fff;flex:none}
  @media(prefers-reduced-motion:no-preference){.wip-bar i{animation:wipPuls 2s ease-in-out infinite}}
  @keyframes wipPuls{50%{opacity:.25}}
  header{top:var(--wip)!important}
  .page{padding-top:calc(80px + var(--wip))!important}
  @media(max-width:900px){nav.main.open{inset:calc(60px + var(--wip)) 0 0 0!important}.wip-bar .lang{display:none}}`);
  const b = document.createElement('div');
  b.className = 'wip-bar'; b.setAttribute('role', 'status');
  b.innerHTML = `<i aria-hidden="true"></i><span>${BANNER_TEXT}</span><button class="lang" type="button">Newsletter</button>`;
  document.body.prepend(b);
  b.querySelector('button').onclick = () => { const i = document.querySelector('footer input[type=email]'); i.scrollIntoView({ behavior: 'smooth', block: 'center' }); i.focus({ preventScroll: true }) };
}

// ── B: Hinweis im Hero und Footer ───────────────────────────
if (an('b')) {
  css(`.wip-tag{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--line2);background:rgba(18,17,15,.6);color:var(--tx);font:500 13px/1 Manrope,sans-serif;padding:8px 12px;border-radius:6px;margin-bottom:28px}
  .wip-tag b{color:var(--rd);font-weight:600}
  .wip-foot{color:var(--rd)}`);
  const h1 = $('.hero h1');
  if (h1) h1.insertAdjacentHTML('beforebegin', `<div class="wip-tag"><b>Version 0.1</b> Wir bauen noch. Bald mehr.</div>`);
  const fb = $('.fbot span');
  if (fb) fb.insertAdjacentHTML('afterend', `<span class="wip-foot">Seite im Aufbau · Stand ${new Date(document.lastModified).toLocaleDateString('de-DE')}</span>`);
}

// ── C: Platzhalter als „Coming soon“-Slots ──────────────────
if (an('c')) {
  css(`.art.wip-slot{border:1px dashed var(--line2);background:repeating-linear-gradient(135deg,var(--panel) 0 14px,#181614 14px 28px)}
  .art.wip-slot .ini{color:rgba(239,233,222,.05);font-size:180px}
  .art.wip-slot .n{font-size:36px}
  .art.wip-slot .n small{display:block;font:500 14px/1.4 Manrope,sans-serif;text-transform:none;color:var(--se);margin-top:10px}
  .art.wip-slot .r{color:var(--rd)}
  .item.wip-slot .cover{border-style:dashed;border-color:var(--line2)}
  .roster .wip-r{color:var(--mu);font-family:'Instrument Serif',serif;font-style:italic;text-transform:none}
  @media(hover:hover) and (pointer:fine){.art.wip-slot:hover{border-color:var(--rd)}}`);
  let n = 0;
  const fix = () => {
    // Artist-Karten → „Dein Name hier?“, führt zum Demo-Formular
    n = 0;
    document.querySelectorAll('#artGrid .art').forEach(a => {
      const name = a.querySelector('.n'); if (!name) return; if (a.classList.contains('wip-slot')) { n++; return }
      if (!IST_PLATZHALTER_ARTIST(name.textContent)) return;
      n++;
      a.classList.add('wip-slot'); a.href = '#demo';
      name.dataset.wip = 1;
      name.innerHTML = `Slot ${String(n).padStart(2, '0')}<small>Noch frei. Dein Name hier? Schick uns ein Demo.</small>`;
      const r = a.querySelector('.r'); if (r) r.textContent = 'Coming soon';
      const i = a.querySelector('.ini'); if (i) i.textContent = '?';
    });
    // Laufband: Platzhalter-Namen weg, stattdessen ein Satz
    const ro = $('#roster');
    if (ro && !ro.querySelector('.wip-r')) {
      const echt = [...ro.querySelectorAll('a')].filter(a => !IST_PLATZHALTER_ARTIST(a.textContent));
      if (echt.length !== ro.children.length) {
        ro.innerHTML = echt.map(a => a.outerHTML).join('') + `<a class="wip-r" href="#demo">Erste Artists bald hier.</a>`;
      }
    }
    // Releases: „Songtitel“ → „Titel folgt“, „Artist Eins“ → „Artist folgt“
    document.querySelectorAll('#relGrid .item').forEach(it => {
      const t = it.querySelector('h3'), p = it.querySelector('p');
      if (!t || it.classList.contains('wip-slot')) return;
      const platz = IST_PLATZHALTER_TITEL(t.textContent) || (p && IST_PLATZHALTER_ARTIST(p.textContent));
      if (!platz) return;
      it.classList.add('wip-slot');
      if (IST_PLATZHALTER_TITEL(t.textContent)) t.textContent = 'Titel folgt';
      if (p) p.textContent = p.textContent.replace(/^artist\s+\S+/i, 'Artist folgt');
    });
    // Nächster Release
    const nt = $('#nextT');
    if (nt && nt.innerHTML.includes('<br>')) {
      const [a, t] = nt.innerHTML.split('<br>');
      const pa = IST_PLATZHALTER_ARTIST(a.replace(/<[^>]+>/g, '')), pt = IST_PLATZHALTER_TITEL(t.replace(/<[^>]+>/g, ''));
      if (pa || pt) nt.innerHTML = `${pa ? 'Erste Single' : a}<br><span class="serif mu">${pt ? 'Titel folgt' : t.replace(/<[^>]+>/g, '')}</span>`;
    }
  };
  // Inhalte kommen später aus site.json: jedes Mal nachbessern, wenn sie neu gezeichnet werden
  const mo = new MutationObserver(() => { mo.disconnect(); fix(); beobachten() });
  const beobachten = () => ['#artGrid', '#roster', '#relGrid', '#nextT'].forEach(s => { const e = $(s); if (e) mo.observe(e, { childList: true, subtree: true, characterData: true }) });
  fix(); beobachten();
  // Klick auf einen Platzhalter-Artist (z. B. alter Link) zeigt das Demo-Formular
  addEventListener('hashchange', () => { if (/^#artist-artist-/.test(location.hash)) location.hash = '#demo' });
}

// ── D: eigene Aufbau-Startseite ─────────────────────────────
if (an('d')) {
  let frei = false;
  try { frei = localStorage.getItem('lis-zugang') === ZUGANGSCODE } catch (e) {}
  const vq = new URLSearchParams(location.search).get('vorschau');
  if (vq === ZUGANGSCODE) { frei = true; try { localStorage.setItem('lis-zugang', ZUGANGSCODE) } catch (e) {} }
  if (!frei) {
    css(`.wip-d{position:fixed;inset:0;z-index:200;background:var(--bg);overflow:auto;display:grid;grid-template-rows:auto 1fr auto;padding:24px var(--pad)}
    html.wip-zu,html.wip-zu body{overflow:hidden}
    .wip-d .top{display:flex;justify-content:space-between;align-items:center;font-size:14px}
    .wip-d .top .brand svg{width:28px;height:28px;color:var(--rd)}
    .wip-d .mid{display:grid;place-items:center;text-align:center;position:relative;padding:48px 0;--f:clamp(72px,13vw,200px)}
    .wip-d .clock{opacity:.9}
    .wip-d .in{position:relative;z-index:1;max-width:560px}
    .wip-d h1{font-size:var(--f)}
    .wip-d h1 .serif{display:block;font-size:1.1em;line-height:.75}
    .wip-d .st{display:inline-flex;align-items:center;gap:8px;color:var(--se);font-size:14px;margin-bottom:24px}
    .wip-d .st::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--rd)}
    .wip-d p.l{color:var(--se);font-size:18px;margin:24px auto 28px;max-width:420px}
    .wip-d .nl{max-width:420px;margin:0 auto}
    .wip-d .bot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:16px;color:var(--mu);font-size:13px;align-items:center}
    .wip-d .bot a{color:var(--se)}
    .wip-d details summary{cursor:pointer;color:var(--se);list-style:none}
    .wip-d details summary::-webkit-details-marker{display:none}
    .wip-d details form{display:flex;gap:8px;margin-top:8px}
    .wip-d details input{height:40px;width:160px;padding:8px 12px}
    .wip-d details .btn{height:40px}
    .wip-d .err{color:var(--rd);font-size:13px}`);
    const d = document.createElement('div');
    d.className = 'wip-d'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Seite im Aufbau');
    d.innerHTML = `<div class="top"><span class="brand"><svg><use href="#logo"/></svg>LIS MUSIC</span><a href="mailto:${KONTAKT}" class="cta">${KONTAKT}</a></div>
    <div class="mid"><svg class="clock" viewBox="0 0 100 100" aria-hidden="true"><use href="#ring"/><rect class="hand" id="wHh" x="47" y="33" width="6" height="16" rx="1" fill="currentColor"/><rect class="hand" id="wMh" x="47.5" y="24" width="5" height="25" rx="1" fill="currentColor"/></svg>
    <div class="in"><div class="st">Seite im Aufbau</div><h1>Life is<span class="serif">short.</span></h1>
    <p class="l">Wir bauen gerade das Label auf. Erste Single im Dezember. Trag dich ein, dann sagen wir Bescheid.</p>
    <form class="nl nf" name="newsletter" method="POST" data-netlify="true" netlify-honeypot="bot-field" data-ok="Eingetragen. Bis bald."><input type="hidden" name="form-name" value="newsletter"><label class="hp">Nicht ausfüllen<input name="bot-field"></label><input name="email" type="email" placeholder="deine@mail.de" required aria-label="E-Mail"><button class="btn">Eintragen</button></form></div></div>
    <div class="bot"><span>Halstenbek bei Hamburg · <a href="mailto:${KONTAKT}">${KONTAKT}</a> · <a href="#" id="wipIg">Instagram</a></span>
    <details><summary>Zugang fürs Team</summary><form id="wipCode"><input type="password" placeholder="Code" aria-label="Zugangscode" autocomplete="off"><button class="btn g">Öffnen</button></form><span class="err" id="wipErr" hidden>Falscher Code.</span></details></div>`;
    document.body.appendChild(d);
    document.documentElement.classList.add('wip-zu');
    $('#wipCode').addEventListener('submit', e => {
      e.preventDefault();
      if (e.target.querySelector('input').value.trim().toLowerCase() !== ZUGANGSCODE) { $('#wipErr').hidden = false; return }
      try { localStorage.setItem('lis-zugang', ZUGANGSCODE) } catch (e) {}
      d.remove(); document.documentElement.classList.remove('wip-zu');
    });
    const tk = () => {
      const t = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date()), g = k => +t.find(x => x.type === k).value;
      const m = g('minute'), h = g('hour') % 12 + m / 60;
      $('#wMh').style.transform = `rotate(${m * 6}deg)`; $('#wHh').style.transform = `rotate(${h * 30}deg)`;
    };
    tk(); setInterval(tk, 10000);
  }
}
})();
