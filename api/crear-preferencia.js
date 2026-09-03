const { MercadoPagoConfig, Preference } = require('mercadopago');

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('ERROR: ACCESS_TOKEN no definido. Configura la variable de entorno con tu token de producción de Mercado Pago.');
  throw new Error('ACCESS_TOKEN no definido');
}

const client = new MercadoPagoConfig({
  accessToken: ACCESS_TOKEN.trim()
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const origin = req.headers.origin || 'https://delicias-campeche.vercel.app';

    const body = {
      items: items.map(item => ({
        title: String(item.title).substring(0, 250),
        quantity: parseInt(item.quantity, 10),
        unit_price: parseFloat(item.unit_price),
        currency_id: 'MXN'
      })),
      back_urls: {
        success: `${origin}/index.html?status=success`,
        failure: `${origin}/index.html?status=failure`,
        pending: `${origin}/index.html?status=pending`
      },
      auto_return: 'approved',
      statement_descriptor: 'DELICIAS CAMP',
      external_reference: 'dc_' + Date.now()
    };

    const preference = new Preference(client);
    const result = await preference.create({ body });

    return res.status(200).json({ id: result.id });
  } catch (error) {
    console.error('Error en API crear-preferencia:', error);
    return res.status(error.status || 500).json({
      error: 'Error de Mercado Pago',
      message: error.message || 'No se pudo crear la preferencia'
    });
  }
};
