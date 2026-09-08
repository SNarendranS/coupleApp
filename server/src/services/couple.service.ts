import { Couple, User } from '../models';

export class CoupleService {
  static async getCoupleDetails(coupleId: string) {
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      const err: any = new Error('Couple not found');
      err.statusCode = 404;
      throw err;
    }

    const members = await User.find({
      _id: { $in: couple.memberIds },
    }).select('username displayName avatarUrl bio isOnline lastSeenAt');

    let daysTogether = 0;
    if (couple.relationshipStartDate) {
      const start = new Date(couple.relationshipStartDate).getTime();
      const now = new Date().getTime();
      daysTogether = Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
    }

    return {
      id: couple._id.toString(),
      name: couple.name || `${members[0]?.displayName} & ${members[1]?.displayName}`,
      relationshipStartDate: couple.relationshipStartDate,
      daysTogether,
      coverImage: couple.coverImage,
      members: members.map((m) => ({
        id: m._id.toString(),
        username: m.username,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        bio: m.bio,
        isOnline: m.isOnline,
        lastSeenAt: m.lastSeenAt,
      })),
      createdAt: couple.createdAt,
      updatedAt: couple.updatedAt,
    };
  }

  static async updateCoupleSettings(coupleId: string, updates: { name?: string; relationshipStartDate?: string; coverImage?: string }) {
    const couple = await Couple.findById(coupleId);
    if (!couple) {
      const err: any = new Error('Couple not found');
      err.statusCode = 404;
      throw err;
    }

    if (updates.name !== undefined) couple.name = updates.name;
    if (updates.relationshipStartDate !== undefined) {
      couple.relationshipStartDate = updates.relationshipStartDate ? new Date(updates.relationshipStartDate) : undefined;
    }
    if (updates.coverImage !== undefined) couple.coverImage = updates.coverImage;

    await couple.save();
    return this.getCoupleDetails(coupleId);
  }
}
