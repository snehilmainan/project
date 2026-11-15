import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, '../../data/features.json');

class FeatureModel {
  constructor() {
    this.features = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    try {
      const raw = await readFile(DATA_FILE, 'utf-8');
      this.features = JSON.parse(raw);
    } catch (err) {
      // If file doesn't exist or is invalid, initialize with empty array
      this.features = [];
      await this.persist();
    }
    this.initialized = true;
  }

  async persist() {
    try {
      await mkdir(path.dirname(DATA_FILE), { recursive: true });
      await writeFile(DATA_FILE, JSON.stringify(this.features, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist features data:', err.message);
    }
  }

  async getAll({ status, category, search, sort = 'votes' } = {}) {
    await this.init();
    let result = [...this.features];

    if (status && status !== 'all') {
      result = result.filter(item => item.status.toLowerCase() === status.toLowerCase());
    }

    if (category && category !== 'all') {
      result = result.filter(item => item.category.toLowerCase() === category.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sort === 'newest') {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      // Default: most votes, then newest
      result.sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    return result;
  }

  async getById(id) {
    await this.init();
    return this.features.find(item => item.id === id) || null;
  }

  async create({ title, description, category, author }) {
    await this.init();
    const now = new Date().toISOString();
    const newFeature = {
      id: `f-${randomUUID().slice(0, 8)}`,
      title: title.trim(),
      description: description.trim(),
      category: category.toLowerCase().trim(),
      status: 'under-review',
      votes: 1, // Author starts with 1 upvote
      voters: [author ? `author-${author.trim()}` : `author-anon`],
      author: author && author.trim() ? author.trim() : 'Community Member',
      createdAt: now,
      updatedAt: now,
      comments: []
    };

    this.features.unshift(newFeature);
    await this.persist();
    return newFeature;
  }

  async updateStatus(id, newStatus) {
    await this.init();
    const item = this.features.find(f => f.id === id);
    if (!item) return null;

    item.status = newStatus;
    item.updatedAt = new Date().toISOString();
    await this.persist();
    return item;
  }

  async toggleUpvote(id, voterId) {
    await this.init();
    const item = this.features.find(f => f.id === id);
    if (!item) return null;

    if (!Array.isArray(item.voters)) {
      item.voters = [];
    }

    const voterIndex = item.voters.indexOf(voterId);
    let voted = false;

    if (voterIndex > -1) {
      // Remove upvote (unvote)
      item.voters.splice(voterIndex, 1);
      item.votes = Math.max(0, item.votes - 1);
      voted = false;
    } else {
      // Add upvote
      item.voters.push(voterId);
      item.votes += 1;
      voted = true;
    }

    item.updatedAt = new Date().toISOString();
    await this.persist();

    return {
      id: item.id,
      votes: item.votes,
      voted,
      votersCount: item.voters.length
    };
  }

  async addComment(id, { author, content }) {
    await this.init();
    const item = this.features.find(f => f.id === id);
    if (!item) return null;

    if (!Array.isArray(item.comments)) {
      item.comments = [];
    }

    const comment = {
      id: `c-${randomUUID().slice(0, 6)}`,
      author: author && author.trim() ? author.trim() : 'Anonymous',
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    item.comments.push(comment);
    item.updatedAt = new Date().toISOString();
    await this.persist();

    return comment;
  }

  async delete(id) {
    await this.init();
    const index = this.features.findIndex(f => f.id === id);
    if (index === -1) return false;

    this.features.splice(index, 1);
    await this.persist();
    return true;
  }

  async getSummaryStats() {
    await this.init();
    const stats = {
      total: this.features.length,
      underReview: 0,
      planned: 0,
      inProgress: 0,
      completed: 0,
      totalVotes: 0
    };

    for (const f of this.features) {
      stats.totalVotes += f.votes || 0;
      switch (f.status) {
        case 'under-review': stats.underReview++; break;
        case 'planned': stats.planned++; break;
        case 'in-progress': stats.inProgress++; break;
        case 'completed': stats.completed++; break;
      }
    }

    return stats;
  }
}

export const featureModel = new FeatureModel();
