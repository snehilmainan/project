import { featureModel } from '../models/featureModel.js';
import { readJsonBody, sendJson, sendError } from '../middleware/bodyParser.js';
import { config } from '../config/env.js';

const VALID_CATEGORIES = ['feature', 'bug', 'enhancement', 'ui/ux', 'integration'];
const VALID_STATUSES = ['under-review', 'planned', 'in-progress', 'completed'];

export const featureController = {
  // GET /api/features/stats
  async getStats(req, res) {
    try {
      const stats = await featureModel.getSummaryStats();
      return sendJson(res, 200, { data: stats });
    } catch (err) {
      return sendError(res, 500, 'Failed to fetch summary stats', err.message);
    }
  },

  // GET /api/features?status=planned&category=feature&search=auth&sort=votes
  async listFeatures(req, res, url) {
    try {
      const status = url.searchParams.get('status') || 'all';
      const category = url.searchParams.get('category') || 'all';
      const search = url.searchParams.get('search') || '';
      const sort = url.searchParams.get('sort') || 'votes';

      const items = await featureModel.getAll({ status, category, search, sort });
      return sendJson(res, 200, {
        total: items.length,
        filters: { status, category, search, sort },
        data: items
      });
    } catch (err) {
      return sendError(res, 500, 'Failed to list features', err.message);
    }
  },

  // GET /api/features/:id
  async getFeature(req, res, id) {
    try {
      const item = await featureModel.getById(id);
      if (!item) {
        return sendError(res, 404, `Feature with ID '${id}' was not found`);
      }
      return sendJson(res, 200, { data: item });
    } catch (err) {
      return sendError(res, 500, 'Failed to get feature', err.message);
    }
  },

  // POST /api/features
  async createFeature(req, res) {
    try {
      const body = await readJsonBody(req);
      const errors = [];

      if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
        errors.push('Title must be at least 3 characters long');
      } else if (body.title.trim().length > 120) {
        errors.push('Title cannot exceed 120 characters');
      }

      if (!body.description || typeof body.description !== 'string' || body.description.trim().length < 5) {
        errors.push('Description must be at least 5 characters long');
      }

      const category = (body.category || 'feature').toLowerCase().trim();
      if (!VALID_CATEGORIES.includes(category)) {
        errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
      }

      if (errors.length > 0) {
        return sendError(res, 400, 'Validation failed', errors);
      }

      const created = await featureModel.create({
        title: body.title,
        description: body.description,
        category,
        author: body.author
      });

      return sendJson(res, 201, {
        message: 'Feature request submitted successfully',
        data: created
      });
    } catch (err) {
      const status = err.statusCode || 500;
      return sendError(res, status, err.message);
    }
  },

  // PATCH /api/features/:id/status
  async updateStatus(req, res, id) {
    try {
      const body = await readJsonBody(req);
      const { status } = body;

      if (!status || !VALID_STATUSES.includes(status.toLowerCase())) {
        return sendError(res, 400, `Status must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Check for Admin-Key header if in production or required
      const adminHeader = req.headers['x-admin-key'];
      if (adminHeader && adminHeader !== config.adminKey) {
        return sendError(res, 403, 'Invalid admin authorization key');
      }

      const updated = await featureModel.updateStatus(id, status.toLowerCase());
      if (!updated) {
        return sendError(res, 404, `Feature with ID '${id}' was not found`);
      }

      return sendJson(res, 200, {
        message: 'Feature status updated successfully',
        data: updated
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return sendError(res, statusCode, err.message);
    }
  },

  // POST /api/features/:id/upvote
  async toggleUpvote(req, res, id) {
    try {
      const body = await readJsonBody(req);
      const voterId = body.voterId || req.headers['x-voter-id'] || 'anonymous-voter';

      const result = await featureModel.toggleUpvote(id, voterId);
      if (!result) {
        return sendError(res, 404, `Feature with ID '${id}' was not found`);
      }

      return sendJson(res, 200, {
        message: result.voted ? 'Upvote added' : 'Upvote removed',
        data: result
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return sendError(res, statusCode, err.message);
    }
  },

  // POST /api/features/:id/comments
  async addComment(req, res, id) {
    try {
      const body = await readJsonBody(req);
      const { author, content } = body;

      if (!content || typeof content !== 'string' || content.trim().length < 2) {
        return sendError(res, 400, 'Comment content must be at least 2 characters long');
      }

      const comment = await featureModel.addComment(id, { author, content });
      if (!comment) {
        return sendError(res, 404, `Feature with ID '${id}' was not found`);
      }

      return sendJson(res, 201, {
        message: 'Comment added successfully',
        data: comment
      });
    } catch (err) {
      const statusCode = err.statusCode || 500;
      return sendError(res, statusCode, err.message);
    }
  },

  // DELETE /api/features/:id
  async deleteFeature(req, res, id) {
    try {
      const adminHeader = req.headers['x-admin-key'];
      if (adminHeader && adminHeader !== config.adminKey) {
        return sendError(res, 403, 'Invalid admin authorization key');
      }

      const success = await featureModel.delete(id);
      if (!success) {
        return sendError(res, 404, `Feature with ID '${id}' was not found`);
      }

      res.writeHead(204);
      return res.end();
    } catch (err) {
      return sendError(res, 500, 'Failed to delete feature', err.message);
    }
  }
};
