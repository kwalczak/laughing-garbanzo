

const username = process.env.FROST_CLIENT_ID;
const password = process.env.FROST_CLIENT_SECRET;

const apiUrl = 'https://frost.met.no/sources/v0.jsonld?validtime=2025-01-01/now';
const cors = require('cors');


const express = require('express');
const fetch = require('node-fetch'); // version 2
const moment = require('moment');
const app = express();
const port = 3001;
app.use(cors({
  origin: 'https://laughing-garbanzo-web.onrender.com'  // 👈 allow your frontend
}));
const auth = Buffer.from(`${username}:${password}`).toString('base64');

app.get('/stations', async (req, res) => {
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Frost API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (err) {
    console.error('Error fetching from Frost:', err.message);
    res.status(500).json({ error: 'Failed to fetch Frost data' });
  }
});


// Available time series for a station
app.get('/available-timeseries', async (req, res) => {
  const sourceId = req.query.source;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const elements = req.query.elements; // optional

  let apiUrl = `https://frost.met.no/observations/availableTimeSeries/v0.jsonld?sources=${encodeURIComponent(sourceId)}`;
  if (elements) {
    apiUrl += `&elements=${encodeURIComponent(elements)}`;
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Frost API responded with status ${response.status}`);
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(data);
  } catch (err) {
    console.error('Error fetching available time series:', err);
    res.status(500).json({ error: 'Failed to fetch available time series' });
  }
});

// Query real observations from full URI
app.get('/observations-by-uri', async (req, res) => {
  const encodedUri = req.query.uri;
  if (!encodedUri) {
    console.log('❌ Missing URI parameter');
    return res.status(400).json({ error: 'Missing URI param' });
  }

  try {
    const decodedUri = decodeURIComponent(encodedUri);
    const now = moment().utc();
    const to = now.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
    const from = now.subtract(5, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

    const updatedUri = decodedUri.replace(/referencetime=[^&]+/, `referencetime=${from}/${to}`);

    // 🔍 Log the full API request
    console.log('\n🔄 Fetching observation values:');
    console.log('📎 Original URI:', decodedUri);
    console.log('📆 Updated URI:', updatedUri);

    const response = await fetch(updatedUri, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    // 🔍 Log status + partial body
    console.log('📡 Response status:', response.status);

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      console.log('✅ JSON keys:', Object.keys(json));
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.json(json);
    } catch (jsonErr) {
      console.error('❌ Failed to parse JSON from response');
      console.error('📝 Raw body:', text);
      res.status(500).json({ error: 'Failed to parse JSON' });
    }
  } catch (err) {
    console.error('❌ Error fetching observation by URI:', err.message);
    res.status(500).json({ error: 'Failed to fetch observation values' });
  }
});

app.listen(port, () => {
  console.log(`✅ Frost proxy running at http://localhost:${port}`);
});