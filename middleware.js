// ============================================================
// DFS - Duty Free Shop — Vercel Routing Middleware
// ------------------------------------------------------------
// This file must sit at the ROOT of your project (same level as
// index.html), named exactly:  middleware.js
// (Vercel's Routing Middleware only accepts a .js or .ts entrypoint —
//  .mjs is NOT supported, which is why the previous version 404'd.
//  Because this is a plain static site with no package.json, you also
//  need the small package.json included alongside this file so Vercel
//  treats "type": "module" and understands the import/export syntax below.)
//
// What it does:
// 1. When someone opens "/?product=123", it fetches that product
//    from Supabase and rewrites the page's <title>, meta description,
//    Open Graph / Twitter tags, and adds Product schema.org JSON-LD —
//    so Google and WhatsApp/Facebook link previews show the actual
//    product name, price, and photo instead of the generic homepage
//    title for every single product.
// 2. When someone opens "/?cat=Electronics" (or any other category),
//    it does the same thing for that category — a real, indexable
//    landing page like "Electronics for Sale in Pakistan | DFS" instead
//    of everything sharing the one generic homepage title.
// 3. When someone (or Google) requests "/sitemap.xml", it generates
//    a fresh sitemap listing the homepage, every category, and every
//    live product, straight from Supabase — no need to hand-maintain
//    a static file.
//
// For every other URL, it does nothing and your site loads exactly
// as it did before — zero risk to existing functionality.
//
// Deploy: add this file plus the accompanying package.json to your
// GitHub repo / Vercel project root and push. No other configuration
// needed.
// ============================================================

export const config = {
  matcher: ['/', '/sitemap.xml'],
};

const SUPABASE_URL = 'https://apfazzoguhjstuysurco.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_T1tzYCeVSyY_E3iDGSkeBg_Ql6JlSPz';
const SITE_URL = 'https://dfspk.com';

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function escapeXml(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status}`);
  return res.json();
}

async function handleSitemap() {
  let products = [];
  try {
    products = await supabaseGet('products?select=id,name&custom=eq.true&order=id.desc&limit=5000');
  } catch (e) {
    console.error('Sitemap: failed to load products:', e);
  }

  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: '1.0' },
  ];

  const categoryUrls = CATEGORIES.map((c) => ({
    loc: `${SITE_URL}/?cat=${encodeURIComponent(c)}`,
    priority: '0.7',
  }));

  const productUrls = (products || []).map((p) => ({
    loc: `${SITE_URL}/?product=${p.id}`,
    priority: '0.8',
  }));

  const urls = [...staticUrls, ...categoryUrls, ...productUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n    <priority>${u.priority}</priority>\n  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600', // re-generate at most once an hour
    },
  });
}

// Top-level categories — must match the `categoryStructure` keys in index.html exactly,
// since these are what ?cat= will contain.
const CATEGORIES = [
  'Electronics', 'Fashion', 'Home', 'Vehicles', 'Beauty', 'Sports & Books',
  'Property', 'Jobs', 'Services', 'Pets', 'Kids & Baby',
  'Business & Industrial', 'Grocery', 'Handmade', 'Other',
];

async function handleCategoryMeta(request, catName) {
  let count = null;
  try {
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/products?cat=eq.${encodeURIComponent(catName)}&custom=eq.true&select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Prefer: 'count=exact',
        },
      }
    );
    const contentRange = countRes.headers.get('content-range'); // e.g. "0-19/143"
    if (contentRange && contentRange.includes('/')) {
      count = contentRange.split('/')[1];
    }
  } catch (e) {
    console.error('Category meta: count lookup failed:', e);
  }

  const origin = await fetch(new URL('/', request.url));
  let html = await origin.text();

  const countText = count ? `${count}+ ads` : 'Ads';
  const title = `${escapeHtml(catName)} for Sale in Pakistan (${countText}) | DFS Duty Free Shop`;
  const description = `Browse ${escapeHtml(catName)} ads across Pakistan on DFS - Duty Free Shop. Buy or sell directly — contact sellers instantly via Call or WhatsApp, no middleman.`;
  const pageUrl = `${SITE_URL}/?cat=${encodeURIComponent(catName)}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: pageUrl,
  };

  const injected = `
<title>${title}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
`;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  html = html.replace('</head>', `${injected}</head>`);

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}


  let product = null;
  try {
    const rows = await supabaseGet(
      `products?id=eq.${encodeURIComponent(productId)}&select=id,name,desc,price,image,cat`
    );
    product = Array.isArray(rows) ? rows[0] : null;
  } catch (e) {
    console.error('Product meta: Supabase lookup failed:', e);
  }

  // Unknown / removed product, or Supabase hiccup -> just let the normal SPA load.
  if (!product) return undefined;

  const origin = await fetch(new URL('/', request.url));
  let html = await origin.text();

  const priceText = Number(product.price || 0).toLocaleString();
  const title = `${escapeHtml(product.name)} — Rs ${priceText} | DFS Duty Free Shop`;
  const description = escapeHtml((product.desc || '').slice(0, 155)) || 'DFS - Duty Free Shop par ye product dekhein.';
  const image = product.image || `${SITE_URL}/icon-512.png`;
  const pageUrl = `${SITE_URL}/?product=${product.id}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.desc || undefined,
    image,
    category: product.cat || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: product.price,
      availability: 'https://schema.org/InStock',
      url: pageUrl,
    },
  };

  const injected = `
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="product">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${pageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
`;

  // Drop the default <title> so we don't end up with two, then inject ours + tags before </head>.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
  html = html.replace('</head>', `${injected}</head>`);

  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.pathname === '/sitemap.xml') {
    return handleSitemap();
  }

  const productId = url.searchParams.get('product');
  if (productId) {
    try {
      const response = await handleProductMeta(request, productId);
      return response; // undefined here also falls through to the normal static file
    } catch (e) {
      console.error('Product meta middleware failed, falling back to normal page:', e);
      return undefined;
    }
  }

  const catParam = url.searchParams.get('cat');
  if (catParam && CATEGORIES.includes(catParam)) {
    try {
      return await handleCategoryMeta(request, catParam);
    } catch (e) {
      console.error('Category meta middleware failed, falling back to normal page:', e);
      return undefined;
    }
  }

  return undefined; // plain homepage visit -> serve index.html as-is
}
