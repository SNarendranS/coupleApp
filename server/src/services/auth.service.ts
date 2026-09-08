import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, Couple } from '../models';
import { env } from '../config/env';
import { RegisterInput, LoginInput } from '@couple/shared';

export class AuthService {
  static generateToken(userId: string): string {
    return jwt.sign({ userId }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }

  static async register(input: RegisterInput): Promise<{ user: IUser; token: string }> {
    const existingEmail = await User.findOne({ email: input.email });
    if (existingEmail) {
      const err: any = new Error('Email is already registered');
      err.statusCode = 409;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    const existingUsername = await User.findOne({ username: input.username });
    if (existingUsername) {
      const err: any = new Error('Username is already taken');
      err.statusCode = 409;
      err.code = 'USERNAME_TAKEN';
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await User.create({
      username: input.username,
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl || '',
      bio: input.bio || '',
      lastSeenAt: new Date(),
      isOnline: true,
    });

    const token = this.generateToken(user._id.toString());
    return { user, token };
  }

  static async login(input: LoginInput): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({
      $or: [{ email: input.login }, { username: input.login }],
    }).select('+passwordHash');

    if (!user) {
      const err: any = new Error('Invalid username/email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      const err: any = new Error('Invalid username/email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    user.isOnline = true;
    user.lastSeenAt = new Date();
    await user.save();

    const token = this.generateToken(user._id.toString());
    return { user, token };
  }

  static async getMe(userId: string): Promise<{ user: IUser; partner: IUser | null; couple: any | null }> {
    const user = await User.findById(userId);
    if (!user) {
      const err: any = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    let partner: IUser | null = null;
    let couple: any = null;

    if (user.coupleId) {
      couple = await Couple.findById(user.coupleId);
      if (couple) {
        const partnerId = couple.memberIds.find(
          (mId: any) => mId.toString() !== user._id.toString()
        );
        if (partnerId) {
          partner = await User.findById(partnerId);
        }
      }
    }

    return { user, partner, couple };
  }
}
