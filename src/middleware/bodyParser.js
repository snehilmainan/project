/**
 * Request body parser and response helper middleware
 */

export function sendJson(res, statusCode, data, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    ...headers
  });
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, message, details = null) {
  const payload = {
    error: {
      status: statusCode,
      message,
      ...(details ? { details } : {})
    }
  };
  sendJson(res, statusCode, payload);
}

export function readJsonBody(req, maxSize = 1_048_576) { // Default 1MB limit
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > maxSize) {
        req.destroy();
        const err = new Error('Payload too large: request exceeds 1MB limit');
        err.statusCode = 413;
        reject(err);
      }
    });

    req.on('end', () => {
      if (!raw || !raw.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        const error = new Error('Invalid JSON format in request body');
        error.statusCode = 400;
        reject(error);
      }
    });

    req.on('error', err => {
      err.statusCode = 400;
      reject(err);
    });
  });
}
