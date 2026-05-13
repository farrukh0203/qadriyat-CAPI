const crypto = require('crypto');

const PIXEL_ID     = '1509793157199236';
const ACCESS_TOKEN = 'EAAboLfWoKjwBRWMPfZAZB6EeIDqu40mvegDz72o42ToqjUGx1uFVUOwHdiZBfw6mmWdbgRuhU8KnEFOLSDXWwxGdKKAD3oK0eNCQBcZAfMSG1SqywEWElUhhuC4fgBakgdXmwYB8ndWjF7oOYgJ045eLQqnDyoVGjvOSx1iVEsM4ypkckFev7zIhoPTDUZAu5tAZDZD';

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

// Telefon raqamni tozalash: faqat raqamlar, +998 prefixi bilan
function cleanPhone(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('998')) clean = '+' + clean;
  else if (clean.startsWith('8') && clean.length === 9) clean = '+998' + clean;
  else if (!clean.startsWith('+')) clean = '+998' + clean;
  return clean;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, time, phone2, userAgent, sourceUrl } = req.body;

    if (!phone || !name) {
      return res.status(400).json({ error: 'name va phone majburiy' });
    }

    const cleanedPhone = cleanPhone(phone);
    const firstName    = name.trim().split(' ')[0].toLowerCase();

    // Meta CAPI payload
    const payload = {
      data: [
        {
          event_name:       'Lead',
          event_time:       Math.floor(Date.now() / 1000),
          action_source:    'website',
          event_source_url: sourceUrl || 'https://qadriyat.vercel.app',
          event_id:         `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          user_data: {
            ph: sha256(cleanedPhone),
            fn: sha256(firstName),
            client_user_agent: userAgent || 'unknown',
          },
          custom_data: {
            preferred_time: time || '',
            phone2: phone2 || '',
          },
        },
      ],
    };

    const url = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI xato:', result);
      return res.status(500).json({ error: 'Meta CAPI xato', detail: result });
    }

    console.log('CAPI Lead yuborildi:', result);
    return res.status(200).json({ success: true, meta: result });

  } catch (err) {
    console.error('Server xato:', err);
    return res.status(500).json({ error: err.message });
  }
};
