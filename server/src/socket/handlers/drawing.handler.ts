import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../auth';
import { DrawingService } from '../../services/drawing.service';
import { SOCKET_EVENTS, drawingStrokeSchema } from '@couple/shared';

export function registerDrawingHandlers(io: Server, socket: AuthenticatedSocket) {
  const coupleId = socket.data.coupleId;
  const userId = socket.data.userId;

  if (!coupleId) return;

  // Realtime stroke streaming while dragging (ephemeral canvas drawing between partners)
  socket.on(SOCKET_EVENTS.DRAWING_STROKE_STREAM, (payload: any) => {
    // Forward directly to partner in couple room without writing to DB
    socket.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.DRAWING_STROKE_STREAM, payload);
  });

  // Stroke completed (mouseup/touchend) - Persist in MongoDB and broadcast to room
  socket.on(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, async (payload: any, ack?: Function) => {
    try {
      const parsed = drawingStrokeSchema.safeParse(payload.stroke);
      if (!parsed.success) {
        if (ack) ack({ success: false, error: 'Invalid stroke data' });
        return;
      }

      const stroke = await DrawingService.commitStroke(coupleId, userId, parsed.data);

      // Broadcast completed stroke to partner
      socket.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.DRAWING_STROKE_COMMIT, {
        stroke: {
          id: (stroke as any)._id.toString(),
          strokeId: stroke.strokeId,
          coupleId: stroke.coupleId.toString(),
          createdBy: stroke.createdBy.toString(),
          tool: stroke.tool,
          color: stroke.color,
          width: stroke.width,
          points: stroke.points,
          createdAt: stroke.createdAt.toISOString(),
        },
      });

      if (ack) ack({ success: true, strokeId: stroke.strokeId });
    } catch (err: any) {
      console.error('Failed to commit stroke:', err);
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Clear canvas
  socket.on(SOCKET_EVENTS.DRAWING_CLEAR, async (_payload: any, ack?: Function) => {
    try {
      await DrawingService.clearBoard(coupleId, userId);
      io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.DRAWING_CLEAR, { clearedBy: userId });
      if (ack) ack({ success: true });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Change background color
  socket.on(SOCKET_EVENTS.DRAWING_BACKGROUND, async (payload: { backgroundColor: '#ffffff' | '#121214' }, ack?: Function) => {
    try {
      if (payload.backgroundColor === '#ffffff' || payload.backgroundColor === '#121214') {
        await DrawingService.updateBackground(coupleId, payload.backgroundColor);
        io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.DRAWING_BACKGROUND, payload);
        if (ack) ack({ success: true });
      }
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });

  // Undo stroke
  socket.on(SOCKET_EVENTS.DRAWING_UNDO, async (_payload: any, ack?: Function) => {
    try {
      const result = await DrawingService.undoLastStroke(coupleId, userId);
      if (result.undoneStrokeId) {
        io.to(`couple:${coupleId}`).emit(SOCKET_EVENTS.DRAWING_UNDO, {
          strokeId: result.undoneStrokeId,
        });
      }
      if (ack) ack({ success: true, undoneStrokeId: result.undoneStrokeId });
    } catch (err: any) {
      if (ack) ack({ success: false, error: err.message });
    }
  });
}
