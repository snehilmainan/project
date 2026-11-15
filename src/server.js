import { createServer } from 'node:http';
import { handleRequest } from './routes/router.js';
import { config } from './config/env.js';
import { featureModel } from './models/featureModel.js';

// Pre-initialize data store
await featureModel.init();

const server = createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        error: {
          status: 500,
          message: 'Internal server error occurred',
          detail: config.isDev ? err.message : undefined
        }
      }));
    } else {
      res.destroy();
    }
  }
});

server.listen(config.port, config.host, () => {
  console.log('==================================================');
  console.log('  🚀 UpVote — Feedback & Feature Request Board    ');
  console.log('==================================================');
  console.log(`  Local URL:   http://localhost:${config.port}`);
  console.log(`  Network URL: http://${config.host}:${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Admin Key:   ${config.adminKey}`);
  console.log('==================================================');
  console.log('  Available REST Endpoints:');
  console.log('  - GET    /api/features/stats');
  console.log('  - GET    /api/features?status=&category=&search=&sort=');
  console.log('  - POST   /api/features');
  console.log('  - GET    /api/features/:id');
  console.log('  - PATCH  /api/features/:id/status');
  console.log('  - POST   /api/features/:id/upvote');
  console.log('  - POST   /api/features/:id/comments');
  console.log('  - DELETE /api/features/:id');
  console.log('==================================================\n');
});

function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully shutting down UpVote server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
  // Force exit after 3 seconds if connections linger
  setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
