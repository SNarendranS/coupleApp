import { Activity } from '../models';

export class ActivityService {
  static async getActivities(coupleId: string) {
    return Activity.find({ coupleId })
      .populate('userId', 'displayName username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(30);
  }
}
