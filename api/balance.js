const TESTNET_BASE = 'https://testnet.binance.vision';

async function hmacSHA256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { action, symbol, side, quantity } = req.query;
  const API_KEY = process.env.BINANCE_API_KEY;
  const API_SECRET = process.env.BINANCE_SECRET_KEY;
  if (!API_KEY || !API_SECRET) return res.status(500).json({ error: 'API Keys غير موجودة' });
  try {
    const timestamp = Date.now();
    const recvWindow = 10000;
    if (action === 'balance') {
      const query = `timestamp=${timestamp}&recvWindow=${recvWindow}`;
      const sig = await hmacSHA256(API_SECRET, query);
      const response = await fetch(`${TESTNET_BASE}/api/v3/account?${query}&signature=${sig}`, { headers: { 'X-MBX-APIKEY': API_KEY } });
      const data = await response.json();
      if (data.code) return res.status(400).json({ error: data.msg });
      return res.status(200).json({ balances: data.balances });
    } else if (action === 'order') {
      const query = `symbol=${symbol}&side=${side}&type=MARKET&quantity=${quantity}&timestamp=${timestamp}&recvWindow=${recvWindow}`;
      const sig = await hmacSHA256(API_SECRET, query);
      const response = await fetch(`${TESTNET_BASE}/api/v3/order`, { method: 'POST', headers: { 'X-MBX-APIKEY': API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: `${query}&signature=${sig}` });
      const order = await response.json();
      if (order.code) return res.status(400).json({ error: order.msg });
      return res.status(200).json({ order });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
                                            }
