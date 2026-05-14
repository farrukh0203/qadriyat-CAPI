const crypto = require('crypto');

const PIXEL_ID     = '1509793157199236';
const ACCESS_TOKEN = 'EAAboLfWoKjwBRWMPfZAZB6EeIDqu40mvegDz72o42ToqjUGx1uFVUOwHdiZBfw6mmWdbgRuhU8KnEFOLSDXWwxGdKKAD3oK0eNCQBcZAfMSG1SqywEWElUhhuC4fgBakgdXmwYB8ndWjF7oOYgJ045eLQqnDyoVGjvOSx1iVEsM4ypkckFev7zIhoPTDUZAu5tAZDZD';

const AMO_TOKEN    = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImM3YjMwYjVhYjE4NzkwMmEwNWY1MDliNmI3Yjg4NDUzZWRhZDM4MDU0YzlkYTIzYzEyNDkwYzU3ZDVhYmYwNzY2YTcxMjkyNDg4NTk1ODg0In0.eyJhdWQiOiI0M2M2OTU3My1kNDRmLTQ1MDQtOWZhOS00OGE3ZjliZWEwYTkiLCJqdGkiOiJjN2IzMGI1YWIxODc5MDJhMDVmNTA5YjZiN2I4ODQ1M2VkYWQzODA1NGM5ZGEyM2MxMjQ5MGM1N2Q1YWJmMDc2NmE3MTI5MjQ4ODU5NTg4NCIsImlhdCI6MTc3ODY3OTgzNSwibmJmIjoxNzc4Njc5ODM1LCJleHAiOjE5MzYzOTY4MDAsInN1YiI6IjEzNzk1Nzg2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzMDQyNTU4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiNDBhZGFlMDgtMzM4YS00ZTY0LTk4NGMtMTU0ODM2MzMxZjhhIiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.gafToZQXm5xPzsIjLHo0JILw0u9KnTzSEFKObmVOAPniEFv4EVSHPTiMowFal4S0AUW1E1_Iu0ztBMQjZ7UFysQca12mSAC1SgViL9MhpgD-PC9Og4tB5I1TV5ewvld1KaTVqyln32rmitJ87AOX-urr_ZZkCr351b4Ai8LRaDSww1XMU-m9AKKkUeVVWDy98Y3bf3P2Lkz4amAieMjWVr2FFTcFQIO0iWrhfFR6cBJHfH4l2hfjirPD59-dLxiGEdPd3Pm7FXoThoZMF_whOUDHp5Es_BDgm3qaeaL2mynRtHlio-37rdwIx2_-BstArEZMB9lVdbE-AEJojQw3aA';
const AMO_SUBDOMAIN = 'qadiriyatscho';
const AMO_PIPELINE  = 10882366;
const AMO_STAGE     = 85616786;

function sha256(value) {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function cleanPhone(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('998')) return '+' + clean;
  if (clean.length === 9) return '+998' + clean;
  return '+' + clean;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { name, phone, time, phone2, eventId, userAgent, sourceUrl } = req.body;
    if (!phone || !name) return res.status(400).json({ error: 'name va phone majburiy' });

    const cleanedPhone = cleanPhone(phone);
    const firstName    = name.trim().split(' ')[0].toLowerCase();

    // 1. Meta CAPI
    const capiPayload = {
      data: [{
        event_name:       'Lead',
        event_time:       Math.floor(Date.now() / 1000),
        action_source:    'website',
        event_source_url: sourceUrl || 'https://qadriyat-capi.vercel.app',
        event_id:         eventId || `lead_${Date.now()}`,
        test_event_code: 'TEST7400',
        user_data: {
          ph: sha256(cleanedPhone),
          fn: sha256(firstName),
          client_user_agent: userAgent || 'unknown',
        },
      }],
    };

    const capiRes = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capiPayload) }
    );
    const capiData = await capiRes.json();
    console.log('CAPI Lead yuborildi:', capiData);

    // 2. amoCRM — lead yaratish
    const leadName = `${name} — Nemis tili kursi`;
    const amoPayload = [{
      name:        leadName,
      pipeline_id: AMO_PIPELINE,
      status_id:   AMO_STAGE,
      tags: [{ name: 'Nemis tili by FR' }],
      _embedded: {
        contacts: [{
          name: name,
          custom_fields_values: [
            {
              field_code: 'PHONE',
              values: [{ value: cleanedPhone, enum_code: 'WORK' }]
            },
            {
              field_id: 804445,
              values: [{ value: time || '' }]
            }
          ]
        }]
      },

    }];

    const amoRes = await fetch(
      `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/complex`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AMO_TOKEN}`
        },
        body: JSON.stringify(amoPayload)
      }
    );
    const amoData = await amoRes.json();
    console.log('amoCRM lead:', JSON.stringify(amoData));

    // 3. Tag qo'shish — alohida so'rov
    if (amoData && amoData[0] && amoData[0].id) {
      const leadId = amoData[0].id;
      const tagRes = await fetch(
        `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AMO_TOKEN}`
          },
          body: JSON.stringify([{
            id: leadId,
            _embedded: {
              tags: [{ name: 'Nemis tili by FR' }]
            }
          }])
        }
      );
      const tagData = await tagRes.json();
      console.log('Tag qo\'shildi:', JSON.stringify(tagData));
    }

    return res.status(200).json({ success: true, capi: capiData, amo: amoData });

  } catch (err) {
    console.error('Xato:', err);
    return res.status(500).json({ error: err.message });
  }
};
