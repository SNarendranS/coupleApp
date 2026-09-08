import mongoose from 'mongoose';
import { User, Couple, PartnerRequest, DrawingBoard, Notification, Activity } from '../models';
import { PartnerProfile } from '@couple/shared';

export class PartnerService {
  static async searchUsers(query: string, currentUserId: string): Promise<PartnerProfile[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const regex = new RegExp(trimmed, 'i');

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [{ username: regex }, { displayName: regex }],
    })
      .limit(20)
      .select('username displayName avatarUrl bio coupleId');

    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      bio: u.bio,
      isPartnered: !!u.coupleId,
    }));
  }

  static async sendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      const err: any = new Error('You cannot send a partner request to yourself');
      err.statusCode = 400;
      err.code = 'SELF_REQUEST';
      throw err;
    }

    const sender = await User.findById(senderId);
    if (!sender || sender.coupleId) {
      const err: any = new Error('You already have an active partner');
      err.statusCode = 400;
      err.code = 'ALREADY_PARTNERED';
      throw err;
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (receiver.coupleId) {
      const err: any = new Error('This user is already connected with a partner');
      err.statusCode = 400;
      err.code = 'RECEIVER_ALREADY_PARTNERED';
      throw err;
    }

    // Check if there is already a pending request in either direction
    const existingPending = await PartnerRequest.findOne({
      $or: [
        { sender: senderId, receiver: receiverId, status: 'pending' },
        { sender: receiverId, receiver: senderId, status: 'pending' },
      ],
    });

    if (existingPending) {
      const err: any = new Error('A partner request is already pending between you two');
      err.statusCode = 409;
      err.code = 'REQUEST_ALREADY_PENDING';
      throw err;
    }

    const request = await PartnerRequest.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending',
    });

    // Create persistent notification for receiver
    await Notification.create({
      userId: receiver._id,
      type: 'partner_request',
      title: 'New Partner Request',
      message: `${sender.displayName} (@${sender.username}) sent you a partner request!`,
      metadata: { requestId: request._id.toString(), senderId: sender._id.toString() },
    });

    return request;
  }

  static async getRequests(userId: string) {
    const incoming = await PartnerRequest.find({ receiver: userId, status: 'pending' })
      .populate('sender', 'username displayName avatarUrl bio')
      .sort({ createdAt: -1 });

    const outgoing = await PartnerRequest.find({ sender: userId, status: 'pending' })
      .populate('receiver', 'username displayName avatarUrl bio')
      .sort({ createdAt: -1 });

    return { incoming, outgoing };
  }

  static async acceptRequest(requestId: string, currentUserId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const request = await PartnerRequest.findById(requestId).session(session);

      if (!request) {
        const err: any = new Error('Partner request not found');
        err.statusCode = 404;
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (request.receiver.toString() !== currentUserId) {
        const err: any = new Error('You are not authorized to accept this request');
        err.statusCode = 403;
        err.code = 'UNAUTHORIZED';
        throw err;
      }

      if (request.status !== 'pending') {
        const err: any = new Error(`Request has already been ${request.status}`);
        err.statusCode = 400;
        err.code = 'REQUEST_NOT_PENDING';
        throw err;
      }

      const sender = await User.findById(request.sender).session(session);
      const receiver = await User.findById(request.receiver).session(session);

      if (!sender || !receiver) {
        const err: any = new Error('One of the users was not found');
        err.statusCode = 404;
        throw err;
      }

      if (sender.coupleId || receiver.coupleId) {
        const err: any = new Error('One of the users is already in an active couple');
        err.statusCode = 400;
        err.code = 'ALREADY_PARTNERED';
        throw err;
      }

      // Create Couple entity
      const couple = new Couple({
        memberIds: [sender._id, receiver._id],
        name: `${sender.displayName} & ${receiver.displayName}`,
        relationshipStartDate: new Date(),
      });
      await couple.save({ session });

      // Associate couple with both users
      sender.coupleId = couple._id;
      receiver.coupleId = couple._id;
      await sender.save({ session });
      await receiver.save({ session });

      // Mark request accepted
      request.status = 'accepted';
      await request.save({ session });

      // Cancel/reject any other pending requests for either user
      await PartnerRequest.updateMany(
        {
          _id: { $ne: request._id },
          status: 'pending',
          $or: [
            { sender: sender._id },
            { receiver: sender._id },
            { sender: receiver._id },
            { receiver: receiver._id },
          ],
        },
        { $set: { status: 'cancelled' } },
        { session }
      );

      // Create DrawingBoard for this couple
      const board = new DrawingBoard({
        coupleId: couple._id,
        version: 1,
        backgroundColor: '#ffffff',
      });
      await board.save({ session });

      // Create couple activity entry
      await Activity.create(
        [
          {
            coupleId: couple._id,
            userId: receiver._id,
            action: 'connected',
            details: `Started our digital journey together!`,
          },
        ],
        { session, ordered: true }
      );

      // Create notifications
      await Notification.create(
        [
          {
            userId: sender._id,
            coupleId: couple._id,
            type: 'partner_accepted',
            title: 'Partner Request Accepted!',
            message: `${receiver.displayName} accepted your partner request! Welcome to your private space.`,
            metadata: { coupleId: couple._id.toString() },
          },
          {
            userId: receiver._id,
            coupleId: couple._id,
            type: 'partner_accepted',
            title: 'Connected!',
            message: `You and ${sender.displayName} are now connected!`,
            metadata: { coupleId: couple._id.toString() },
          },
        ],
        { session, ordered: true }
      );

      await session.commitTransaction();
      session.endSession();

      return { couple, sender, receiver };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async rejectRequest(requestId: string, currentUserId: string) {
    const request = await PartnerRequest.findById(requestId);
    if (!request) {
      const err: any = new Error('Partner request not found');
      err.statusCode = 404;
      throw err;
    }

    if (request.receiver.toString() !== currentUserId) {
      const err: any = new Error('You are not authorized to reject this request');
      err.statusCode = 403;
      throw err;
    }

    if (request.status !== 'pending') {
      const err: any = new Error('Request is no longer pending');
      err.statusCode = 400;
      throw err;
    }

    request.status = 'rejected';
    await request.save();

    return request;
  }

  static async cancelRequest(requestId: string, currentUserId: string) {
    const request = await PartnerRequest.findById(requestId);
    if (!request) {
      const err: any = new Error('Partner request not found');
      err.statusCode = 404;
      throw err;
    }

    if (request.sender.toString() !== currentUserId) {
      const err: any = new Error('You are not authorized to cancel this request');
      err.statusCode = 403;
      throw err;
    }

    if (request.status !== 'pending') {
      const err: any = new Error('Request is no longer pending');
      err.statusCode = 400;
      throw err;
    }

    request.status = 'cancelled';
    await request.save();

    return request;
  }
}
