const PIXEL_ID     = '1509793157199236';
const ACCESS_TOKEN = 'EAAboLfWoKjwBRWMPfZAZB6EeIDqu40mvegDz72o42ToqjUGx1uFVUOwHdiZBfw6mmWdbgRuhU8KnEFOLSDXWwxGdKKAD3oK0eNCQBcZAfMSG1SqywEWElUhhuC4fgBakgdXmwYB8ndWjF7oOYgJ045eLQqnDyoVGjvOSx1iVEsM4ypkckFev7zIhoPTDUZAu5tAZDZD';

// Sotildi etap ID si
const SOLD_STATUS_ID = 85616662;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body;
    console.log('Webhook keldi:', JSON.stringify(body));

    // amoCRM webhook strukturasi
    const leads = body?.leads?.status || [];

    for (const lead of leads) {
      const statusId = parseInt(lead.status_id);
      console.log(`Lead ${lead.id} → etap ${statusId}`);

      // Faqat sotildi etapiga o'tganda
      if (statusId === SOLD_STATUS_ID) {
        const eventPayload = {
          data: [{
            event_name:       'Purchase',
            event_time:       Math.floor(Date.now() / 1000),
            action_source:    'crm',
            event_source_url: 'https://qadriyat-capi.vercel.app',
            event_id:         `sold_${lead.id}_${Date.now()}`,
            user_data: {
              client_user_agent: 'amoCRM'
            },
            custom_data: {
              lead_id:   lead.id,
              lead_name: lead.name || '',
              value:     lead.price || 0,
              currency:  'UZS'
            }
          }]
        };

        const capiRes = await fetch(
          `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(eventPayload)
          }
        );
        const capiData = await capiRes.json();
        console.log(`Lead ${lead.id} — Purchase yuborildi:`, JSON.stringify(capiData));
      }
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('sold.js xato:', err);
    return res.status(500).json({ error: err.message });
  }
};
