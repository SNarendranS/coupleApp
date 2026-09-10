import React, { useState, useMemo } from 'react';
import { GameDTO, SOCKET_EVENTS, CheckersPiece, CheckersGameState } from '@couple/shared';
import { socketService } from '../../services/socket';
import { Crown, Sparkles, Trophy, RotateCcw, Zap, Flame, Shield } from 'lucide-react';

interface CheckersGameProps {
  activeGame: GameDTO;
  user: any;
  partner: any;
  onStartNewGame: () => void;
}

interface MoveDest {
  row: number;
  col: number;
  isJump: boolean;
}

export const CheckersGame: React.FC<CheckersGameProps> = ({
  activeGame,
  user,
  partner,
  onStartNewGame,
}) => {
  const state = activeGame.state as CheckersGameState;
  const isFinished = activeGame.status === 'finished' || activeGame.status === 'draw';
  const isMyTurn = state?.currentTurn === user?.id;

  const [playerA, playerB] = state?.players || [];
  const isPlayerA = user?.id === playerA;

  const [selectedCoord, setSelectedCoord] = useState<{ row: number; col: number } | null>(null);

  const pieces: CheckersPiece[] = state?.pieces || [];
  const activePieceId = state?.activePieceId;
  const isConsecutiveJump = state?.consecutiveJumps;

  // Build piece map for fast coordinate lookups
  const pieceMap = useMemo(() => {
    const map = new Map<string, CheckersPiece>();
    for (const p of pieces) {
      map.set(`${p.row},${p.col}`, p);
    }
    return map;
  }, [pieces]);

  // Client-side legal moves calculation for UI responsiveness and highlighting
  const { legalMovesByPiece, hasAnyJumps } = useMemo(() => {
    if (!isMyTurn || isFinished) {
      return { legalMovesByPiece: new Map<string, MoveDest[]>(), hasAnyJumps: false };
    }

    const myPieces = pieces.filter((p) => p.player === user?.id);
    const movesMap = new Map<string, MoveDest[]>();
    let anyJumpAvailable = false;

    // Helper to get moves for one piece
    const getMoves = (p: CheckersPiece) => {
      const rowDirs = p.isKing ? [-1, 1] : isPlayerA ? [1] : [-1];
      const colDirs = [-1, 1];
      const jumps: MoveDest[] = [];
      const regular: MoveDest[] = [];

      for (const dr of rowDirs) {
        for (const dc of colDirs) {
          const stepR = p.row + dr;
          const stepC = p.col + dc;

          if (stepR >= 0 && stepR < 8 && stepC >= 0 && stepC < 8) {
            const occ = pieceMap.get(`${stepR},${stepC}`);
            if (!occ) {
              regular.push({ row: stepR, col: stepC, isJump: false });
            } else if (occ.player !== p.player) {
              const jumpR = p.row + dr * 2;
              const jumpC = p.col + dc * 2;
              if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
                if (!pieceMap.has(`${jumpR},${jumpC}`)) {
                  jumps.push({ row: jumpR, col: jumpC, isJump: true });
                }
              }
            }
          }
        }
      }
      return { regular, jumps };
    };

    // If locked to activePieceId in multi-jump
    if (activePieceId) {
      const activePiece = myPieces.find((p) => p.id === activePieceId);
      if (activePiece) {
        const { jumps } = getMoves(activePiece);
        if (jumps.length > 0) {
          movesMap.set(`${activePiece.row},${activePiece.col}`, jumps);
          anyJumpAvailable = true;
        }
      }
      return { legalMovesByPiece: movesMap, hasAnyJumps: anyJumpAvailable };
    }

    // Check all pieces for jumps first (Mandatory capture rule)
    for (const p of myPieces) {
      const { jumps } = getMoves(p);
      if (jumps.length > 0) {
        movesMap.set(`${p.row},${p.col}`, jumps);
        anyJumpAvailable = true;
      }
    }

    // If jumps exist, ONLY jumps are allowed!
    if (anyJumpAvailable) {
      return { legalMovesByPiece: movesMap, hasAnyJumps: true };
    }

    // If no jumps, calculate regular moves
    for (const p of myPieces) {
      const { regular } = getMoves(p);
      if (regular.length > 0) {
        movesMap.set(`${p.row},${p.col}`, regular);
      }
    }

    return { legalMovesByPiece: movesMap, hasAnyJumps: false };
  }, [pieces, isMyTurn, isFinished, user?.id, isPlayerA, activePieceId, pieceMap]);

  // Selected piece destinations
  const currentLegalDestinations: MoveDest[] = useMemo(() => {
    if (!selectedCoord) return [];
    return legalMovesByPiece.get(`${selectedCoord.row},${selectedCoord.col}`) || [];
  }, [selectedCoord, legalMovesByPiece]);

  // Cell click handler
  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn || isFinished) return;

    const clickedPiece = pieceMap.get(`${r},${c}`);

    // If clicking on one of own pieces that has legal moves, select it
    if (clickedPiece && clickedPiece.player === user?.id) {
      const moves = legalMovesByPiece.get(`${r},${c}`);
      if (moves && moves.length > 0) {
        setSelectedCoord({ row: r, col: c });
        return;
      }
    }

    // If a piece is already selected, check if clicking a legal destination
    if (selectedCoord) {
      const dest = currentLegalDestinations.find((d) => d.row === r && d.col === c);
      if (dest) {
        socketService.emit(SOCKET_EVENTS.GAME_CHECKERS_MOVE, {
          gameId: activeGame.id,
          from: selectedCoord,
          to: { row: r, col: c },
        });
        setSelectedCoord(null);
        return;
      }
    }

    // Deselect if clicking anywhere else
    if (!activePieceId) {
      setSelectedCoord(null);
    }
  };

  // Captures count
  const myCaptures = state?.captures?.[user?.id] || 0;
  const partnerCaptures = partner?.id ? state?.captures?.[partner.id] || 0 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Turn / Win Status Banner */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isFinished
            ? state.winner === user?.id
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            : isMyTurn
            ? 'bg-gradient-to-r from-rose-950/40 to-romantic-950/40 border-rose-500/30 text-white'
            : 'bg-white/5 border-white/10 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isFinished
                ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
                : isMyTurn
                ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-white/10 text-slate-400'
            }`}
          >
            {isFinished ? <Trophy className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              {isFinished ? (
                state.winner === user?.id ? (
                  <span className="text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-yellow-400" /> Checkmate! You won the match!
                  </span>
                ) : (
                  <span className="text-rose-300">Defeat! Partner won the match!</span>
                )
              ) : isMyTurn ? (
                <span className="text-rose-300 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                  </span>
                  Your Turn — Move or Jump!
                </span>
              ) : (
                <span className="text-slate-300">Waiting for {partner?.displayName || 'Partner'} to move...</span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {isFinished
                ? 'The match has ended. Completed board is preserved below.'
                : hasAnyJumps
                ? 'Mandatory capture rule in effect! You must jump.'
                : isConsecutiveJump
                ? 'Double jump available! Continue capturing.'
                : isMyTurn
                ? 'Tap any piece with highlighted moves to select destination.'
                : 'Partner is contemplating their next maneuver.'}
            </p>
          </div>
        </div>

        {/* Captures Pill Badges */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-rose-300">
            You: {myCaptures} captured
          </span>
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-purple-300">
            {partner?.displayName || 'Partner'}: {partnerCaptures} captured
          </span>
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
            Moves: {state.movesCount || 0}
          </span>
        </div>
      </div>

      {/* Mandatory Jump Callout Alert */}
      {isMyTurn && !isFinished && hasAnyJumps && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2 animate-bounce">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Mandatory Capture:</strong> You have an opponent piece available to jump! Non-capturing moves are disabled.
          </span>
        </div>
      )}

      {/* Multi-Jump Continuation Alert */}
      {isMyTurn && !isFinished && isConsecutiveJump && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
          <span>
            <strong>Consecutive Jump:</strong> Another jump is available with the same piece! Complete your sequence.
          </span>
        </div>
      )}

      {/* Checkers 8x8 Board */}
      <div className="flex justify-center">
        <div className="p-3 sm:p-5 rounded-3xl bg-space-950/90 border border-purple-500/20 shadow-2xl w-full max-w-[480px]">
          <div className="grid grid-cols-8 gap-1 sm:gap-1.5 aspect-square w-full">
            {Array.from({ length: 8 }).map((_, r) =>
              Array.from({ length: 8 }).map((_, c) => {
                const key = `${r},${c}`;
                const isDark = (r + c) % 2 === 1;
                const piece = pieceMap.get(key);
                const isSelected = selectedCoord?.row === r && selectedCoord?.col === c;
                const isDestination = currentLegalDestinations.some((d) => d.row === r && d.col === c);
                const hasMoves = legalMovesByPiece.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    disabled={!isDark}
                    className={`aspect-square rounded-lg sm:rounded-xl border transition-all flex items-center justify-center relative select-none ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-800/30 border-slate-700/20 cursor-default'
                    } ${
                      isSelected
                        ? 'ring-2 ring-rose-400 bg-rose-950/40'
                        : isDestination
                        ? 'bg-emerald-950/40 border-emerald-400/80 shadow-glow-emerald cursor-pointer'
                        : ''
                    }`}
                  >
                    {/* Legal Move Dot Marker */}
                    {isDestination && (
                      <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 rounded-full bg-emerald-400/70 shadow-glow-emerald animate-pulse" />
                    )}

                    {/* Piece */}
                    {piece && (
                      <div
                        className={`w-4/5 h-4/5 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shadow-lg transition-transform ${
                          piece.player === user?.id
                            ? 'bg-gradient-to-br from-rose-500 to-romantic-600 text-white border-2 border-rose-300 shadow-glow-rose'
                            : 'bg-gradient-to-br from-purple-500 to-indigo-700 text-white border-2 border-purple-300 shadow-glow-purple'
                        } ${isSelected ? 'scale-110' : hasMoves ? 'ring-2 ring-white/60 animate-pulse' : ''}`}
                      >
                        {piece.isKing ? (
                          <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-300 fill-yellow-300 drop-shadow" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/40" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Post-Game Rematch Button */}
      {isFinished && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={onStartNewGame}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-romantic-600 hover:from-purple-500 hover:to-romantic-500 text-white text-sm font-bold shadow-glow flex items-center gap-2 transition-transform hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      )}
    </div>
  );
};
