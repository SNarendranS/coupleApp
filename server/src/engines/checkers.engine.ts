import { CheckersPiece, CheckersConfig, CheckersGameState } from '@couple/shared';

export interface CheckersLegalMove {
  from: { row: number; col: number };
  to: { row: number; col: number };
  isJump: boolean;
  capturedPieceId?: string;
  pieceId: string;
}

export class CheckersEngine {
  static createInitialPieces(playerA: string, playerB: string): CheckersPiece[] {
    const pieces: CheckersPiece[] = [];
    let idCounter = 1;

    // Player A occupies rows 0, 1, 2 on dark squares (moving down towards row 7)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          pieces.push({
            id: `pA_${idCounter++}`,
            player: playerA,
            row: r,
            col: c,
            isKing: false,
          });
        }
      }
    }

    // Player B occupies rows 5, 6, 7 on dark squares (moving up towards row 0)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          pieces.push({
            id: `pB_${idCounter++}`,
            player: playerB,
            row: r,
            col: c,
            isKing: false,
          });
        }
      }
    }

    return pieces;
  }

  static createInitialState(
    playerA: string,
    playerB: string,
    config?: CheckersConfig
  ): CheckersGameState {
    let startingPlayer = playerA;
    if (config?.firstPlayer === 'challenger') {
      startingPlayer = playerB;
    } else if (config?.firstPlayer === 'random') {
      startingPlayer = Math.random() < 0.5 ? playerA : playerB;
    }

    return {
      players: [playerA, playerB],
      pieces: this.createInitialPieces(playerA, playerB),
      currentTurn: startingPlayer,
      winner: null,
      activePieceId: null,
      consecutiveJumps: false,
      movesCount: 0,
      captures: {
        [playerA]: 0,
        [playerB]: 0,
      },
      turnStartedAt: new Date().toISOString(),
    };
  }

  static getRowDirections(piece: CheckersPiece, playerA: string): number[] {
    if (piece.isKing) {
      return [-1, 1];
    }
    // Player A moves downwards (+1), Player B moves upwards (-1)
    return piece.player === playerA ? [1] : [-1];
  }

  static getPieceLegalMoves(
    piece: CheckersPiece,
    allPieces: CheckersPiece[],
    playerA: string
  ): { regular: CheckersLegalMove[]; jumps: CheckersLegalMove[] } {
    const regular: CheckersLegalMove[] = [];
    const jumps: CheckersLegalMove[] = [];

    const pieceMap = new Map<string, CheckersPiece>();
    for (const p of allPieces) {
      pieceMap.set(`${p.row},${p.col}`, p);
    }

    const rowDirs = this.getRowDirections(piece, playerA);
    const colDirs = [-1, 1];

    for (const dr of rowDirs) {
      for (const dc of colDirs) {
        // 1. Check regular step
        const stepR = piece.row + dr;
        const stepC = piece.col + dc;

        if (stepR >= 0 && stepR < 8 && stepC >= 0 && stepC < 8) {
          const occ = pieceMap.get(`${stepR},${stepC}`);
          if (!occ) {
            regular.push({
              from: { row: piece.row, col: piece.col },
              to: { row: stepR, col: stepC },
              isJump: false,
              pieceId: piece.id,
            });
          } else if (occ.player !== piece.player) {
            // 2. Check jump over opponent piece
            const jumpR = piece.row + dr * 2;
            const jumpC = piece.col + dc * 2;
            if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
              const landingOcc = pieceMap.get(`${jumpR},${jumpC}`);
              if (!landingOcc) {
                jumps.push({
                  from: { row: piece.row, col: piece.col },
                  to: { row: jumpR, col: jumpC },
                  isJump: true,
                  capturedPieceId: occ.id,
                  pieceId: piece.id,
                });
              }
            }
          }
        }
      }
    }

    return { regular, jumps };
  }

  static getAllLegalMoves(state: CheckersGameState, userId: string): CheckersLegalMove[] {
    const [playerA] = state.players;
    const userPieces = state.pieces.filter((p) => p.player === userId);

    // If in the middle of a multi-jump sequence, ONLY the active piece can jump!
    if (state.activePieceId) {
      const activePiece = userPieces.find((p) => p.id === state.activePieceId);
      if (!activePiece) return [];
      const { jumps } = this.getPieceLegalMoves(activePiece, state.pieces, playerA);
      return jumps;
    }

    let allJumps: CheckersLegalMove[] = [];
    let allRegular: CheckersLegalMove[] = [];

    for (const piece of userPieces) {
      const { regular, jumps } = this.getPieceLegalMoves(piece, state.pieces, playerA);
      allJumps.push(...jumps);
      allRegular.push(...regular);
    }

    // MANDATORY CAPTURE RULE:
    // If any jump move is available, ALL non-capturing moves are rejected!
    if (allJumps.length > 0) {
      return allJumps;
    }

    return allRegular;
  }

  static executeMove(
    state: CheckersGameState,
    userId: string,
    from: { row: number; col: number },
    to: { row: number; col: number }
  ): {
    success: boolean;
    error?: string;
    isGameOver?: boolean;
    winner?: string | null;
    hasContinuation?: boolean;
    promoted?: boolean;
  } {
    if (state.currentTurn !== userId) {
      return { success: false, error: 'It is not your turn' };
    }

    const [playerA, playerB] = state.players;
    const opponentId = userId === playerA ? playerB : playerA;

    const piece = state.pieces.find((p) => p.row === from.row && p.col === from.col && p.player === userId);
    if (!piece) {
      return { success: false, error: 'No piece found at starting coordinate' };
    }

    if (state.activePieceId && state.activePieceId !== piece.id) {
      return { success: false, error: 'You must continue capturing with the active piece' };
    }

    const legalMoves = this.getAllLegalMoves(state, userId);
    const chosenMove = legalMoves.find(
      (m) => m.from.row === from.row && m.from.col === from.col && m.to.row === to.row && m.to.col === to.col
    );

    if (!chosenMove) {
      const hasAnyJumps = legalMoves.some((m) => m.isJump);
      if (hasAnyJumps) {
        return { success: false, error: 'Mandatory capture rule: You must make a capture move' };
      }
      return { success: false, error: 'Illegal move' };
    }

    // Apply move
    piece.row = to.row;
    piece.col = to.col;
    state.movesCount += 1;

    let justPromoted = false;

    // Check Promotion to King
    // Player A reaches row 7; Player B reaches row 0
    if (!piece.isKing) {
      if ((piece.player === playerA && piece.row === 7) || (piece.player === playerB && piece.row === 0)) {
        piece.isKing = true;
        justPromoted = true;
      }
    }

    // If move was a jump, remove captured piece
    if (chosenMove.isJump && chosenMove.capturedPieceId) {
      state.pieces = state.pieces.filter((p) => p.id !== chosenMove.capturedPieceId);
      state.captures[userId] = (state.captures[userId] || 0) + 1;

      // Standard American Checkers crowning rule:
      // If a piece promotes to King on a jump, the turn ends immediately.
      if (!justPromoted) {
        // Check if another jump is available with the same piece
        const { jumps: nextJumps } = this.getPieceLegalMoves(piece, state.pieces, playerA);
        if (nextJumps.length > 0) {
          state.activePieceId = piece.id;
          state.consecutiveJumps = true;
          return {
            success: true,
            hasContinuation: true,
            promoted: false,
            isGameOver: false,
          };
        }
      }
    }

    // No further jumps available or regular move or just promoted: conclude turn
    state.activePieceId = null;
    state.consecutiveJumps = false;

    // Check victory condition for current player:
    // Does opponent have 0 pieces? Or 0 legal moves?
    const opponentPieces = state.pieces.filter((p) => p.player === opponentId);
    if (opponentPieces.length === 0) {
      state.winner = userId;
      return {
        success: true,
        isGameOver: true,
        winner: userId,
        promoted: justPromoted,
      };
    }

    // Switch turn
    state.currentTurn = opponentId;
    state.turnStartedAt = new Date().toISOString();

    const opponentLegalMoves = this.getAllLegalMoves(state, opponentId);
    if (opponentLegalMoves.length === 0) {
      // Opponent is blocked and has no legal moves: current player wins!
      state.winner = userId;
      return {
        success: true,
        isGameOver: true,
        winner: userId,
        promoted: justPromoted,
      };
    }

    return {
      success: true,
      isGameOver: false,
      promoted: justPromoted,
    };
  }
}
