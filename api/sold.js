const crypto = require('crypto');

const PIXEL_ID     = '1509793157199236';
const ACCESS_TOKEN = 'EAAboLfWoKjwBRWMPfZAZB6EeIDqu40mvegDz72o42ToqjUGx1uFVUOwHdiZBfw6mmWdbgRuhU8KnEFOLSDXWwxGdKKAD3oK0eNCQBcZAfMSG1SqywEWElUhhuC4fgBakgdXmwYB8ndWjF7oOYgJ045eLQqnDyoVGjvOSx1iVEsM4ypkckFev7zIhoPTDUZAu5tAZDZD';
const AMO_TOKEN    = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImM3YjMwYjVhYjE4NzkwMmEwNWY1MDliNmI3Yjg4NDUzZWRhZDM4MDU0YzlkYTIzYzEyNDkwYzU3ZDVhYmYwNzY2YTcxMjkyNDg4NTk1ODg0In0.eyJhdWQiOiI0M2M2OTU3My1kNDRmLTQ1MDQtOWZhOS00OGE3ZjliZWEwYTkiLCJqdGkiOiJjN2IzMGI1YWIxODc5MDJhMDVmNTA5YjZiN2I4ODQ1M2VkYWQzODA1NGM5ZGEyM2MxMjQ5MGM1N2Q1YWJmMDc2NmE3MTI5MjQ4ODU5NTg4NCIsImlhdCI6MTc3ODY3OTgzNSwibmJmIjoxNzc4Njc5ODM1LCJleHAiOjE5MzYzOTY4MDAsInN1YiI6IjEzNzk1Nzg2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMzMDQyNTU4LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJwdXNoX25vdGlmaWNhdGlvbnMiLCJmaWxlcyIsImNybSIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiNDBhZGFlMDgtMzM4YS00ZTY0LTk4NGMtMTU0ODM2MzMxZjhhIiwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.gafToZQXm5xPzsIjLHo0JILw0u9KnTzSEFKObmVOAPniEFv4EVSHPTiMowFal4S0AUW1E1_Iu0ztBMQjZ7UFysQca12mSAC1SgViL9MhpgD-PC9Og4tB5I1TV5ewvld1KaTVqyln32rmitJ87AOX-urr_ZZkCr351b4Ai8LRaDSww1XMU-m9AKKkUeVVWDy98Y3bf3P2Lkz4amAieMjWVr2FFTcFQIO0iWrhfFR6cBJHfH4l2hfjirPD59-dLxiGEdPd3Pm7FXoThoZMF_whOUDHp5Es_BDgm3qaeaL2mynRtHlio-37rdwIx2_-BstArEZMB9lVdbE-AEJojQw3aA';
const AMO_SUBDOMAIN  = 'qadiriyatscho';
const SOLD_STATUS_ID = 85616662;

function sha256(val) {
  return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
}

function cleanPhone(phone) {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('998')) return '+' + clean;
  if (clean.length === 9) return '+998' + clean;
  return '+' + clean;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const body = req.body;
    console.log('Webhook keldi:', JSON.stringify(body));

    let i = 0;
    while (body[`leads[status][${i}][id]`] !== undefined) {
      const leadId   = body[`leads[status][${i}][id]`];
      const statusId = parseInt(body[`leads[status][${i}][status_id]`]);

      console.log(`Lead ${leadId} → etap ${statusId}`);

      if (statusId === SOLD_STATUS_ID) {

        // amoCRM dan lead + contact ma'lumotlarini olish
        const leadRes = await fetch(
          `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/leads/${leadId}?with=contacts`,
          { headers: { 'Authorization': `Bearer ${AMO_TOKEN}` } }
        );
        const leadData = await leadRes.json();
        console.log('Lead data:', JSON.stringify(leadData));

        let phone = '';
        let firstName = '';

        // Contactdan telefon va ism olish
        const contacts = leadData?._embedded?.contacts || [];
        if (contacts.length > 0) {
          const contactId = contacts[0].id;
          const contactRes = await fetch(
            `https://${AMO_SUBDOMAIN}.amocrm.ru/api/v4/contacts/${contactId}`,
            { headers: { 'Authorization': `Bearer ${AMO_TOKEN}` } }
          );
          const contactData = await contactRes.json();
          firstName = (contactData.name || '').split(' ')[0].toLowerCase();

          const fields = contactData?.custom_fields_values || [];
          for (const field of fields) {
            if (field.field_code === 'PHONE' && field.values?.[0]?.value) {
              phone = cleanPhone(field.values[0].value);
              break;
            }
          }
        }

        console.log(`Contact: ${firstName}, ${phone}`);

        // Meta CAPI — Purchase
        const userData = { client_user_agent: 'amoCRM' };
        if (phone)     userData.ph = sha256(phone);
        if (firstName) userData.fn = sha256(firstName);

        const eventPayload = {
          data: [{
            event_name:       'Purchase',
            event_time:       Math.floor(Date.now() / 1000),
            action_source:    'crm',
            event_source_url: 'https://qadriyat-capi.vercel.app',
            event_id:         `sold_${leadId}_${Date.now()}`,
            user_data:        userData,
            custom_data: {
              value:    leadData?.price || 0,
              currency: 'UZS'
            }
          }]
        };

        const capiRes = await fetch(
          `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eventPayload) }
        );
        const capiData = await capiRes.json();
        console.log(`Lead ${leadId} — Purchase yuborildi:`, JSON.stringify(capiData));
      }

      i++;
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('sold.js xato:', err);
    return res.status(500).json({ error: err.message });
  }
};
