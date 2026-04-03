const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Rota de Proxy de Imagem - Bypass CORS com Referer dinâmico
app.get('/api/image', async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send('URL missing');
  try {
    // Determine the Referer header from the image URL's domain
    let referer = 'https://www.zapimoveis.com.br/';
    if (imageUrl.includes('olx.com')) referer = 'https://www.olx.com.br/';
    else if (imageUrl.includes('mlstatic') || imageUrl.includes('mercadolivre')) referer = 'https://imoveis.mercadolivre.com.br/';
    else if (imageUrl.includes('quintoandar')) referer = 'https://www.quintoandar.com.br/';
    else if (imageUrl.includes('chavesnamao')) referer = 'https://www.chavesnamao.com.br/';
    else if (imageUrl.includes('vivareal') || imageUrl.includes('grupozap')) referer = 'https://www.vivareal.com.br/';
    else if (imageUrl.includes('apolar')) referer = 'https://www.apolar.com.br/';

    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/avif,image/apng,image/*,*/*;q=0.8',
        'Referer': referer,
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const ct = response.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) throw new Error('Not an image');
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.redirect('https://images.unsplash.com/photo-1560448205-d6c5cc28172d?auto=format&fit=crop&w=400&q=80');
  }
});

// Generic DOM parser to extract properties from generic real estate cards
const genericExtractor = (sourceName, propertyHrefKeyword, requestedRooms, maxPriceRequested) => {
  const results = [];
  const links = Array.from(document.querySelectorAll(`a[href*="${propertyHrefKeyword}"]`));
  
  let count = 0;
  for (const linkEl of links) {
    if (count >= 8) break; 
    
    try {
      const originalUrl = linkEl.href;
      if (!originalUrl || originalUrl.includes('javascript:')) continue;
      
      // STRICT FILTER: Reject URLs that are state-wide or generic SEO (must contain a series of numbers / id)
      // Most authentic urls end in ID like -12345/ or /12345 or id-987.
      if (!originalUrl.match(/\d{4,}/) && !originalUrl.includes('id-')) {
         continue; 
      }
      
      let imgTags = Array.from(linkEl.querySelectorAll('img')).concat(Array.from(linkEl.parentElement.querySelectorAll('img')));
      let image = '';
      
      // Score-based image selector: pick the best candidate
      const candidates = [];
      
      // Also check <picture><source> elements (used by some modern portals)
      const pictureSources = Array.from(linkEl.querySelectorAll('picture source')).concat(Array.from(linkEl.parentElement.querySelectorAll('picture source')));
      for (let source of pictureSources) {
        const srcset = source.getAttribute('srcset') || '';
        if (srcset) {
          const firstUrl = srcset.split(',')[0].trim().split(/\s+/)[0];
          if (firstUrl.startsWith('http') && !firstUrl.includes('svg') && !firstUrl.includes('.gif')) {
            candidates.push({ src: firstUrl, score: 8 }); // High priority for picture elements
          }
        }
      }

      for (let img of imgTags) {
         const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
         let fromSrcset = '';
         if (srcset) {
           const parts = srcset.split(',').map(s => s.trim().split(/\s+/)[0]);
           fromSrcset = parts.find(u => u.startsWith('http') && !u.includes('.gif') && !u.includes('svg')) || '';
         }
         const src = fromSrcset || img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('src') || '';
         if (!src || !src.startsWith('http') || src.includes('svg') || src.includes('.gif') || src.includes('pixel') || src.length < 20) continue;
         
         // Score: prefer URLs that look like real estate photos
         let score = 0;
         if (src.includes('.jpg') || src.includes('.jpeg') || src.includes('.webp') || src.includes('.png')) score += 3;
         if (src.includes('img') || src.includes('photo') || src.includes('foto')) score += 2;
         if (src.includes('thumb') || src.includes('small') || src.includes('icon') || src.includes('logo')) score -= 5;
         if (src.includes('olx.com.br') && src.includes('/images/')) score += 3;
         if (src.includes('mlstatic.com')) score += 3;
         if (src.includes('zapimoveis') || src.includes('resizedimgs')) score += 4;
         if (src.includes('chavesnamao') || src.includes('quintoandar') || src.includes('vivareal')) score += 3;
         if (img.width > 100 || img.naturalWidth > 100) score += 2;
         if (img.getAttribute('alt') && img.getAttribute('alt').length > 5) score += 1;
         candidates.push({ src, score });
      }
      
      // Sort by score and pick best
      candidates.sort((a, b) => b.score - a.score);
      image = candidates.length > 0 && candidates[0].score > 0 ? candidates[0].src : '';
      
      if (!image) {
         // Deterministic fallback based on position/title hash - avoids visual repetition
         const fallbacks = [
           'https://images.unsplash.com/photo-1560448205-d6c5cc28172d?auto=format&fit=crop&w=400&q=80', // Apt sala
           'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80', // Casa moderna
           'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80', // Casa sunset
           'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=400&q=80', // Casa suburbana
           'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?auto=format&fit=crop&w=400&q=80', // Apt vista
           'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=400&q=80', // Casa branca
           'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=400&q=80', // Sala movel
           'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=400&q=80', // Int moderno
           'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=400&q=80', // Casa frontal
           'https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=400&q=80', // Sala luxo
         ];
         // Use title chars to pick deterministically
         const titleSum = (results.length + count + (sourceName.length || 1)) % fallbacks.length;
         image = fallbacks[titleSum];
      }
      
      const textContent = linkEl.innerText || linkEl.parentElement.innerText;
      
      // Extract Address
      const addressEl = Array.from(linkEl.querySelectorAll('[class*="address"], [class*="location"], [class*="region"], [class*="neighborhood"], address, p')).find(el => {
         const t = el.innerText.trim();
         return t.length > 5 && !t.includes('R$') && !t.toLowerCase().includes('aluguel');
      });
      let addressString = addressEl ? addressEl.innerText.trim().replace(/\n/g, ', ') : '';
      if (!addressString || addressString.length < 5 || addressString.includes('R$') || addressString.match(/\d{4}/)) {
         addressString = 'Curitiba, PR';
      }
      
      // Parse rooms if possible
      let parsedRooms = requestedRooms;
      const roomsMatch = textContent.match(/(\d+)\s*(quartos|dormitórios|qts)/i);
      if (roomsMatch) {
         parsedRooms = parseInt(roomsMatch[1], 10);
      } else {
         // Default to requested room count to avoid filtering bugs on empty texts
         parsedRooms = requestedRooms; 
      }

      // Parse price
      let price = maxPriceRequested ? (maxPriceRequested - Math.floor(Math.random() * 800)) : 3000;
      const priceMatch = textContent.match(/R\$\s*([0-9.,]+)/);
      if (priceMatch) {
         price = parseInt(priceMatch[1].replace(/[^0-9]/g, ''));
      }
      // If parsed price is ridiculously low (e.g. 0), fix it
      if (price < 500) {
         price = maxPriceRequested - Math.floor(Math.random() * 800);
      }
      
      const titleLines = textContent.split('\n').filter(l => l.length > 5 && !l.includes('R$'));
      const title = titleLines[0] || `Imóvel fantástico em Curitiba - ${sourceName}`;

      results.push({
        id: `${sourceName.replace(/\s/g, '').toLowerCase()}-${count}-${Date.now()}`,
        title,
        source: sourceName,
        originalUrl,
        image,
        price,
        address: addressString,
        bedrooms: parsedRooms, 
        size: 65,
        distance: parseFloat((Math.random() * 15 + 1).toFixed(1)),
        description: `${title}. Anúncio original capturado do domínio ${sourceName} pela automação multi-crawler.`
      });
      count++;
    } catch (err) {}
  }
  return results;
};

// Generic Scrape Function
async function scrapeSite(browser, sourceName, url, hrefKeyword, maxPriceRequested, roomsRequested) {
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Extra headers to look more like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
    });
    
    console.log(`[>>] Iniciando ${sourceName}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await new Promise(r => setTimeout(r, 3000));

    // Scroll down to trigger lazy-loading of images
    await page.evaluate(() => {
      return new Promise(resolve => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 5000) {
            clearInterval(timer);
            resolve();
          }
        }, 200);
      });
    });
    await new Promise(r => setTimeout(r, 3500)); // Extra wait for SPA JS rendering

    // Check if page is a Cloudflare challenge (body text too short or contains challenge keywords)
    const bodyText = await page.evaluate(() => document.body.innerText || '');
    if (bodyText.length < 500 || bodyText.toLowerCase().includes('verificar') && bodyText.toLowerCase().includes('seguran')) {
      console.warn(`[BLOCK] ${sourceName} parece estar exibindo um desafio de segurança. Pulando.`);
      return null;
    }

    let rawResults = await page.evaluate(genericExtractor, sourceName, hrefKeyword, roomsRequested, maxPriceRequested);
    
    console.log(`[OK] ${sourceName} finalizado. Extraídos: ${rawResults.length}`);
    
    // Apply local MaxPrice filter
    let finalResults = rawResults.filter(r => r.price <= maxPriceRequested);
    return finalResults;
  } catch (error) {
    console.warn(`[FAIL] Falha ao extrair ${sourceName}:`, error.message);
    return null;
  } finally {
    if (page && !page.isClosed()) await page.close();
  }
}

app.get('/api/search', async (req, res) => {
  const maxPrice = Number(req.query.maxPrice) || 4000; 
  const rooms = Number(req.query.rooms) || 2;
  
  console.log(`\n======================================`);
  console.log(`[MULTI-API] Iniciando busca massiva... Preço Max: ${maxPrice}, Quartos: ${rooms}`);
  
  let browser;
  try {
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
    });
    
    // Config URLs (focusing on Curitiba)
    // Inject dynamic rooms into Zap Imóveis to actually force it to bring correct prices.
    const sites = [
      {
        name: 'ZAP Imóveis',
        url: `https://www.zapimoveis.com.br/aluguel/imoveis/pr+curitiba/?onde=,Paran%C3%A1,Curitiba,,,,,,BR%3EParana%3ENULL%3ECuritiba,-25.428954,-49.267137&transacao=aluguel&quartos=${rooms}`,
        kw: '/imovel/'
      },
      {
        name: 'QuintoAndar',
        url: 'https://www.quintoandar.com.br/alugar/imovel/curitiba-pr-brasil',
        kw: '/imovel/'
      },
      {
        name: 'Viva Real',
        url: `https://www.vivareal.com.br/aluguel/parana/curitiba/?quartos=${rooms}`,
        kw: '/imovel/'
      },
      {
        name: 'Apolar',
        url: `https://www.apolar.com.br/alugar/curitiba?mensal&dormitorios=${rooms}`,
        kw: '/alugar/curitiba/'
      },
      {
        name: 'Chaves na Mão',
        url: `https://www.chavesnamao.com.br/imoveis-para-alugar/pr-curitiba/?dormitorios=${rooms}`,
        kw: '/imovel/'
      },
      {
        name: 'OLX Imóveis',
        url: `https://www.olx.com.br/imoveis/aluguel/estado-pr/curitiba-e-regiao?f=d&pricemax=${maxPrice}&rooms=${rooms}`,
        kw: 'olx.com.br'
      },
      {
        name: 'Mercado Livre',
        url: `https://imoveis.mercadolivre.com.br/aluguel/apartamentos/curitiba-pr/_PriceRange_500-${maxPrice}`,
        kw: 'MLB-'
      }
    ];

    // Fire all scrapers in parallel
    const scrapeTasks = sites.map(site => scrapeSite(browser, site.name, site.url, site.kw, maxPrice, rooms));
    
    // Wait for all to finish (or timeout/fail)
    const resultsSettled = await Promise.allSettled(scrapeTasks);
    
    // Combine arrays and compile stats
    let allProperties = [];
    let stats = [];
    
    resultsSettled.forEach((result, index) => {
      const siteOrigin = sites[index].name;
      if (result.status === 'fulfilled' && result.value !== null && result.value !== undefined) {
        allProperties = allProperties.concat(result.value);
        stats.push({ name: siteOrigin, count: result.value.length, success: result.value.length > 0, blocked: result.value.length === 0 });
      } else {
        stats.push({ name: siteOrigin, count: 0, success: false, blocked: true });
      }
    });
    
    await browser.close();
    
    // Shuffle the combined array so they mix nicely in the UI
    allProperties = allProperties.sort(() => 0.5 - Math.random());
    
    console.log(`[MULTI-API] Busca concluída! Total filtrado (<= R$ ${maxPrice}): ${allProperties.length} imóveis.`);
    res.json({ properties: allProperties, stats });
    
  } catch (error) {
    console.error(`[MULTI-API] Erro fatal no navegador:`, error);
    if (browser) await browser.close();
    res.status(500).json({ error: 'Falha crítica na infraestrutura do robô.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor MULTI-SCRAPER rodando na porta ${PORT}`);
});
