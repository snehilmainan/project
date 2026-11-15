/**
 * UpVote — Clean & Reliable Client Application Logic
 */

const state = {
  features: [],
  stats: {},
  status: 'all',
  category: 'all',
  sort: 'votes',
  search: '',
  adminMode: false,
  adminKey: 'admin123',
  activeDetailFeature: null,
  voterId: getOrCreateVoterId()
};

function getOrCreateVoterId() {
  let id = localStorage.getItem('upvote_voter_id');
  if (!id) {
    id = 'voter-' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('upvote_voter_id', id);
  }
  return id;
}

// DOM Elements
const el = {
  statTotal: document.getElementById('statTotal'),
  statReview: document.getElementById('statReview'),
  statPlanned: document.getElementById('statPlanned'),
  statProgress: document.getElementById('statProgress'),
  statCompleted: document.getElementById('statCompleted'),
  featuresList: document.getElementById('featuresList'),
  statusTabs: document.getElementById('statusTabs'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  categorySelect: document.getElementById('categorySelect'),
  sortSelect: document.getElementById('sortSelect'),
  adminToggleBtn: document.getElementById('adminToggleBtn'),
  adminStatusText: document.getElementById('adminStatusText'),
  openSubmitModalBtn: document.getElementById('openSubmitModalBtn'),
  closeSubmitModalBtn: document.getElementById('closeSubmitModalBtn'),
  cancelSubmitBtn: document.getElementById('cancelSubmitBtn'),
  submitModal: document.getElementById('submitModal'),
  submitModalContent: document.getElementById('submitModalContent'),
  submitFeatureForm: document.getElementById('submitFeatureForm'),
  detailModal: document.getElementById('detailModal'),
  detailModalContent: document.getElementById('detailModalContent'),
  closeDetailModalBtn: document.getElementById('closeDetailModalBtn'),
  commentForm: document.getElementById('commentForm'),
  toastContainer: document.getElementById('toastContainer')
};

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadAll();
});

function setupEventListeners() {
  // Status tabs
  el.statusTabs.addEventListener('click', e => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    state.status = tab.dataset.status;
    loadFeatures();
  });

  // Search input
  let searchTimer = null;
  el.searchInput.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const val = e.target.value.trim();
    el.clearSearchBtn.classList.toggle('hidden', !val);
    searchTimer = setTimeout(() => {
      state.search = val;
      loadFeatures();
    }, 250);
  });

  el.clearSearchBtn.addEventListener('click', () => {
    el.searchInput.value = '';
    el.clearSearchBtn.classList.add('hidden');
    state.search = '';
    loadFeatures();
    el.searchInput.focus();
  });

  // Category and Sort selects
  el.categorySelect.addEventListener('change', e => {
    state.category = e.target.value;
    loadFeatures();
  });

  el.sortSelect.addEventListener('change', e => {
    state.sort = e.target.value;
    loadFeatures();
  });

  // Admin Mode Toggle
  el.adminToggleBtn.addEventListener('click', () => {
    state.adminMode = !state.adminMode;
    if (state.adminMode) {
      el.adminToggleBtn.classList.add('bg-brand-50', 'border-brand-300', 'text-brand-700');
      el.adminStatusText.textContent = 'Admin: ON';
      showToast('Admin mode enabled. You can edit statuses or delete items.', 'info');
    } else {
      el.adminToggleBtn.classList.remove('bg-brand-50', 'border-brand-300', 'text-brand-700');
      el.adminStatusText.textContent = 'Admin Mode';
      showToast('Admin mode disabled.', 'info');
    }
    renderFeatures();
  });

  // Submit Modal Controls
  el.openSubmitModalBtn.addEventListener('click', openSubmitModal);
  el.closeSubmitModalBtn.addEventListener('click', closeSubmitModal);
  el.cancelSubmitBtn.addEventListener('click', closeSubmitModal);
  el.submitModal.addEventListener('click', e => {
    if (e.target === el.submitModal) closeSubmitModal();
  });
  el.submitFeatureForm.addEventListener('submit', handleFeatureSubmit);

  // Detail Modal Controls
  el.closeDetailModalBtn.addEventListener('click', closeDetailModal);
  el.detailModal.addEventListener('click', e => {
    if (e.target === el.detailModal) closeDetailModal();
  });
  el.commentForm.addEventListener('submit', handleCommentSubmit);

  // Escape key closes modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeSubmitModal();
      closeDetailModal();
    }
  });
}

// Data Fetching
async function loadAll() {
  await Promise.all([loadStats(), loadFeatures()]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/features/stats');
    if (!res.ok) throw new Error('Stats error');
    const { data } = await res.json();
    state.stats = data;
    renderStats();
  } catch (err) {
    console.error('Stats error:', err);
  }
}

async function loadFeatures() {
  try {
    const params = new URLSearchParams({
      status: state.status,
      category: state.category,
      search: state.search,
      sort: state.sort
    });

    const res = await fetch(`/api/features?${params.toString()}`);
    if (!res.ok) throw new Error('Features error');
    const { data } = await res.json();
    state.features = data;
    renderFeatures();
  } catch (err) {
    console.error('Features error:', err);
    showToast('Failed to load items', 'error');
  }
}

function renderStats() {
  const s = state.stats;
  el.statTotal.textContent = s.total ?? 0;
  el.statReview.textContent = s.underReview ?? 0;
  el.statPlanned.textContent = s.planned ?? 0;
  el.statProgress.textContent = s.inProgress ?? 0;
  el.statCompleted.textContent = s.completed ?? 0;
}

function renderFeatures() {
  const container = el.featuresList;
  if (!state.features || state.features.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
        <p class="text-sm font-semibold text-slate-700">No feature requests match your filters.</p>
        <p class="text-xs text-slate-400">Try adjusting your search or category filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.features.map(item => {
    const isVoted = item.voters && item.voters.includes(state.voterId);
    const catClass = `badge-cat-${item.category.replace('/', '-')}`;
    const statusClass = `status-pill-${item.status.replace('/', '-')}`;
    const commentsCount = item.comments ? item.comments.length : 0;

    return `
      <article class="feature-card p-4 sm:p-5 flex items-start gap-4 cursor-pointer" onclick="openDetailModal('${item.id}')">
        <!-- Upvote Button -->
        <button class="upvote-btn ${isVoted ? 'voted' : ''} flex flex-col items-center justify-center w-12 py-2 rounded-xl shrink-0" onclick="toggleUpvote('${item.id}', event)">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
          </svg>
          <span class="text-xs font-bold mt-0.5">${item.votes}</span>
        </button>

        <!-- Content -->
        <div class="flex-1 min-w-0 space-y-1">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-900 line-clamp-1">${escapeHtml(item.title)}</h3>
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClass} shrink-0">
              ${formatStatusName(item.status)}
            </span>
          </div>

          <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">${escapeHtml(item.description)}</p>

          <!-- Footer Metadata -->
          <div class="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <div class="flex items-center space-x-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${catClass}">${item.category}</span>
              <span>·</span>
              <span>By ${escapeHtml(item.author)}</span>
              <span>·</span>
              <span>${formatRelativeTime(item.createdAt)}</span>
            </div>

            <div class="flex items-center space-x-3">
              <div class="flex items-center space-x-1 text-slate-400">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span class="font-semibold text-xs">${commentsCount}</span>
              </div>

              ${state.adminMode ? `
                <div class="flex items-center space-x-1.5 pl-2 border-l border-slate-200" onclick="event.stopPropagation()">
                  <select onchange="handleStatusChange('${item.id}', this.value, event)" class="text-xs py-1 px-1.5 rounded bg-slate-100 border border-slate-300 font-medium text-slate-700">
                    <option value="under-review" ${item.status === 'under-review' ? 'selected' : ''}>Review</option>
                    <option value="planned" ${item.status === 'planned' ? 'selected' : ''}>Planned</option>
                    <option value="in-progress" ${item.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
                  </select>
                  <button onclick="handleDeleteFeature('${item.id}', event)" title="Delete" class="p-1 text-red-500 hover:text-red-700">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// User Actions
async function toggleUpvote(id, e) {
  if (e) e.stopPropagation();

  const item = state.features.find(f => f.id === id);
  if (!item) return;

  const hasVoted = item.voters && item.voters.includes(state.voterId);
  if (hasVoted) {
    item.voters = item.voters.filter(v => v !== state.voterId);
    item.votes = Math.max(0, item.votes - 1);
  } else {
    if (!item.voters) item.voters = [];
    item.voters.push(state.voterId);
    item.votes += 1;
  }
  renderFeatures();

  try {
    const res = await fetch(`/api/features/${id}/upvote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Voter-Id': state.voterId
      },
      body: JSON.stringify({ voterId: state.voterId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Vote failed');
    showToast(data.data.voted ? 'Upvoted!' : 'Upvote removed', 'info');
    loadStats();
  } catch (err) {
    showToast(err.message, 'error');
    loadFeatures();
  }
}

async function handleStatusChange(id, newStatus, e) {
  if (e) e.stopPropagation();
  try {
    const res = await fetch(`/api/features/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': state.adminKey
      },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Failed to update');
    showToast(`Status updated to ${formatStatusName(newStatus)}`, 'success');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleDeleteFeature(id, e) {
  if (e) e.stopPropagation();
  if (!confirm('Permanently delete this feature?')) return;

  try {
    const res = await fetch(`/api/features/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': state.adminKey }
    });
    if (!res.ok && res.status !== 204) throw new Error('Delete failed');
    showToast('Feature deleted', 'info');
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleFeatureSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('featureTitle').value.trim();
  const category = document.getElementById('featureCategory').value;
  const author = document.getElementById('featureAuthor').value.trim();
  const description = document.getElementById('featureDescription').value.trim();

  const submitBtn = document.getElementById('submitFormBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  try {
    const res = await fetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, author, description })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || 'Submission failed');

    showToast('Feature proposal submitted!', 'success');
    el.submitFeatureForm.reset();
    closeSubmitModal();
    await loadAll();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
}

async function handleCommentSubmit(e) {
  e.preventDefault();
  if (!state.activeDetailFeature) return;

  const id = state.activeDetailFeature.id;
  const author = document.getElementById('commentAuthorInput').value.trim();
  const content = document.getElementById('commentContentInput').value.trim();

  if (!content) return;

  try {
    const res = await fetch(`/api/features/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content })
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || 'Comment failed');

    document.getElementById('commentContentInput').value = '';
    showToast('Comment added', 'success');

    const itemRes = await fetch(`/api/features/${id}`);
    const { data } = await itemRes.json();
    state.activeDetailFeature = data;
    renderComments(data.comments);
    loadFeatures();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Modals
function openSubmitModal() {
  el.submitModal.classList.remove('hidden');
  setTimeout(() => {
    el.submitModal.classList.remove('opacity-0');
    el.submitModalContent.classList.remove('scale-95');
    document.getElementById('featureTitle').focus();
  }, 10);
}

function closeSubmitModal() {
  el.submitModal.classList.add('opacity-0');
  el.submitModalContent.classList.add('scale-95');
  setTimeout(() => el.submitModal.classList.add('hidden'), 150);
}

async function openDetailModal(id) {
  try {
    const res = await fetch(`/api/features/${id}`);
    if (!res.ok) throw new Error('Details failed');
    const { data } = await res.json();
    state.activeDetailFeature = data;

    document.getElementById('detailTitle').textContent = data.title;
    document.getElementById('detailDescription').textContent = data.description;
    document.getElementById('detailAuthor').textContent = data.author;
    document.getElementById('detailDate').textContent = formatRelativeTime(data.createdAt);
    document.getElementById('detailVoteCount').textContent = data.votes;

    const badge = document.getElementById('detailCategoryBadge');
    badge.textContent = data.category;
    badge.className = `text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider badge-cat-${data.category.replace('/', '-')}`;

    renderComments(data.comments || []);
    el.detailModal.classList.remove('hidden');
    setTimeout(() => {
      el.detailModal.classList.remove('opacity-0');
      el.detailModalContent.classList.remove('scale-95');
    }, 10);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function closeDetailModal() {
  el.detailModal.classList.add('opacity-0');
  el.detailModalContent.classList.add('scale-95');
  setTimeout(() => {
    el.detailModal.classList.add('hidden');
    state.activeDetailFeature = null;
  }, 150);
}

function renderComments(comments) {
  const container = document.getElementById('commentList');
  document.getElementById('commentCountBadge').textContent = comments.length;

  if (comments.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-slate-400 text-xs bg-slate-50 rounded-xl">
        No comments yet.
      </div>
    `;
    return;
  }

  container.innerHTML = comments.map(c => `
    <div class="bg-slate-50 p-3 rounded-xl space-y-0.5">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-slate-700">${escapeHtml(c.author)}</span>
        <span class="text-slate-400 text-[11px]">${formatRelativeTime(c.createdAt)}</span>
      </div>
      <p class="text-xs text-slate-600">${escapeHtml(c.content)}</p>
    </div>
  `).join('');
}

// Helpers
function formatStatusName(status) {
  switch (status) {
    case 'under-review': return 'Under Review';
    case 'planned': return 'Planned';
    case 'in-progress': return 'In Progress';
    case 'completed': return 'Completed';
    default: return status;
  }
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diffSec = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-red-600' : (type === 'info' ? 'bg-slate-800' : 'bg-brand-600');
  toast.className = `toast pointer-events-auto px-4 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md flex items-center space-x-2 ${bg}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}
