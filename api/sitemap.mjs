import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://apfazzoguhjstuysurco.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'SUPABASE_ANON_KEY';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: products, error } = await supabase
      .from('products')
      .select('id, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const baseUrl = 'https://duty-free-shop.vercel.app';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

    if (products) {
      products.forEach(p => {
        xml += `  <url>\n    <loc>${baseUrl}/?product=${p.id}</loc>\n    <lastmod>${new Date(p.created_at || Date.now()).toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
      });
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(xml);
  } catch (err) {
    return res.status(500).send('Error generating sitemap');
  }
}
