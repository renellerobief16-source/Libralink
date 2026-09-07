const express = require('express');

const router = express.Router();

router.get('/:z/:y/:x', async (req, res) => {
  const { z, y, x } = req.params;
  const isTileCoordinate = (value) => /^\d+$/.test(value);

  if (![z, y, x].every(isTileCoordinate)) {
    return res.status(400).send('Invalid tile coordinates');
  }

  try {
    const response = await fetch(
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
      {
        headers: {
          'User-Agent': 'Libralink/1.0 map tile proxy',
          Accept: 'image/png,image/*',
        },
      },
    );

    if (!response.ok) {
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
