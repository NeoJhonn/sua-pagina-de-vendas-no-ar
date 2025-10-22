import fs from 'fs/promises';
import path from 'path';


const baseUrl = 'https://sua-pagina-de-vendas-no-ar.vercel.app/';

const urls = [
  `<url><loc>${baseUrl}</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>`,
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

await fs.writeFile(new URL('../sitemap.xml', import.meta.url), sitemap);

console.log('✅ sitemap.xml generated!');
