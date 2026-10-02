import express from 'express';
import routes from './routes';

export function createGatewayServer() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use(routes);

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  const server = createGatewayServer();

  server.listen(PORT, () => {
    console.log(`[Raw Engine Gateway] Server listening on http://localhost:${PORT}`);
  });
}