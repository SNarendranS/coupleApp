import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { GameDTO, SOCKET_EVENTS, BingoConfig, BingoFillMode } from '@couple/shared';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Sparkles,
  Heart,
  MoreVertical,
  CheckCircle2,
  Timer,
  BookOpen,
  X,
  Play,
  Shuffle,
  AlertTriangle,
  Flame,
  Check,
  Zap,
  Anchor,
  Crown,
} from 'lucide-react';
import { BattleshipGame } from '../components/games/BattleshipGame';
import { CheckersGame } from '../components/games/CheckersGame';

export const GamesPage: React.FC = () => {
  const { user, partner } = useAuthStore();
  const { activeGame, history, gameType, setActiveGame, setHistory, setGameType } = useGameStore();

  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
  const [isBingoSetupModalOpen, setIsBingoSetupModalOpen] = useState(false);

  // Bingo Setup State
  const [bingoFillMode, setBingoFillMode] = useState<BingoFillMode>('automatic');
  const [bingoDuration, setBingoDuration] = useState<number>(30);
  const [manualBoard, setManualBoard] = useState<(number | null)[][]>(
    Array.from({ length: 5 }, () => Array(5).fill(null))
  );
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  // Post-Game Mobile Tab (Your Board vs Partner Board)
  const [mobileReviewTab, setMobileReviewTab] = useState<'mine' | 'partner'>('mine');

  // Countdown timer for timed setup
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<any>(null);

  // 1. Fetch active game & history on mount / gameType change
  const fetchGame = async () => {
    setLoading(true);
    const [gameRes, histRes] = await Promise.all([
      api.get(`/games/active?type=${gameType}`),
      api.get(`/games/history?type=${gameType}`),
    ]);
    setLoading(false);

    if (gameRes.success) setActiveGame(gameRes.data);
    if (histRes.success) setHistory(histRes.data);
  };

  useEffect(() => {
    fetchGame();
  }, [gameType]);

  // 2. Realtime socket listeners & Reconnect Sync
  useEffect(() => {
    const handleGameState = (game: GameDTO) => {
      if (game.type === gameType) {
        setActiveGame(game);
      }
    };

    const handleGameFinished = (payload: { gameId: string; winner: string | null; status: string }) => {
      if (payload.winner === user?.id) {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.6 },
        });
      }
      fetchGame();
    };

    const handleReconnect = () => {
      // Re-fetch authoritative state upon reconnect
      fetchGame();
    };

    socketService.on(SOCKET_EVENTS.GAME_STATE, handleGameState);
    socketService.on(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
    socketService.on(SOCKET_EVENTS.CONNECT, handleReconnect);

    return () => {
      socketService.off(SOCKET_EVENTS.GAME_STATE, handleGameState);
      socketService.off(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
      socketService.off(SOCKET_EVENTS.CONNECT, handleReconnect);
    };
  }, [gameType, user]);

  // 3. Timed Setup Countdown synchronization
  useEffect(() => {
    if (activeGame?.type === 'bingo' && activeGame?.status === 'setup') {
      const config = activeGame.config as BingoConfig | undefined;
      if (config?.fillMode === 'timed' && config?.setupStartedAt && config?.timeLimitSeconds) {
        const calculateRemaining = () => {
          const startedAt = new Date(config.setupStartedAt!).getTime();
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          const remaining = Math.max(0, config.timeLimitSeconds! - elapsed);
          return remaining;
        };

        setTimeLeft(calculateRemaining());

        timerRef.current = setInterval(() => {
          const remaining = calculateRemaining();
          setTimeLeft(remaining);

          if (remaining <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            // Authoritative auto-fill request on timeout
            socketService.emit(SOCKET_EVENTS.GAME_AUTOFILL, { gameId: activeGame.id });
          }
        }, 1000);

        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      }
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(0);
    }
  }, [activeGame]);

  // Synchronize manual board from activeGame state if returning
  useEffect(() => {
    if (activeGame?.type === 'bingo' && activeGame?.status === 'setup' && user?.id) {
      const existing = (activeGame.state as any)?.playerBoards?.[user.id];
      if (existing && Array.isArray(existing) && existing.length === 5) {
        setManualBoard(existing);
      }
    }
  }, [activeGame, user]);

  // 4. Game Action Handlers
  const handleStartGame = (type: 'xo' | 'bingo' | 'battleship' | 'checkers') => {
    if (type === 'bingo') {
      setIsBingoSetupModalOpen(true);
    } else if (type === 'battleship') {
      socketService.emit(SOCKET_EVENTS.GAME_CREATE, { type: 'battleship' });
    } else if (type === 'checkers') {
      socketService.emit(SOCKET_EVENTS.GAME_CREATE, { type: 'checkers' });
    } else {
      socketService.emit(SOCKET_EVENTS.GAME_CREATE, { type: 'xo' });
    }
  };

  const handleLaunchBingoSetup = () => {
    setIsBingoSetupModalOpen(false);
    const config: BingoConfig = {
      fillMode: bingoFillMode,
      timeLimitSeconds: bingoDuration,
    };
    socketService.emit(SOCKET_EVENTS.GAME_CREATE, { type: 'bingo', config });
  };

  const handleConfirmRestart = () => {
    if (!activeGame) return;
    socketService.emit(SOCKET_EVENTS.GAME_RESTART, { gameId: activeGame.id });
    setIsRestartConfirmOpen(false);
    setIsMenuOpen(false);
  };

  const handleEndGame = () => {
    if (!activeGame) return;
    socketService.emit(SOCKET_EVENTS.GAME_END, { gameId: activeGame.id });
    setIsMenuOpen(false);
  };

  // 5. XO Move Handler
  const handleXOCellClick = (cellIndex: number) => {
    if (!activeGame || activeGame.status !== 'in_progress') return;
    const xoState = activeGame.state as any;
    if (xoState.currentTurn !== user?.id) return;
    if (xoState.board[cellIndex] !== null) return;

    socketService.emit(SOCKET_EVENTS.GAME_MOVE, {
      gameId: activeGame.id,
      move: { cellIndex },
    });
  };

  // 6. Bingo Manual Board Placement
  const handleSelectNumberForCell = (num: number) => {
    // Find next empty cell if none selected
    let targetR = selectedCell?.r ?? -1;
    let targetC = selectedCell?.c ?? -1;

    if (targetR === -1 || targetC === -1) {
      outer: for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (manualBoard[r][c] === null) {
            targetR = r;
            targetC = c;
            break outer;
          }
        }
      }
    }

    if (targetR !== -1 && targetC !== -1) {
      const nextBoard = manualBoard.map((row, rIdx) =>
        row.map((val, cIdx) => (rIdx === targetR && cIdx === targetC ? num : val))
      );
      setManualBoard(nextBoard);

      // Advance selection to next empty cell
      let nextR = -1;
      let nextC = -1;
      outer2: for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (nextBoard[r][c] === null) {
            nextR = r;
            nextC = c;
            break outer2;
          }
        }
      }
      setSelectedCell(nextR !== -1 ? { r: nextR, c: nextC } : null);
    }
  };

  const handleCellClickInSetup = (r: number, c: number) => {
    if (manualBoard[r][c] !== null) {
      // Clear cell on tap if already filled
      const nextBoard = manualBoard.map((row, rIdx) =>
        row.map((val, cIdx) => (rIdx === r && cIdx === c ? null : val))
      );
      setManualBoard(nextBoard);
      setSelectedCell({ r, c });
    } else {
      setSelectedCell({ r, c });
    }
  };

  const handleAutoFillBoard = () => {
    if (!activeGame) return;
    socketService.emit(SOCKET_EVENTS.GAME_AUTOFILL, { gameId: activeGame.id });
  };

  const handleSubmitBoard = () => {
    if (!activeGame) return;
    socketService.emit(SOCKET_EVENTS.GAME_SUBMIT_BOARD, {
      gameId: activeGame.id,
      board: manualBoard,
    });
  };

  // 7. Bingo Call Number Handler
  const handleBingoNumberClick = (calledNumber: number) => {
    if (!activeGame || activeGame.status !== 'in_progress') return;
    const bingoState = activeGame.state as any;
    if (bingoState.currentTurn !== user?.id) return;
    if (bingoState.calledNumbers.includes(calledNumber)) return;

    socketService.emit(SOCKET_EVENTS.GAME_MOVE, {
      gameId: activeGame.id,
      move: { calledNumber },
    });
  };

  // Derived Values
  const isXOGame = gameType === 'xo';
  const xoState = isXOGame ? (activeGame?.state as any) : null;
  const isMyTurnXO = xoState?.currentTurn === user?.id;

  const isBingoGame = gameType === 'bingo';
  const bingoState = isBingoGame ? (activeGame?.state as any) : null;
  const isMyTurnBingo = bingoState?.currentTurn === user?.id;
  const myBingoBoard: number[][] = (user && bingoState?.playerBoards?.[user.id]) || [];
  const partnerBingoBoard: number[][] = (partner && bingoState?.playerBoards?.[partner.id]) || [];
  const calledNumbers: number[] = bingoState?.calledNumbers || [];
  const myCompletedLines: number = (user && bingoState?.playerLinesCompleted?.[user.id]) || 0;
  const partnerCompletedLines: number = (partner && bingoState?.playerLinesCompleted?.[partner.id]) || 0;

  // Bingo Manual Setup numbers placed
  const placedNumbers = useMemo(() => {
    const set = new Set<number>();
    manualBoard.flat().forEach((val) => {
      if (typeof val === 'number') set.add(val);
    });
    return set;
  }, [manualBoard]);

  const isManualBoardComplete = placedNumbers.size === 25;
  const isPlayerReady = user && bingoState?.readyPlayers?.includes(user.id);

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header & Game Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Gamepad2 className="w-4 h-4 text-purple-400" /> Realtime 2-Player Games
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Play with {partner?.displayName || 'Partner'}
          </h1>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-full sm:w-auto shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setGameType('xo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              gameType === 'xo'
                ? 'bg-romantic-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>XO Match</span>
          </button>
          <button
            type="button"
            onClick={() => setGameType('bingo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              gameType === 'bingo'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Couple Bingo</span>
          </button>
          <button
            type="button"
            onClick={() => setGameType('battleship')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              gameType === 'battleship'
                ? 'bg-blue-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Anchor className="w-3.5 h-3.5" />
            <span>Battleship</span>
          </button>
          <button
            type="button"
            onClick={() => setGameType('checkers')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              gameType === 'checkers'
                ? 'bg-purple-600 text-white shadow-glow-purple'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Checkers</span>
          </button>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="glass-panel rounded-3xl p-4 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* Top-Right Session Action Menu (⋮) */}
        <div className="absolute top-4 right-4 z-20">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
              title="Game Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-space-950/95 border border-white/15 backdrop-blur-md shadow-2xl py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsRulesModalOpen(true);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>Game Rules</span>
                </button>

                {activeGame && activeGame.status === 'in_progress' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsRestartConfirmOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 flex items-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restart Match</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleEndGame();
                      }}
                      className="w-full px-3.5 py-2 text-left text-slate-400 hover:text-rose-400 hover:bg-white/5 flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>End Match</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* 1. XO TIC-TAC-TOE */}
        {/* ========================================================= */}
        {isXOGame && (
          <div className="flex flex-col items-center">
            {/* Status Header */}
            <div className="text-center mb-6">
              {!activeGame || activeGame.status === 'waiting' ? (
                <p className="text-sm text-slate-400">Ready for a romantic match? Start the board below.</p>
              ) : activeGame.status === 'finished' ? (
                <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 shadow-md">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {activeGame.winner === user?.id ? 'You Won the Match! 🎉' : `${partner?.displayName || 'Partner'} Won! ❤️`}
                  </div>
                  <p className="text-xs text-slate-400">
                    Finished in {xoState?.movesCount || 0} moves. Completed board preserved for review.
                  </p>
                </div>
              ) : activeGame.status === 'draw' ? (
                <div className="space-y-1.5 animate-in zoom-in-95 duration-300">
                  <span className="text-xs font-bold px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Romantic Tie! 🤝
                  </span>
                  <p className="text-xs text-slate-400">Two brilliant minds in love. Full board completed.</p>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    {isMyTurnXO && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isMyTurnXO ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-500'
                      }`}
                    />
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white">
                    {isMyTurnXO ? 'Your Turn (X)' : `Waiting for ${partner?.displayName || 'Partner'} (O)...`}
                  </p>
                </div>
              )}
            </div>

            {/* 3x3 XO Grid (Board remains visible in both active and post-game review states) */}
            <div className="grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5 w-64 h-64 sm:w-80 sm:h-80 mx-auto">
              {Array.from({ length: 9 }).map((_, index) => {
                const val = xoState?.board?.[index];
                const isWinningCell = xoState?.winningLine?.includes(index);
                const isGameFinished = activeGame?.status === 'finished' || activeGame?.status === 'draw';

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleXOCellClick(index)}
                    disabled={!activeGame || activeGame.status !== 'in_progress' || !isMyTurnXO || val !== null}
                    className={`aspect-square w-full h-full rounded-2xl border flex items-center justify-center transition-all select-none ${
                      val === 'X'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-glow'
                        : val === 'O'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : isMyTurnXO && activeGame?.status === 'in_progress'
                        ? 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-romantic-400/50 cursor-pointer active:scale-95'
                        : 'bg-white/5 border-white/5 cursor-not-allowed opacity-50'
                    } ${isWinningCell ? 'ring-4 ring-amber-400 scale-105 animate-pulse bg-amber-500/20' : ''}`}
                  >
                    <span className="text-3xl sm:text-4xl font-black leading-none block">
                      {val === 'X' ? '✕' : val === 'O' ? '○' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* New Game Button (Only visible if game is finished, draw, or unstarted — NEVER during active play) */}
            {(!activeGame || activeGame.status === 'finished' || activeGame.status === 'draw' || activeGame.status === 'cancelled') && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  type="button"
                  onClick={() => handleStartGame('xo')}
                  className="btn-romantic px-8 py-3 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-glow"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start New Match</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. COUPLE BINGO */}
        {/* ========================================================= */}
        {isBingoGame && (
          <div className="flex flex-col items-center">
            {/* Phase 2A: Unstarted / Setup Launcher */}
            {(!activeGame || activeGame.status === 'cancelled') && (
              <div className="text-center py-10 space-y-4 max-w-md">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-serif text-xl font-bold text-white">Romantic Couple Bingo</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Race to complete 5 lines across rows, columns, or diagonals! You can manually customize your board or generate it automatically.
                </p>
                <button
                  type="button"
                  onClick={() => setIsBingoSetupModalOpen(true)}
                  className="btn-romantic px-7 py-3 text-xs font-semibold flex items-center gap-2 mx-auto shadow-glow"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Configure & Start Bingo</span>
                </button>
              </div>
            )}

            {/* Phase 2B: SETUP PHASE (Manual or Timed Manual Board Input) */}
            {activeGame && activeGame.status === 'setup' && (
              <div className="w-full max-w-md mx-auto space-y-4">
                {/* Setup Header & Timer */}
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Pre-Game Board Setup
                    </span>
                    {(activeGame.config as BingoConfig | undefined)?.fillMode === 'timed' && (
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border transition-colors ${
                          timeLeft <= 5
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : timeLeft <= 10
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/5 text-slate-300 border-white/10'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>{timeLeft}s</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Tap a cell and select numbers (1-25) to place them on your private board.
                  </p>
                </div>

                {/* 5x5 Setup Board */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full aspect-square">
                  {manualBoard.map((row, r) =>
                    row.map((val, c) => {
                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;

                      return (
                        <button
                          key={`${r}-${c}`}
                          type="button"
                          onClick={() => handleCellClickInSetup(r, c)}
                          disabled={isPlayerReady}
                          className={`aspect-square rounded-xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center select-none ${
                            val !== null
                              ? 'bg-purple-600/30 border-purple-500/50 text-white shadow-sm'
                              : isSelected
                              ? 'border-romantic-400 bg-romantic-500/20 text-rose-300 ring-2 ring-rose-400/50'
                              : 'border-dashed border-white/20 bg-white/5 hover:bg-white/10 text-slate-500'
                          }`}
                        >
                          {val ?? ''}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Number Palette (1 - 25) - Touch Friendly without OS virtual keyboard */}
                {!isPlayerReady && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Available Numbers ({25 - placedNumbers.size} left):</span>
                      <button
                        type="button"
                        onClick={handleAutoFillBoard}
                        className="text-romantic-400 hover:text-romantic-300 font-semibold flex items-center gap-1 active:scale-95"
                      >
                        <Shuffle className="w-3.5 h-3.5" /> Auto-Fill Remaining
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 max-h-36 overflow-y-auto p-1 rounded-2xl bg-white/5 border border-white/10">
                      {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
                        const isPlaced = placedNumbers.has(n);

                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleSelectNumberForCell(n)}
                            disabled={isPlaced}
                            className={`h-8 sm:h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                              isPlaced
                                ? 'bg-white/5 text-slate-600 border border-transparent cursor-not-allowed opacity-40'
                                : 'bg-white/10 hover:bg-romantic-600 border border-white/10 text-white hover:border-transparent active:scale-95'
                            }`}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>

                    {/* Submit Board Button */}
                    <button
                      type="button"
                      onClick={handleSubmitBoard}
                      disabled={!isManualBoardComplete}
                      className="btn-romantic w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-glow mt-3"
                    >
                      <Check className="w-4 h-4" />
                      <span>Lock Board & Ready</span>
                    </button>
                  </div>
                )}

                {/* Ready Status Banner */}
                {isPlayerReady && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Your board is locked! Waiting for {partner?.displayName || 'partner'} to ready up...</span>
                  </div>
                )}
              </div>
            )}

            {/* Phase 2C: ACTIVE GAMEPLAY (Authoritative Turn-based Play) */}
            {activeGame && activeGame.status === 'in_progress' && (
              <div className="flex flex-col items-center w-full max-w-md mx-auto">
                {/* Turn Header */}
                <div className="text-center mb-5 space-y-2">
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                      {isMyTurnBingo && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isMyTurnBingo ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]' : 'bg-slate-500'
                        }`}
                      />
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white">
                      {isMyTurnBingo ? 'Your Turn: Tap an uncalled number!' : `Waiting for ${partner?.displayName || 'Partner'} to call...`}
                    </p>
                  </div>

                  {calledNumbers.length > 0 && (
                    <p className="text-xs text-slate-400">
                      Last called: <strong className="text-purple-300 font-bold text-sm">{calledNumbers[calledNumbers.length - 1]}</strong>
                      <span className="text-[11px] text-slate-500 ml-2 font-mono">({calledNumbers.length} total)</span>
                    </p>
                  )}
                </div>

                {/* B-I-N-G-O Letters Light-Up Bar */}
                <div className="flex items-center gap-2 sm:gap-3 mb-5">
                  {['B', 'I', 'N', 'G', 'O'].map((letter, i) => {
                    const isCompleted = myCompletedLines > i;
                    return (
                      <div
                        key={letter}
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base border transition-all ${
                          isCompleted
                            ? 'bg-gradient-to-tr from-romantic-600 to-purple-600 text-white border-white/20 shadow-glow scale-110'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>

                {/* 5x5 Active Bingo Board */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full aspect-square">
                  {myBingoBoard.flat().map((num, i) => {
                    const isCalled = calledNumbers.includes(num);

                    return (
                      <button
                        key={i}
                        onClick={() => handleBingoNumberClick(num)}
                        disabled={!isMyTurnBingo || isCalled}
                        className={`aspect-square rounded-xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center relative select-none ${
                          isCalled
                            ? 'bg-romantic-600/30 text-rose-300 border-rose-500/40 shadow-sm'
                            : isMyTurnBingo
                            ? 'bg-white/5 hover:bg-white/15 border-white/10 hover:border-purple-400 text-white cursor-pointer active:scale-95'
                            : 'bg-white/5 border-white/5 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {num}
                        {isCalled && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 absolute top-1 right-1 opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Phase 2D: POST-GAME REVIEW (Both Completed Boards Side-by-Side on Desktop, Stacked on Mobile) */}
            {activeGame && activeGame.status === 'finished' && (
              <div className="w-full space-y-6">
                {/* Winner / Stats Celebration Banner */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-500/20 text-amber-300 text-xs sm:text-sm font-bold border border-amber-500/30 shadow-glow">
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span>
                      {activeGame.winner === user?.id ? 'BINGO! You Won! 🏆' : `BINGO! ${partner?.displayName || 'Partner'} Won! ❤️`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Completed 5 lines in {calledNumbers.length} called numbers. Full match history preserved below.
                  </p>
                </div>

                {/* Mobile Tab Switcher for Post-Game Review */}
                <div className="sm:hidden grid grid-cols-2 p-1 rounded-2xl bg-white/5 border border-white/10 w-64 mx-auto text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMobileReviewTab('mine')}
                    className={`py-1.5 rounded-xl transition-all ${
                      mobileReviewTab === 'mine' ? 'bg-romantic-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    Your Board ({myCompletedLines} lines)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileReviewTab('partner')}
                    className={`py-1.5 rounded-xl transition-all ${
                      mobileReviewTab === 'partner' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400'
                    }`}
                  >
                    {partner?.displayName || 'Partner'} ({partnerCompletedLines} lines)
                  </button>
                </div>

                {/* Completed Boards Display: Side-by-Side on Desktop, Responsive Tab/Stacked on Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl mx-auto">
                  {/* Your Board */}
                  <div
                    className={`glass-panel rounded-2xl p-4 border border-white/10 space-y-2.5 ${
                      mobileReviewTab !== 'mine' ? 'hidden sm:block' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>Your Board</span>
                      <span className="text-rose-300 font-mono">{myCompletedLines} / 5 Lines</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 aspect-square">
                      {myBingoBoard.flat().map((num, i) => {
                        const isCalled = calledNumbers.includes(num);
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg font-bold text-xs sm:text-sm border flex items-center justify-center ${
                              isCalled
                                ? 'bg-rose-500/25 text-rose-300 border-rose-500/40 font-black'
                                : 'bg-white/5 text-slate-500 border-white/5'
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Partner Board */}
                  <div
                    className={`glass-panel rounded-2xl p-4 border border-white/10 space-y-2.5 ${
                      mobileReviewTab !== 'partner' ? 'hidden sm:block' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-white">
                      <span>{partner?.displayName || 'Partner'}'s Board</span>
                      <span className="text-purple-300 font-mono">{partnerCompletedLines} / 5 Lines</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 aspect-square">
                      {partnerBingoBoard.flat().map((num, i) => {
                        const isCalled = calledNumbers.includes(num);
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-lg font-bold text-xs sm:text-sm border flex items-center justify-center ${
                              isCalled
                                ? 'bg-purple-500/25 text-purple-300 border-purple-500/40 font-black'
                                : 'bg-white/5 text-slate-500 border-white/5'
                            }`}
                          >
                            {num}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* New Bingo Match Button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBingoSetupModalOpen(true)}
                    className="btn-romantic px-8 py-3 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-glow"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Another Round</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. BATTLESHIP */}
        {/* ========================================================= */}
        {gameType === 'battleship' && (
          <div>
            {!activeGame || activeGame.status === 'waiting' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-glow">
                  <Anchor className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Battleship with {partner?.displayName || 'Partner'}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Secretly position your 5-ship fleet on your ocean grid, then take turns calling coordinates to sink your partner's armada!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartGame('battleship')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-glow flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Battleship Match</span>
                </button>
              </div>
            ) : (
              <BattleshipGame
                activeGame={activeGame}
                user={user}
                partner={partner}
                onStartNewGame={() => handleStartGame('battleship')}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. CHECKERS */}
        {/* ========================================================= */}
        {gameType === 'checkers' && (
          <div>
            {!activeGame || activeGame.status === 'waiting' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-glow">
                  <Crown className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Checkers with {partner?.displayName || 'Partner'}</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Classic 8×8 American Checkers with mandatory captures, multiple jumps, and king promotions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleStartGame('checkers')}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-romantic-600 hover:from-purple-500 hover:to-romantic-500 text-white font-bold text-sm shadow-glow flex items-center gap-2 transition-transform hover:scale-105"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Checkers Match</span>
                </button>
              </div>
            ) : (
              <CheckersGame
                activeGame={activeGame}
                user={user}
                partner={partner}
                onStartNewGame={() => handleStartGame('checkers')}
              />
            )}
          </div>
        )}
      </div>

      {/* Match History Card */}
      {history.length > 0 && (
        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" /> Recent Match History
          </h3>
          <div className="divide-y divide-white/5">
            {history.map((h: any) => (
              <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase text-slate-400 text-[10px] px-2 py-0.5 rounded bg-white/5">
                    {h.type}
                  </span>
                  <span className="text-slate-300">
                    Winner: <strong className="text-white">{h.winner?.displayName || 'Tie Match'}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">
                  {h.finishedAt ? new Date(h.finishedAt).toLocaleDateString() : 'Finished'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* 1. Bingo Setup Modal */}
      {isBingoSetupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white font-serif">Bingo Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBingoSetupModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-2">Number Filling Mode</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'automatic', title: 'Automatic', desc: 'Instant boards' },
                    { id: 'timed', title: 'Timed Manual', desc: 'With timer' },
                    { id: 'manual', title: 'Manual', desc: 'Full choice' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setBingoFillMode(m.id as BingoFillMode)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        bingoFillMode === m.id
                          ? 'border-purple-400 bg-purple-500/20 text-white shadow-glow'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      <strong className="text-xs block">{m.title}</strong>
                      <span className="text-[10px] text-slate-400 mt-1">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timed Configuration */}
              {bingoFillMode === 'timed' && (
                <div className="space-y-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <label className="block text-xs font-semibold text-slate-200">Setup Timer Duration</label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[15, 30, 60, 90].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setBingoDuration(dur)}
                        className={`py-1.5 rounded-lg border font-bold font-mono text-center transition-all ${
                          bingoDuration === dur
                            ? 'border-purple-400 bg-purple-600 text-white shadow-sm'
                            : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {dur}s
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    If the countdown reaches zero, empty cells are automatically filled with random numbers.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleLaunchBingoSetup}
                className="btn-romantic w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-glow"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Match</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Restart Confirmation Modal */}
      {isRestartConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">Restart this match?</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                The current match is still active. Restarting will end the current session and start fresh for both of you.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRestartConfirmOpen(false)}
                className="flex-1 btn-secondary py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestart}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-glow transition-colors"
              >
                Restart Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Game Rules Modal */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-space-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white font-serif">Game Rules</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div>
                <strong className="text-white block font-serif">XO Tic-Tac-Toe</strong>
                <p>
                  Take turns placing X and O. First player to align 3 consecutive marks horizontally, vertically, or diagonally wins the match.
                </p>
              </div>

              <div>
                <strong className="text-white block font-serif">Couple Bingo</strong>
                <p>
                  Each partner gets a 5x5 board filled with unique numbers 1 through 25. Players alternate calling an uncalled number. When a number is called, both players mark it. First player to complete 5 full lines (horizontal, vertical, or diagonal) calls BINGO and wins!
                </p>
              </div>

              <div>
                <strong className="text-white block font-serif">🚢 Battleship</strong>
                <p>
                  Secretly arrange your 5-ship fleet (Carrier, Battleship, Cruiser, Submarine, Destroyer) on your 10×10 ocean. Take turns calling coordinates to attack. Hits and misses appear on the target ocean; sinking all enemy ships claims victory!
                </p>
              </div>

              <div>
                <strong className="text-white block font-serif">♟️ Checkers</strong>
                <p>
                  Classic 8×8 American Checkers on dark squares. Pieces move diagonally forward. <strong>Mandatory capture:</strong> if any jump is available on your turn, you must jump! Reaching the enemy back rank crowns a King with multi-directional movement.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
