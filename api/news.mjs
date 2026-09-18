const categories = {
  frontier: {
    gdelt: '("artificial intelligence" OR robotics OR "quantum computing" OR semiconductor OR cybersecurity OR "developer tools")',
    hn: 'technology'
  },
  ai: {
    gdelt: '("artificial intelligence" OR "large language model" OR LLM OR "machine learning" OR "generative AI")',
    hn: 'AI'
  },
  security: {
    gdelt: '(cybersecurity OR ransomware OR "zero day" OR vulnerability OR encryption)',
    hn: 'security'
  },
  chips: {
    gdelt: '(semiconductor OR GPU OR chip OR NVIDIA OR AMD OR TSMC)',
    hn: 'semiconductor'
  },
  developer: {
    gdelt: '("developer tools" OR programming OR "open source" OR database OR cloud OR Kubernetes)',
    hn: 'developer'
  }
};

function normalizeDate(raw) {
  if (!raw) return new Date().toISOString();
  if (/^\d{14}$/.test(raw)) {
    return new Date(`${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}T${raw.slice(8,10)}:${raw.slice(10,12)}:${raw.slice(12,14)}Z`).toISOString();
  }
  const parsed = new Date(raw);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function hostname(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Source'; }
}

function dedupe(items, limit = 12) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.title || !item?.url) return false;
    const key = String(item.title).toLowerCase().replace(/\W+/g, ' ').trim().slice(0, 110);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

async function fetchGdelt(query) {
  const endpoint = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('mode', 'artlist');
  endpoint.searchParams.set('format', 'json');
  endpoint.searchParams.set('sort', 'datedesc');
  endpoint.searchParams.set('timespan', '48h');
  endpoint.searchParams.set('maxrecords', '40');

  const response = await fetch(endpoint, {
    headers: { 'User-Agent': 'JyotiradityaPortfolio/2.0' },
    signal: AbortSignal.timeout(11_000)
  });
  if (!response.ok) throw new Error(`GDELT HTTP ${response.status}`);
  const payload = await response.json();
  const raw = Array.isArray(payload?.articles) ? payload.articles : [];
  return dedupe(raw.map((article) => ({
    title: String(article?.title || ''),
    url: String(article?.url || ''),
    source: String(article?.domain || article?.source || hostname(article?.url || '')),
    publishedAt: normalizeDate(article?.seendate || article?.date),
    country: article?.sourcecountry ? String(article.sourcecountry) : undefined,
    language: article?.language ? String(article.language) : undefined
  })));
}

async function fetchHackerNews(query) {
  const endpoint = new URL('https://hn.algolia.com/api/v1/search_by_date');
  endpoint.searchParams.set('query', query);
  endpoint.searchParams.set('tags', 'story');
  endpoint.searchParams.set('hitsPerPage', '40');
  endpoint.searchParams.set('numericFilters', `created_at_i>${Math.floor(Date.now()/1000) - 60*60*72}`);

  const response = await fetch(endpoint, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`HN HTTP ${response.status}`);
  const payload = await response.json();
  const hits = Array.isArray(payload?.hits) ? payload.hits : [];
  return dedupe(hits.map((hit) => {
    const url = hit?.url || `https://news.ycombinator.com/item?id=${hit?.objectID || ''}`;
    return {
      title: String(hit?.title || hit?.story_title || ''),
      url: String(url),
      source: hostname(url),
      publishedAt: normalizeDate(hit?.created_at),
      country: 'Technology community',
      language: 'English'
    };
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const category = typeof req.query?.category === 'string' ? req.query.category : 'frontier';
  const config = categories[category] || categories.frontier;

  try {
    const items = await fetchGdelt(config.gdelt);
    if (items.length >= 4) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ items, provider: 'GDELT', degraded: false, updatedAt: new Date().toISOString() });
    }
    throw new Error('GDELT returned too few usable items');
  } catch (primaryError) {
    console.error('gdelt_error', primaryError);
    try {
      const items = await fetchHackerNews(config.hn);
      if (!items.length) throw new Error('Fallback returned no items');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
      return res.status(200).json({ items, provider: 'Hacker News / Algolia', degraded: true, updatedAt: new Date().toISOString() });
    } catch (fallbackError) {
      console.error('news_fallback_error', fallbackError);
      return res.status(503).json({ items: [], provider: 'Unavailable', error: 'Newswire unavailable' });
    }
  }
}
