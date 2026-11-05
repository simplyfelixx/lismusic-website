// Supabase Edge Function „veroeffentlichen“
// Schreibt die öffentlichen Inhalte (Artists, Releases, News) als data/site.json
// und die Bilder nach media/ ins Website-Repo. Netlify stellt das danach automatisch live.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GITHUB_TOKEN   Fine-grained Token, nur Repo lismusic-website, Recht "Contents: Read and write"
//   GITHUB_REPO    optional, Standard simplyfelixx/lismusic-website
//   GITHUB_BRANCH  optional, Standard main
//   COMMIT_NAME / COMMIT_EMAIL  optional, Autor der Commits (Netlify baut nur bekannte Autoren)
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY setzt Supabase selbst.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const REPO = Deno.env.get('GITHUB_REPO') || 'simplyfelixx/lismusic-website';
const BRANCH = Deno.env.get('GITHUB_BRANCH') || 'main';
const AUTOR = {
  name: Deno.env.get('COMMIT_NAME') || 'simplyfelixx',
  email: Deno.env.get('COMMIT_EMAIL') || '65625134+simplyfelixx@users.noreply.github.com',
};

async function gh(path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'lismusic-backstage',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!r.ok) throw new Error(`GitHub ${init.method || 'GET'} ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

/** Git-Blob-SHA (wie `git hash-object`), damit unveränderte Bilder nicht neu hochgeladen werden */
async function blobSha(bytes: Uint8Array) {
  const kopf = new TextEncoder().encode(`blob ${bytes.length}\0`);
  const all = new Uint8Array(kopf.length + bytes.length);
  all.set(kopf); all.set(bytes, kopf.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', all));
  return [...h].map(b => b.toString(16).padStart(2, '0')).join('');
}
function base64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
/** "artists/12-abc.webp" → "media/artists-12-abc.webp" */
const mediaPfad = (p: string) => 'media/' + p.replace(/[^a-zA-Z0-9._-]+/g, '-');
const sauber = (links: Record<string, string> = {}) =>
  Object.fromEntries(Object.entries(links).filter(([, v]) => typeof v === 'string' && /^https?:\/\//i.test(v)));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Nur POST' }, 405);
  try {
    if (!Deno.env.get('GITHUB_TOKEN')) return json({ error: 'Secret GITHUB_TOKEN fehlt (siehe ANLEITUNG-BACKSTAGE.md).' }, 500);

    // 1. Darf die Person das? (Label-Mitglied, mit 2FA angemeldet)
    const auth = req.headers.get('Authorization') || '';
    const nutzer = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: darf, error: e0 } = await nutzer.rpc('ist_label');
    if (e0 || darf !== true) return json({ error: 'Kein Zugriff. Bitte mit Zwei-Faktor-Code anmelden.' }, 403);

    // 2. Öffentliche Inhalte laden (mit Service-Schlüssel, nur ausgewählte Felder)
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const [a, r, n] = await Promise.all([
      db.from('artists').select('id,slug,name,genre,bio,foto,links,sortierung').eq('oeffentlich', true).order('sortierung').order('name'),
      db.from('releases').select('titel,typ,datum,datum_text,cover,links,artist_id').eq('oeffentlich', true).order('datum', { ascending: true, nullsFirst: false }),
      db.from('news').select('datum,titel,kategorie,text').eq('oeffentlich', true).order('datum', { ascending: false }),
    ]);
    if (a.error || r.error || n.error) throw new Error((a.error || r.error || n.error)!.message);

    const bilder = new Map<string, string>(); // Speicher-Pfad → media-Pfad
    const bild = (p?: string | null) => { if (!p) return null; const m = mediaPfad(p); bilder.set(p, m); return '/' + m; };
    const artistById = new Map(a.data!.map(x => [x.id, x]));
    const site = {
      aktualisiert: new Date().toISOString(),
      artists: a.data!.map(x => ({ slug: x.slug, name: x.name, genre: x.genre, bio: x.bio, foto: bild(x.foto), links: sauber(x.links) })),
      releases: r.data!.map(x => {
        const ar = x.artist_id ? artistById.get(x.artist_id) : null;
        return { titel: x.titel, typ: x.typ, datum: x.datum, datum_text: x.datum_text, artist: ar?.name || '', artist_slug: ar?.slug || '', cover: bild(x.cover), links: sauber(x.links) };
      }),
      news: n.data!.map(x => ({ datum: x.datum, titel: x.titel, kategorie: x.kategorie, text: x.text })),
    };

    // 3. Aktuellen Stand des Repos holen
    const ref = await gh(`/git/ref/heads/${BRANCH}`);
    const basis = await gh(`/git/commits/${ref.object.sha}`);
    const baum = await gh(`/git/trees/${basis.tree.sha}?recursive=1`);
    const vorhanden = new Map<string, string>(baum.tree.filter((t: any) => t.type === 'blob').map((t: any) => [t.path, t.sha]));

    const eintraege: any[] = [];
    // site.json
    const siteBytes = new TextEncoder().encode(JSON.stringify(site, null, 1) + '\n');
    const altSite = vorhanden.get('data/site.json');
    // Zeitstempel ignorieren, wenn sonst nichts geändert ist
    const ohneZeit = (o: any) => JSON.stringify({ ...o, aktualisiert: '' });
    let siteGeaendert = true;
    if (altSite) {
      try {
        const alt = await gh(`/git/blobs/${altSite}`);
        const altText = new TextDecoder().decode(Uint8Array.from(atob(alt.content.replace(/\n/g, '')), c => c.charCodeAt(0)));
        siteGeaendert = ohneZeit(JSON.parse(altText)) !== ohneZeit(site);
      } catch { /* dann einfach neu schreiben */ }
    }
    if (siteGeaendert) eintraege.push({ path: 'data/site.json', mode: '100644', type: 'blob', content: new TextDecoder().decode(siteBytes) });

    // Bilder: nur neue oder geänderte hochladen
    for (const [speicher, ziel] of bilder) {
      const { data: datei, error } = await db.storage.from('medien').download(speicher);
      if (error || !datei) throw new Error(`Bild ${speicher} nicht gefunden`);
      const bytes = new Uint8Array(await datei.arrayBuffer());
      if (vorhanden.get(ziel) === await blobSha(bytes)) continue;
      const blob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: base64(bytes), encoding: 'base64' }) });
      eintraege.push({ path: ziel, mode: '100644', type: 'blob', sha: blob.sha });
    }
    // Bilder, die nicht mehr gebraucht werden, entfernen
    const gebraucht = new Set(bilder.values());
    for (const p of vorhanden.keys()) {
      if (p.startsWith('media/') && p !== 'media/.gitkeep' && !gebraucht.has(p)) eintraege.push({ path: p, mode: '100644', type: 'blob', sha: null });
    }

    if (!eintraege.length) return json({ ok: true, unveraendert: true, hinweis: 'Website ist schon aktuell.' });

    // 4. Ein Commit mit allen Änderungen
    const neuerBaum = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: basis.tree.sha, tree: eintraege }) });
    const jetzt = new Date().toISOString();
    const commit = await gh('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Inhalte aus Backstage veröffentlicht',
        tree: neuerBaum.sha,
        parents: [ref.object.sha],
        author: { ...AUTOR, date: jetzt },
        committer: { ...AUTOR, date: jetzt },
      }),
    });
    await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });

    const { data: { user } } = await nutzer.auth.getUser();
    await db.from('veroeffentlichungen').insert({ user_id: user?.id, commit_sha: commit.sha, hinweis: `${eintraege.length} Datei(en)` });
    return json({ ok: true, commit: commit.sha, dateien: eintraege.length });
  } catch (e) {
    console.error(e);
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
