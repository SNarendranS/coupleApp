import { Notification } from '../models';

export class NotificationsService {
  static async getNotifications(userId: string) {
    return Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  static async markAsRead(userId: string, notificationId: string) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { $set: { read: true } },
      { new: true }
    );
  }

  static async markAllAsRead(userId: string) {
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return { success: true };
  }
}
