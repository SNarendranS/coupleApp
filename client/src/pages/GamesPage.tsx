import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { api } from '../services/api';
import { socketService } from '../services/socket';
import { GameDTO, SOCKET_EVENTS } from '@couple/shared';
import {
  Gamepad2,
  Trophy,
  RotateCcw,
  Sparkles,
  Heart,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const GamesPage: React.FC = () => {
  const { user, partner, couple } = useAuthStore();
  const { activeGame, history, gameType, setActiveGame, setHistory, setGameType } = useGameStore();

  const [loading, setLoading] = useState(false);

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

  // 2. Realtime socket listeners for game moves, state, and finished events
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

    socketService.on(SOCKET_EVENTS.GAME_STATE, handleGameState);
    socketService.on(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);

    return () => {
      socketService.off(SOCKET_EVENTS.GAME_STATE, handleGameState);
      socketService.off(SOCKET_EVENTS.GAME_FINISHED, handleGameFinished);
    };
  }, [gameType, user]);

  // 3. Start or Restart Game
  const handleStartGame = () => {
    socketService.emit(SOCKET_EVENTS.GAME_CREATE, { type: gameType });
  };

  // 4. Make XO Move
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

  // 5. Make Bingo Call
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

  const xoState = activeGame?.type === 'xo' ? (activeGame.state as any) : null;
  const isMyTurnXO = xoState?.currentTurn === user?.id;

  const bingoState = activeGame?.type === 'bingo' ? (activeGame.state as any) : null;
  const isMyTurnBingo = bingoState?.currentTurn === user?.id;
  const myBingoBoard: number[][] = (user && bingoState?.playerBoards?.[user.id]) || [];
  const calledNumbers: number[] = bingoState?.calledNumbers || [];
  const myCompletedLines: number = (user && bingoState?.playerLinesCompleted?.[user.id]) || 0;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
            <Gamepad2 className="w-4 h-4 text-purple-400" /> Realtime 2-Player Games
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Play with {partner?.displayName || 'Partner'}
          </h1>
        </div>

        {/* Tab Switcher: Full width 50/50 on mobile, crisp and balanced */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-white/5 border border-white/10 w-full sm:w-80 shrink-0">
          <button
            type="button"
            onClick={() => setGameType('xo')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
              gameType === 'xo'
                ? 'bg-romantic-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>XO Tic-Tac-Toe</span>
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
        </div>
      </div>

      {/* Main Game Card */}
      <div className="glass-panel rounded-3xl p-4 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        {/* ========================================================= */}
        {/* XO / TIC-TAC-TOE */}
        {/* ========================================================= */}
        {gameType === 'xo' && (
          <div className="flex flex-col items-center">
            {/* Turn & Status Header */}
            <div className="text-center mb-6">
              {!activeGame || activeGame.status === 'waiting' ? (
                <p className="text-sm text-slate-400">Ready for a quick match? Start the board below.</p>
              ) : activeGame.status === 'finished' ? (
                <div className="space-y-1 animate-in zoom-in-95 duration-300">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {activeGame.winner === user?.id ? 'You Won! 🎉' : `${partner?.displayName || 'Partner'} Won! ❤️`}
                  </div>
                  <p className="text-xs text-slate-400">Bragging rights secured!</p>
                </div>
              ) : activeGame.status === 'draw' ? (
                <div className="space-y-1">
                  <span className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Romantic Tie! 🤝
                  </span>
                  <p className="text-xs text-slate-400">Two brilliant minds in love.</p>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
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
                    {isMyTurnXO ? 'Your Turn (X)' : `${partner?.displayName || 'Partner'}'s Turn (O)`}
                  </p>
                </div>
              )}
            </div>

            {/* 3x3 XO Grid: Fixed grid-rows-3 & aspect-square so cells NEVER change size */}
            <div className="grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5 w-64 h-64 sm:w-80 sm:h-80 mx-auto">
              {Array.from({ length: 9 }).map((_, index) => {
                const val = xoState?.board?.[index];
                const isWinningCell = xoState?.winningLine?.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleXOCellClick(index)}
                    disabled={
                      !activeGame ||
                      activeGame.status !== 'in_progress' ||
                      !isMyTurnXO ||
                      val !== null
                    }
                    className={`aspect-square w-full h-full rounded-2xl border flex items-center justify-center transition-all select-none ${
                      val === 'X'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-glow'
                        : val === 'O'
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : isMyTurnXO && activeGame?.status === 'in_progress'
                        ? 'bg-white/5 border-white/10 hover:bg-white/15 hover:border-romantic-400/50 cursor-pointer active:scale-95'
                        : 'bg-white/5 border-white/5 cursor-not-allowed opacity-50'
                    } ${isWinningCell ? 'ring-4 ring-amber-400 scale-105 animate-pulse' : ''}`}
                  >
                    <span className="text-3xl sm:text-4xl font-black leading-none block">
                      {val === 'X' ? '✕' : val === 'O' ? '○' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Restart / Start Game Button */}
            <div className="mt-8">
              <button
                onClick={handleStartGame}
                className="btn-romantic px-6 py-2.5 text-xs font-semibold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {!activeGame || activeGame.status !== 'in_progress' ? 'New Game' : 'Restart Match'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* COUPLE BINGO */}
        {/* ========================================================= */}
        {gameType === 'bingo' && (
          <div className="flex flex-col items-center">
            {/* Turn & Status Header */}
            <div className="text-center mb-6">
              {!activeGame || activeGame.status === 'waiting' ? (
                <p className="text-sm text-slate-400">
                  Ready to play Romantic Bingo? Each player gets a custom randomized 5x5 board.
                </p>
              ) : activeGame.status === 'finished' ? (
                <div className="space-y-1 animate-in zoom-in-95 duration-300">
                  <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    {activeGame.winner === user?.id ? 'BINGO! You Won! 🏆' : `BINGO! ${partner?.displayName || 'Partner'} Won! ❤️`}
                  </div>
                  <p className="text-xs text-slate-400">First to complete 5 lines wins the round.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 shadow-sm">
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
                      {isMyTurnBingo
                        ? 'Your Turn: Pick an uncalled number!'
                        : `Waiting for ${partner?.displayName || 'Partner'} to call a number...`}
                    </p>
                  </div>
                  {calledNumbers.length > 0 && (
                    <p className="text-xs text-slate-400">
                      Last called: <strong className="text-purple-300 font-bold">{calledNumbers[calledNumbers.length - 1]}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* B-I-N-G-O Letters Light-Up Bar */}
            <div className="flex items-center gap-2 sm:gap-3 mb-6">
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

            {/* 5x5 Bingo Board */}
            {myBingoBoard.length > 0 ? (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-sm sm:max-w-md mx-auto">
                {myBingoBoard.flat().map((num, i) => {
                  const isCalled = calledNumbers.includes(num);

                  return (
                    <button
                      key={i}
                      onClick={() => handleBingoNumberClick(num)}
                      disabled={
                        !activeGame ||
                        activeGame.status !== 'in_progress' ||
                        !isMyTurnBingo ||
                        isCalled
                      }
                      className={`h-11 sm:h-14 rounded-xl font-bold text-sm sm:text-base border transition-all flex items-center justify-center ${
                        isCalled
                          ? 'bg-romantic-600/30 text-rose-300 border-rose-500/40 shadow-sm relative overflow-hidden'
                          : isMyTurnBingo && activeGame?.status === 'in_progress'
                          ? 'bg-white/5 hover:bg-white/15 border-white/10 hover:border-purple-400 text-white cursor-pointer'
                          : 'bg-white/5 border-white/5 text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      {num}
                      {isCalled && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 absolute top-1 right-1 opacity-70" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                Click Start New Bingo to generate your boards!
              </div>
            )}

            {/* Restart / Start Game Button */}
            <div className="mt-8">
              <button
                onClick={handleStartGame}
                className="btn-romantic px-6 py-2.5 text-xs font-semibold flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {!activeGame || activeGame.status !== 'in_progress' ? 'Start New Bingo' : 'Restart Bingo'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game History List */}
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
    </div>
  );
};
