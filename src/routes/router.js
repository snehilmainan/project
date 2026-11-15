import { featureController } from '../controllers/featureController.js';
import { serveStaticFile } from '../middleware/staticServer.js';
import { sendError } from '../middleware/bodyParser.js';

export async function handleRequest(req, res) {
  // Global CORS preflight handler
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key, X-Voter-Id'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method;

  // --- API ROUTES ---

  // GET /api/features/stats
  if (pathname === '/api/features/stats' && method === 'GET') {
    return featureController.getStats(req, res);
  }

  // GET /api/features (list + query filters)
  if (pathname === '/api/features' && method === 'GET') {
    return featureController.listFeatures(req, res, url);
  }

  // POST /api/features (create)
  if (pathname === '/api/features' && method === 'POST') {
    return featureController.createFeature(req, res);
  }

  // Item-specific routes: /api/features/:id[...]
  const itemMatch = pathname.match(/^\/api\/features\/([^/]+)(?:\/(status|upvote|comments))?$/);
  if (itemMatch) {
    const id = decodeURIComponent(itemMatch[1]);
    const subAction = itemMatch[2]; // status, upvote, comments or undefined

    // POST /api/features/:id/upvote
    if (subAction === 'upvote' && method === 'POST') {
      return featureController.toggleUpvote(req, res, id);
    }

    // PATCH /api/features/:id/status
    if (subAction === 'status' && (method === 'PATCH' || method === 'PUT')) {
      return featureController.updateStatus(req, res, id);
    }

    // POST /api/features/:id/comments
    if (subAction === 'comments' && method === 'POST') {
      return featureController.addComment(req, res, id);
    }

    // Direct actions on /api/features/:id without subAction
    if (!subAction) {
      if (method === 'GET') {
        return featureController.getFeature(req, res, id);
      }
      if (method === 'DELETE') {
        return featureController.deleteFeature(req, res, id);
      }
    }
  }

  // Unknown API route
  if (pathname.startsWith('/api/')) {
    return sendError(res, 404, `API route '${method} ${pathname}' not found`);
  }

  // --- STATIC FRONTEND ASSETS ---
  const served = await serveStaticFile(req, res, pathname);
  if (!served) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}
