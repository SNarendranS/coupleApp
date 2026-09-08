import { SharedLink, Activity } from '../models';
import { SharedLinkInput } from '@couple/shared';

export class LinksService {
  static async getLinks(coupleId: string, category?: string) {
    const filter: any = { coupleId };
    if (category && category !== 'all') {
      filter.category = category;
    }

    return SharedLink.find(filter)
      .populate('createdBy', 'displayName username')
      .sort({ createdAt: -1 });
  }

  static async createLink(coupleId: string, userId: string, input: SharedLinkInput) {
    // Generate simple favicon / thumbnail placeholder if none provided
    let thumbnail = input.thumbnail;
    if (!thumbnail) {
      try {
        const urlObj = new URL(input.url);
        thumbnail = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=128`;
      } catch {
        thumbnail = '';
      }
    }

    const link = await SharedLink.create({
      coupleId,
      createdBy: userId,
      url: input.url,
      title: input.title,
      description: input.description || '',
      thumbnail,
      category: input.category,
    });

    await Activity.create({
      coupleId,
      userId,
      action: 'link_added',
      details: `Saved link: "${input.title}"`,
    });

    return link.populate('createdBy', 'displayName username');
  }

  static async updateLink(coupleId: string, linkId: string, updates: Partial<SharedLinkInput>) {
    const link = await SharedLink.findOneAndUpdate(
      { _id: linkId, coupleId },
      { $set: updates },
      { new: true }
    ).populate('createdBy', 'displayName username');

    if (!link) {
      const err: any = new Error('Shared link not found');
      err.statusCode = 404;
      throw err;
    }

    return link;
  }

  static async deleteLink(coupleId: string, linkId: string) {
    const link = await SharedLink.findOneAndDelete({ _id: linkId, coupleId });
    if (!link) {
      const err: any = new Error('Shared link not found');
      err.statusCode = 404;
      throw err;
    }
    return { deleted: true };
  }
}
