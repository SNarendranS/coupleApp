import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { setupSocketServer } from './socket';
import { ReminderService } from './services/reminder.service';

async function startServer() {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);

  setupSocketServer(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(`UsTwo API & Socket.IO Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    console.log(`Allowed Client URL: ${env.CLIENT_URL}`);
  });

  // Best-effort 60s reminder interval during active server runtime
  const reminderInterval = setInterval(() => {
    ReminderService.processDueReminders().catch((err) => {
      console.error('Error during scheduled reminder check:', err);
    });
  }, 60 * 1000);

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    clearInterval(reminderInterval);
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
  console.error('Failed to start server:', err);
  process.exit(1);
});
