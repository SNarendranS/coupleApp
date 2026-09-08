import { IUser } from '../models/User';
import { ICouple } from '../models/Couple';

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      coupleId?: string;
      couple?: ICouple;
    }
  }
}
