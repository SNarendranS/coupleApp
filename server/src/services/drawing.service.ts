import { DrawingBoard, DrawingStroke, Activity } from '../models';
import { DrawingStrokeInput } from '@couple/shared';

export class DrawingService {
  static async getBoard(coupleId: string) {
    let board = await DrawingBoard.findOne({ coupleId });
    if (!board) {
      board = await DrawingBoard.create({
        coupleId,
        version: 1,
        backgroundColor: '#ffffff',
      });
    }

    // Fetch the last 1500 strokes for this board to render complete persistent art
    const strokes = await DrawingStroke.find({ coupleId })
      .sort({ createdAt: 1 })
      .limit(1500);

    return {
      board: {
        id: board._id.toString(),
        coupleId: board.coupleId.toString(),
        version: board.version,
        backgroundColor: board.backgroundColor,
        updatedAt: board.updatedAt,
      },
      strokes: strokes.map((s) => ({
        id: s._id.toString(),
        strokeId: s.strokeId,
        coupleId: s.coupleId.toString(),
        createdBy: s.createdBy.toString(),
        tool: s.tool,
        color: s.color,
        width: s.width,
        points: s.points,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  static async commitStroke(coupleId: string, userId: string, input: DrawingStrokeInput) {
    // Avoid duplicate strokes
    const existing = await DrawingStroke.findOne({ strokeId: input.strokeId });
    if (existing) {
      return existing;
    }

    const stroke = await DrawingStroke.create({
      coupleId,
      strokeId: input.strokeId,
      createdBy: userId,
      tool: input.tool,
      color: input.color,
      width: input.width,
      points: input.points,
    });

    await DrawingBoard.findOneAndUpdate(
      { coupleId },
      { $inc: { version: 1 }, $set: { updatedAt: new Date() } }
    );

    return stroke;
  }

  static async clearBoard(coupleId: string, userId: string) {
    await DrawingStroke.deleteMany({ coupleId });
    await DrawingBoard.findOneAndUpdate(
      { coupleId },
      { $inc: { version: 1 }, $set: { updatedAt: new Date() } }
    );

    await Activity.create({
      coupleId,
      userId,
      action: 'drawing_cleared',
      details: 'Cleared the canvas for a fresh start',
    });

    return { cleared: true };
  }

  static async updateBackground(coupleId: string, backgroundColor: '#ffffff' | '#121214') {
    const board = await DrawingBoard.findOneAndUpdate(
      { coupleId },
      { backgroundColor, $inc: { version: 1 } },
      { new: true, upsert: true }
    );
    return board;
  }

  static async undoLastStroke(coupleId: string, userId: string) {
    // Delete the last stroke created by this user or either user
    const lastStroke = await DrawingStroke.findOne({ coupleId }).sort({ createdAt: -1 });
    if (lastStroke) {
      await DrawingStroke.deleteOne({ _id: lastStroke._id });
      await DrawingBoard.findOneAndUpdate({ coupleId }, { $inc: { version: 1 } });
      return { undoneStrokeId: lastStroke.strokeId };
    }
    return { undoneStrokeId: null };
  }
}
