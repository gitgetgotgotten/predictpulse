const cors = require('micro-cors')({
  allowMethods: ['GET', 'OPTIONS'],
  origin: '*'
});

function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  return res.status(200).json({status: 'Server is running'});
}

module.exports = cors(handler);
