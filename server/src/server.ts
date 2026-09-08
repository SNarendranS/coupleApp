import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { setupSocketServer } from './socket';

async function startServer() {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  setupSocketServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`🚀 UsTwo API & Socket.IO Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`🔗 Allowed Client URL: ${env.CLIENT_URL}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP and Socket server closed');
      await mongoose.connection.close(false);
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
