#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════╗
// ║  Generatore Notizie TXT  —  versione Node.js         ║
// ║  Esegui: node notizie.js                             ║
// ║  Output: notizie_YYYY-MM-DD.txt                      ║
// ╚══════════════════════════════════════════════════════╝

const https  = require('https');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { load } = require('cheerio');

// ── colori ANSI per il terminale ─────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
};

const ok  = (s) => `${C.green}✓${C.reset} ${s}`;
const err = (s) => `${C.red}✗${C.reset} ${s}`;
const inf = (s) => `${C.blue}→${C.reset} ${s}`;
const dim = (s) => `${C.gray}${s}${C.reset}`;

// ── FEED per categoria ───────────────────────────────────
const FEEDS = [
  { id:'cronaca',  cat:'CRONACA',                count:3, sources:[
    { url:'https://www.ansa.it/sito/notizie/cronaca/cronaca_rss.xml',          label:'ANSA' },
    { url:'https://tg24.sky.it/rss/cronaca.rss',                               label:'Sky TG24' },
    { url:'https://www.tgcom24.mediaset.it/rss/cronaca.rss',                   label:'TgCom24' },
    { url:'https://www.repubblica.it/rss/cronaca/rss2.0.xml',                  label:'Repubblica' },
  ]},
  { id:'politica', cat:'POLITICA ITALIANA',      count:2, sources:[
    { url:'https://www.ansa.it/sito/notizie/politica/politica_rss.xml',        label:'ANSA' },
    { url:'https://tg24.sky.it/rss/politica.rss',                              label:'Sky TG24' },
    { url:'https://www.tgcom24.mediaset.it/rss/politica.rss',                  label:'TgCom24' },
    { url:'https://www.repubblica.it/rss/politica/rss2.0.xml',                 label:'Repubblica' },
  ]},
  { id:'finanza',  cat:'FINANZA / BORSA',         count:2, sources:[
    { url:'https://www.ansa.it/sito/notizie/economia/borsa/borsa_rss.xml',     label:'ANSA' },
    { url:'https://www.ilsole24ore.com/rss/finanza-e-mercati.xml',             label:'Sole24Ore' },
    { url:'https://www.milanofinanza.it/rss',                                  label:'MilanoFinanza' },
    { url:'https://tg24.sky.it/rss/economia.rss',                              label:'Sky TG24' },
  ]},
  { id:'mondo',    cat:'POLITICA INTERNAZIONALE', count:2, sources:[
    { url:'https://www.ansa.it/sito/notizie/mondo/mondo_rss.xml',              label:'ANSA' },
    { url:'https://tg24.sky.it/rss/mondo.rss',                                 label:'Sky TG24' },
    { url:'https://www.tgcom24.mediaset.it/rss/esteri.rss',                    label:'TgCom24' },
    { url:'https://www.corriere.it/rss/esteri.xml',                            label:'Corriere' },
  ]},
  { id:'economia', cat:'ECONOMIA',               count:2, sources:[
    { url:'https://www.ansa.it/sito/notizie/economia/economia_rss.xml',        label:'ANSA' },
    { url:'https://www.ilsole24ore.com/rss/economia-e-lavoro.xml',             label:'Sole24Ore' },
    { url:'https://tg24.sky.it/rss/economia.rss',                              label:'Sky TG24' },
    { url:'https://www.repubblica.it/rss/economia/rss2.0.xml',                 label:'Repubblica' },
  ]},
  { id:'tech',     cat:'TECNOLOGIA / CURIOSITÀ',  count:1, sources:[
    { url:'https://www.ansa.it/sito/notizie/tecnologia/tecnologia_rss.xml',    label:'ANSA' },
    { url:'https://www.wired.it/feed/rss',                                     label:'Wired IT' },
    { url:'https://tg24.sky.it/rss/tecnologia.rss',                            label:'Sky TG24' },
    { url:'https://www.hwupgrade.it/rss.xml',                                  label:'HWUpgrade' },
  ]},
  { id:'sport',    cat:'SPORT',                   count:2, sources:[
    { url:'https://www.ansa.it/sito/notizie/sport/sport_rss.xml',              label:'ANSA' },
    { url:'https://www.gazzetta.it/rss/home.xml',                              label:'Gazzetta' },
    { url:'https://tg24.sky.it/rss/sport.rss',                                 label:'Sky TG24' },
    { url:'https://www.corrieredellosport.it/rss',                             label:'CorrSport' },
  ]},
];

const CITIES = [
  "Reggio Calabria","Reggio Emilia","Sant'Angelo","Roma","Milano","Napoli","Torino",
  "Palermo","Genova","Bologna","Firenze","Bari","Catania","Venezia","Verona","Messina",
  "Padova","Trieste","Taranto","Brescia","Prato","Modena","Parma","Livorno","Cagliari",
  "Foggia","Perugia","Salerno","Ravenna","Ferrara","Sassari","Siracusa","Bergamo",
  "Pescara","Vicenza","Rimini","Trento","Novara","Bolzano","Ancona","Monza","Lecce",
  "Udine","La Spezia","Piacenza","Catanzaro","Terni","Cosenza","Latina","Arezzo",
  "Alessandria","Como","Pistoia","Caserta","Pisa","Brindisi","Varese","Potenza",
  "Treviso","Pesaro","Mantova","L'Aquila","Campobasso","Aosta","Nuoro","Ragusa",
  "Washington","New York","Los Angeles","San Francisco","Chicago","Miami","Londra",
  "Parigi","Berlino","Madrid","Mosca","Bruxelles","Vienna","Ginevra","Amsterdam",
  "Istanbul","Kiev","Belgrado","Lisbona","Dublino","Helsinki","Varsavia","Praga",
  "Budapest","Bucarest","Atene","Pechino","Shanghai","Tokyo","Seul","Singapore",
  "Mumbai","Nuova Delhi","Tel Aviv","Gerusalemme","Riyadh","Dubai","Cairo","Tunisi",
  "Buenos Aires","Rio de Janeiro","San Paolo","Toronto","Vancouver","Sydney","Melbourne",
];

// ── HTTP fetch con timeout, redirect e User-Agent ────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function fetchUrl(url, timeoutMs = 12000, redirects = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod    = parsed.protocol === 'https:' ? https : http;
    const timer  = setTimeout(() => reject(new Error('timeout')), timeoutMs);

    const req = mod.get(url, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      }
    }, (res) => {
      // segui redirect
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        clearTimeout(timer);
        req.destroy();
        const next = new URL(res.headers.location, url).href;
        fetchUrl(next, timeoutMs, redirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        clearTimeout(timer);
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        clearTimeout(timer);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
      res.on('error', e => { clearTimeout(timer); reject(e); });
    });

    req.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

// ── Parsing RSS/Atom con cheerio ─────────────────────────
function stripHtml(html) {
  if (!html) return '';
  return load(html).text().replace(/\s+/g, ' ').trim();
}

function parseRss(xmlStr) {
  const $ = load(xmlStr, { xmlMode: true });
  const items = $('item, entry').toArray();
  if (!items.length) throw new Error('Nessun item nel feed');

  return items.map(el => {
    const $el = $(el);

    const title = stripHtml($el.find('title').first().text());

    // Descrizione: prende il campo più lungo tra tutti i possibili
    const candidates = [
      $el.find('description').first().text(),
      $el.find('summary').first().text(),
      $el.find('content\\:encoded, encoded').first().text(),
      $el.find('content').first().text(),
      $el.find('media\\:description').first().text(),
    ];
    const rawDesc = candidates.reduce((a, b) => stripHtml(b).length > stripHtml(a).length ? b : a, '');

    // Link articolo
    const linkEl  = $el.find('link').first();
    const link    = linkEl.attr('href') || linkEl.text().trim()
                 || $el.find('guid').first().text().trim() || '';

    return { title, desc: stripHtml(rawDesc), link };
  });
}

// ── Estrai testo articolo da pagina HTML ─────────────────
function extractArticleText(html) {
  const $ = load(html);

  // Rimuovi elementi non pertinenti
  $('script, style, nav, footer, header, aside, figure, figcaption, ' +
    'form, button, iframe, noscript').remove();
  $('[class*="advert"],[class*="cookie"],[class*="banner"],[class*="social"],' +
    '[class*="related"],[class*="correlat"],[class*="sidebar"],[class*="widget"],' +
    '[class*="promo"],[class*="newsletter"],[class*="commento"],[class*="comment"]').remove();

  const SELECTORS = [
    '[itemprop="articleBody"]','[itemprop="text"]',
    '.article-body','.article__body','.article-content','.article__content',
    '.article-text','.article__text','.entry-content','.post-content',
    '.story-body','.story__body','.news-body','.news__body',
    '.content-article','.article-detail__body','.article-detail',
    '#article-body','#articleBody','#article-content',
    '.field--name-body','.body-article','.testo-articolo',
    '.testo','.corpo-notizia','.content__article-body',
    '.RichTextArticleBody','.article__paragraph',
    'article','[role="main"]','main',
  ];

  for (const sel of SELECTORS) {
    const els = $(sel);
    if (!els.length) continue;

    const seen  = new Set();
    const paras = [];
    els.each((_, el) => {
      $(el).find('p').each((__, p) => {
        const t = $(p).text().trim();
        if (t.length > 40 && !seen.has(t)) {
          seen.add(t);
          paras.push(t);
        }
      });
    });

    if (paras.length >= 1) return paras.join(' ');
  }

  // Fallback: tutti i <p> con almeno 60 caratteri
  const seen  = new Set();
  const paras = [];
  $('p').each((_, p) => {
    const t = $(p).text().trim();
    if (t.length > 60 && !seen.has(t)) { seen.add(t); paras.push(t); }
  });
  return paras.join(' ');
}

// ── Rilevamento città ────────────────────────────────────
function detectCity(text) {
  const m = text.match(/^([A-ZÀÈÉÌÒÙ][A-ZÀÈÉÌÒÙa-zàèéìòù\s']{1,22}?)\s*(?:\([^)]{1,10}\))?\s*[-–]/);
  if (m) {
    const c = m[1].trim();
    if (c.length >= 3 && c.length <= 25 && !/\d/.test(c)) return c;
  }
  for (const city of CITIES) {
    try {
      if (new RegExp('\\b' + city.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b','i').test(text))
        return city;
    } catch{}
  }
  return null;
}

// ── Formattazione a 70 caratteri ────────────────────────
function wrapAt70(text) {
  const words = text.replace(/\s+/g,' ').trim().split(' ').filter(Boolean);
  const lines = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= 70) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

function formatItem(item, sourceLabel) {
  const title    = item.title    || '';
  const desc     = item.desc     || '';
  const fullText = item.fullText || '';

  const city = detectCity(title) || detectCity(desc);
  const cleanTitle = city ? title.replace(
    new RegExp('^' + city.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\s*(?:\\([^)]{1,10}\\))?\\s*[-–]\\s*','i'), ''
  ) : title;

  const prefix = city ? `[${city}] ` : '';
  let out = wrapAt70(prefix + cleanTitle);

  const rawBody = fullText.length > desc.length + 80 ? fullText : desc;
  const body = rawBody
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/\b(leggi tutto|leggi di più|read more|continua|vai all'articolo)[^.]*\.?/gi, '')
    .replace(/\s{2,}/g, ' ').trim();

  if (body.length > 20) {
    const t = title.toLowerCase().replace(/\s+/g,' ').trim();
    const b = body.toLowerCase().replace(/\s+/g,' ').trim();
    if (!b.startsWith(t.slice(0,40)) && b !== t) {
      out += '\n' + wrapAt70(body);
    }
  }

  const mode = fullText.length > desc.length + 80 ? ' · testo completo' : ' · solo sommario';
  out += '\n(fonte ' + sourceLabel + mode + ')';
  return out;
}

// ── Fetch categoria ──────────────────────────────────────
async function fetchCategory(feed) {
  for (const src of feed.sources) {
    try {
      process.stdout.write(dim(`    → ${src.label}... `));
      const xml   = await fetchUrl(src.url, 12000);
      const items = parseRss(xml).slice(0, feed.count);
      if (!items.length) throw new Error('nessun articolo');
      console.log(ok(`${items.length} articoli`));

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.link) continue;
        process.stdout.write(dim(`      art.${i+1} fetch pagina... `));
        try {
          const html = await fetchUrl(item.link, 14000);
          const ft   = extractArticleText(html);
          if (ft && ft.length > item.desc.length + 80) {
            item.fullText = ft;
            console.log(ok(`${ft.length} car.`));
          } else {
            console.log(dim('sommario RSS'));
          }
        } catch(e) {
          console.log(dim(`(${e.message})`));
        }
      }

      return { items, label: src.label };
    } catch(e) {
      console.log(err(e.message));
    }
  }
  return { items: [], label: 'n/d' };
}

// ── MAIN ─────────────────────────────────────────────────
async function main() {
  console.log(`\n${C.bold}${C.cyan}📰 Generatore Notizie TXT${C.reset}  —  Node.js\n`);

  const SEP      = '-'.repeat(70);
  const sections = [];
  let okCount = 0, failCount = 0;

  for (let i = 0; i < FEEDS.length; i++) {
    const f = FEEDS[i];
    console.log(`\n${C.bold}[${i+1}/${FEEDS.length}] ${f.cat}${C.reset}`);

    const { items, label } = await fetchCategory(f);

    if (!items.length) {
      console.log(err(`Nessuna fonte disponibile per ${f.cat}`));
      failCount++;
      continue;
    }

    okCount++;
    items.forEach(item => {
      sections.push(formatItem(item, label));
      sections.push(SEP);
    });
  }

  if (!sections.length) {
    console.error(`\n${C.red}Nessuna notizia recuperata. Controlla la connessione.${C.reset}`);
    process.exit(1);
  }

  const output   = sections.join('\n');
  const today    = new Date().toISOString().slice(0,10);
  const filename = `notizie_${today}.txt`;
  const filepath = path.join(process.cwd(), filename);

  fs.writeFileSync(filepath, output, 'utf-8');

  const newsCount = (output.match(new RegExp('-'.repeat(70), 'g')) || []).length;
  console.log(`\n${C.bold}${C.green}✅ Completato!${C.reset}`);
  console.log(`   Categorie: ${okCount} ok, ${failCount} errori`);
  console.log(`   Notizie:   ${newsCount}`);
  console.log(`   Righe:     ${output.split('\n').length}`);
  console.log(`   File:      ${C.cyan}${filepath}${C.reset}\n`);
}

main().catch(e => {
  console.error(`\n${C.red}Errore fatale:${C.reset}`, e.message);
  process.exit(1);
});
