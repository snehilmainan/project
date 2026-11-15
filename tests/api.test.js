/**
 * Direct Unit & Integration Test Suite for UpVote REST API
 * Tests routing, validation, controllers, models, and JSON persistence
 * Runs 100% locally and isolated without requiring open TCP network ports
 */

import { Readable, Writable } from 'node:stream';
import { handleRequest } from '../src/routes/router.js';
import { featureModel } from '../src/models/featureModel.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedCount++;
  }
}

function createMockReqRes({ method = 'GET', url = '/', headers = {}, body = null } = {}) {
  // Mock request stream
  const bodyString = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
  const req = new Readable({
    read() {
      if (bodyString) {
        this.push(bodyString);
      }
      this.push(null);
    }
  });

  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost:3000',
    ...(body ? { 'content-type': 'application/json' } : {}),
    ...headers
  };

  // Mock response stream
  let statusCode = 200;
  let headersSent = false;
  const resHeaders = {};
  const chunks = [];

  const promise = new Promise((resolve, reject) => {
    const res = {
      statusCode,
      get headersSent() { return headersSent; },
      writeHead(code, h = {}) {
        statusCode = code;
        headersSent = true;
        Object.assign(resHeaders, h);
        return this;
      },
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        headersSent = true;
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        let parsed = rawBody;
        try {
          parsed = JSON.parse(rawBody);
        } catch {
          // keep as string
        }
        resolve({
          status: statusCode,
          headers: resHeaders,
          body: parsed,
          rawBody
        });
      },
      destroy(err) {
        if (err) reject(err);
        else resolve({ status: statusCode, headers: resHeaders, body: null, rawBody: '' });
      }
    };

    handleRequest(req, res).catch(reject);
  });

  return promise;
}

async function runTests() {
  console.log('\n======================================================');
  console.log('       🧪 Running UpVote REST API Test Suite          ');
  console.log('======================================================\n');

  // Pre-initialize data
  await featureModel.init();

  // Test 1: Static Asset Delivery
  console.log('[Test Group 1: Web UI & Static Asset Delivery]');
  const home = await createMockReqRes({ method: 'GET', url: '/' });
  assert(home.status === 200, 'GET / serves 200 OK');
  assert(home.headers['Content-Type'].includes('text/html'), 'Content-Type is text/html');
  assert(home.rawBody.includes('UpVote'), 'HTML contains application title');

  // Test 2: CORS Preflight
  console.log('\n[Test Group 2: CORS & Options Preflight]');
  const cors = await createMockReqRes({ method: 'OPTIONS', url: '/api/features' });
  assert(cors.status === 204, 'OPTIONS /api/features returns 204 No Content');
  assert(cors.headers['Access-Control-Allow-Origin'] === '*', 'Access-Control-Allow-Origin is configured');

  // Test 3: Get Summary Stats
  console.log('\n[Test Group 3: Roadmap Metrics & Stats]');
  const stats = await createMockReqRes({ method: 'GET', url: '/api/features/stats' });
  assert(stats.status === 200, 'GET /api/features/stats returns 200 OK');
  assert(typeof stats.body.data.total === 'number' && stats.body.data.total > 0, 'Stats returns positive feature count');
  assert(typeof stats.body.data.totalVotes === 'number', 'Stats returns totalVotes count');

  // Test 4: List Features
  console.log('\n[Test Group 4: Query Parameters & Filtering]');
  const list = await createMockReqRes({ method: 'GET', url: '/api/features' });
  assert(list.status === 200, 'GET /api/features returns 200 OK');
  assert(Array.isArray(list.body.data), 'Returns data array');

  // Test 5: Category Query Filter
  const bugList = await createMockReqRes({ method: 'GET', url: '/api/features?category=bug' });
  assert(bugList.status === 200, 'GET /api/features?category=bug returns 200 OK');
  assert(bugList.body.data.every(f => f.category === 'bug'), 'All filtered items have category "bug"');

  // Test 6: Search Query Filter
  const search = await createMockReqRes({ method: 'GET', url: '/api/features?search=dark' });
  assert(search.status === 200, 'GET /api/features?search=dark returns 200 OK');
  assert(search.body.data.length >= 1, 'Search term "dark" yields matching feature');

  // Test 7: Validation Failure on Create
  console.log('\n[Test Group 5: Request Body Validation]');
  const invalid = await createMockReqRes({
    method: 'POST',
    url: '/api/features',
    body: { title: 'ab', description: 'desc', category: 'unsupported' }
  });
  assert(invalid.status === 400, 'POST /api/features rejects short title and invalid category with 400');
  assert(Array.isArray(invalid.body.error.details), 'Error payload contains details array');

  // Test 8: Create Feature (Success)
  console.log('\n[Test Group 6: Full CRUD & Resource Lifecycle]');
  const created = await createMockReqRes({
    method: 'POST',
    url: '/api/features',
    body: {
      title: 'Real-time WebSocket Live Updates',
      description: 'Stream live upvote updates directly to connected browser clients without reloading.',
      category: 'feature',
      author: 'Snehil Mainan'
    }
  });
  assert(created.status === 201, 'POST /api/features creates item with 201 Created');
  const featureItem = created.body.data;
  assert(featureItem && featureItem.id.startsWith('f-'), 'Feature has valid generated ID');
  assert(featureItem.status === 'under-review', 'Initial status defaults to "under-review"');

  // Test 9: Get Single Feature by ID
  const single = await createMockReqRes({ method: 'GET', url: `/api/features/${featureItem.id}` });
  assert(single.status === 200, 'GET /api/features/:id returns 200 OK');
  assert(single.body.data.title === 'Real-time WebSocket Live Updates', 'Single item title matches');

  // Test 10: Upvote Toggle (Vote)
  console.log('\n[Test Group 7: Upvoting & Discussion]');
  const voterId = 'unit-test-voter-88';
  const vote1 = await createMockReqRes({
    method: 'POST',
    url: `/api/features/${featureItem.id}/upvote`,
    body: { voterId }
  });
  assert(vote1.status === 200, 'POST /api/features/:id/upvote returns 200 OK');
  assert(vote1.body.data.voted === true, 'Upvote increments and returns voted: true');
  assert(vote1.body.data.votes === featureItem.votes + 1, 'Total votes increased by 1');

  // Test 11: Upvote Toggle (Unvote)
  const vote2 = await createMockReqRes({
    method: 'POST',
    url: `/api/features/${featureItem.id}/upvote`,
    body: { voterId }
  });
  assert(vote2.status === 200, 'Second POST /api/features/:id/upvote returns 200 OK');
  assert(vote2.body.data.voted === false, 'Second upvote removes vote (voted: false)');
  assert(vote2.body.data.votes === featureItem.votes, 'Total votes decremented back');

  // Test 12: Add Discussion Comment
  const comment = await createMockReqRes({
    method: 'POST',
    url: `/api/features/${featureItem.id}/comments`,
    body: { author: 'Lead Architect', content: 'Approved for Q1 sprint planning.' }
  });
  assert(comment.status === 201, 'POST /api/features/:id/comments returns 201 Created');
  assert(comment.body.data.content === 'Approved for Q1 sprint planning.', 'Comment content stored successfully');

  // Test 13: Admin Status Transition
  console.log('\n[Test Group 8: Status Transitions & Cleanup]');
  const statusUpdate = await createMockReqRes({
    method: 'PATCH',
    url: `/api/features/${featureItem.id}/status`,
    headers: { 'x-admin-key': 'admin123' },
    body: { status: 'in-progress' }
  });
  assert(statusUpdate.status === 200, 'PATCH /api/features/:id/status updates status');
  assert(statusUpdate.body.data.status === 'in-progress', 'Status is updated to "in-progress"');

  // Test 14: Delete Feature
  const deleted = await createMockReqRes({
    method: 'DELETE',
    url: `/api/features/${featureItem.id}`,
    headers: { 'x-admin-key': 'admin123' }
  });
  assert(deleted.status === 204, 'DELETE /api/features/:id returns 204 No Content');

  // Test 15: Verify 404 After Deletion
  const postDelete = await createMockReqRes({ method: 'GET', url: `/api/features/${featureItem.id}` });
  assert(postDelete.status === 404, 'GET /api/features/:id returns 404 Not Found after deletion');

  console.log('\n======================================================');
  console.log(`  Test Suite Results: ${passedCount} Passed, ${failedCount} Failed`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
