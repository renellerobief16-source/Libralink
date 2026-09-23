const express = require('express');

const router = express.Router();

// Handle standard Leaflet tile format :z/:x/:y
router.get('/:z/:x/:y', async (req, res) => {
  const { z, x, y } = req.params;
  const isTileCoordinate = (value) => /^\d+$/.test(value);

  if (![z, x, y].every(isTileCoordinate)) {
    return res.status(400).send('Invalid tile coordinates');
  }

  const style = req.query.style || 'voyager';
  const subdomains = ['a', 'b', 'c', 'd'];
  const s = subdomains[(Number(x) + Number(y)) % subdomains.length];

  const tileUrl = style === 'osm'
    ? `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
    : `https://${s}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(tileUrl, {
      headers: {
        'User-Agent': 'Libralink/1.0 (Consortium Library Map Tile Proxy; admin@libralink.edu)',
        Accept: 'image/png,image/*,*/*',
      },
    });

    if (!response.ok) {
      // Fallback to OSM if Voyager had an issue
      if (style !== 'osm') {
        const osmFallback = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
          headers: { 'User-Agent': 'Libralink/1.0', Accept: 'image/png,image/*' },
        });
        if (osmFallback.ok) {
          const fallbackImg = Buffer.from(await osmFallback.arrayBuffer());
          res.set('Content-Type', osmFallback.headers.get('content-type') || 'image/png');
          res.set('Cache-Control', 'public, max-age=86400');
          return res.send(fallbackImg);
        }
      }
      return res.status(response.status).send('Map tile unavailable');
    }

    const image = Buffer.from(await response.arrayBuffer());
    res.set('Content-Type', response.headers.get('content-type') || 'image/png');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(image);
  } catch (error) {
    console.error('Map tile proxy error:', error.message);
    return res.status(502).send('Unable to load map tile');
  }
});


module.exports = router;
