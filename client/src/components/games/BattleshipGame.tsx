import React, { useState, useMemo } from 'react';
import { GameDTO, SOCKET_EVENTS, ShipPlacement, ShipType, BattleshipShot, BattleshipClientGameState } from '@couple/shared';
import { socketService } from '../../services/socket';
import {
  RotateCcw,
  Sparkles,
  Trophy,
  Shuffle,
  CheckCircle2,
  Anchor,
  Flame,
  Waves,
  Shield,
  Crosshair,
  AlertCircle,
} from 'lucide-react';

interface BattleshipGameProps {
  activeGame: GameDTO;
  user: any;
  partner: any;
  onStartNewGame: () => void;
}

const FLEET_SPECS: { type: ShipType; name: string; size: number }[] = [
  { type: 'carrier', name: 'Carrier', size: 5 },
  { type: 'battleship', name: 'Battleship', size: 4 },
  { type: 'cruiser', name: 'Cruiser', size: 3 },
  { type: 'submarine', name: 'Submarine', size: 3 },
  { type: 'destroyer', name: 'Destroyer', size: 2 },
];

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

export const BattleshipGame: React.FC<BattleshipGameProps> = ({
  activeGame,
  user,
  partner,
  onStartNewGame,
}) => {
  const state = activeGame.state as BattleshipClientGameState;
  const isFinished = activeGame.status === 'finished' || activeGame.status === 'draw';
  const isSetup = activeGame.status === 'setup';
  const isMyTurn = state?.currentTurn === user?.id;

  // Setup state
  const [selectedShipType, setSelectedShipType] = useState<ShipType>('carrier');
  const [isVertical, setIsVertical] = useState<boolean>(false);
  const [hoverCoord, setHoverCoord] = useState<{ row: number; col: number } | null>(null);

  // Mobile board tab switcher ('opponent' | 'mine')
  const [mobileTab, setMobileTab] = useState<'opponent' | 'mine'>('opponent');

  // Find placed ships for current user
  const myFleet: ShipPlacement[] = state?.myFleet || [];
  const isReady = state?.readyPlayers?.includes(user?.id);
  const isPartnerReady = state?.readyPlayers?.includes(partner?.id);

  // Shots
  const myShots: BattleshipShot[] = state?.shots?.[user?.id] || [];
  const opponentShots: BattleshipShot[] = partner?.id ? state?.shots?.[partner.id] || [] : [];

  // Cell lookups for fast rendering
  const myShipCellsMap = useMemo(() => {
    const map = new Map<string, { ship: ShipPlacement; isHit: boolean }>();
    for (const ship of myFleet) {
      for (let i = 0; i < ship.size; i++) {
        const r = ship.isVertical ? ship.row + i : ship.row;
        const c = ship.isVertical ? ship.col : ship.col + i;
        const isHit = opponentShots.some((s) => s.row === r && s.col === c && (s.result === 'hit' || s.result === 'sunk'));
        map.set(`${r},${c}`, { ship, isHit });
      }
    }
    return map;
  }, [myFleet, opponentShots]);

  const opponentShotsMap = useMemo(() => {
    const map = new Map<string, BattleshipShot>();
    for (const s of myShots) {
      map.set(`${s.row},${s.col}`, s);
    }
    return map;
  }, [myShots]);

  // Revealed opponent fleet in post-game review
  const revealedOpponentFleet: ShipPlacement[] = state?.opponentFleet || [];
  const revealedOpponentShipCellsMap = useMemo(() => {
    const map = new Map<string, ShipPlacement>();
    for (const ship of revealedOpponentFleet) {
      for (let i = 0; i < ship.size; i++) {
        const r = ship.isVertical ? ship.row + i : ship.row;
        const c = ship.isVertical ? ship.col : ship.col + i;
        map.set(`${r},${c}`, ship);
      }
    }
    return map;
  }, [revealedOpponentFleet]);

  // Selected ship spec
  const currentShipSpec = FLEET_SPECS.find((s) => s.type === selectedShipType) || FLEET_SPECS[0];
  const isSelectedShipPlaced = myFleet.some((s) => s.type === selectedShipType);

  // Preview cells for setup placement
  const previewCells = useMemo(() => {
    if (!isSetup || !hoverCoord || isSelectedShipPlaced) return [];
    const cells: { row: number; col: number; valid: boolean }[] = [];
    const size = currentShipSpec.size;
    let allValid = true;

    for (let i = 0; i < size; i++) {
      const r = isVertical ? hoverCoord.row + i : hoverCoord.row;
      const c = isVertical ? hoverCoord.col : hoverCoord.col + i;
      const withinBounds = r >= 0 && r < 10 && c >= 0 && c < 10;
      const collision = myShipCellsMap.has(`${r},${c}`);
      const valid = withinBounds && !collision;
      if (!valid) allValid = false;
      cells.push({ row: r, col: c, valid });
    }

    return cells.map((c) => ({ ...c, valid: allValid }));
  }, [isSetup, hoverCoord, isVertical, currentShipSpec, isSelectedShipPlaced, myShipCellsMap]);

  // Actions
  const handleCellClickInSetup = (row: number, col: number) => {
    if (isReady) return;

    // If clicking on an existing ship, remove it
    const existing = myShipCellsMap.get(`${row},${col}`);
    if (existing) {
      const nextFleet = myFleet.filter((s) => s.type !== existing.ship.type);
      socketService.emit(SOCKET_EVENTS.GAME_BATTLESHIP_PLACE, {
        gameId: activeGame.id,
        fleet: nextFleet,
      });
      setSelectedShipType(existing.ship.type);
      return;
    }

    // Otherwise place selected ship if not already placed
    if (isSelectedShipPlaced) return;

    // Check bounds & collision
    const size = currentShipSpec.size;
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < size; i++) {
      const r = isVertical ? row + i : row;
      const c = isVertical ? col : col + i;
      if (r < 0 || r >= 10 || c < 0 || c >= 10 || myShipCellsMap.has(`${r},${c}`)) {
        return; // Invalid placement
      }
      cells.push({ row: r, col: c });
    }

    const newShip: ShipPlacement = {
      type: currentShipSpec.type,
      size: currentShipSpec.size,
      row,
      col,
      isVertical,
      hits: 0,
      isSunk: false,
    };

    const nextFleet = [...myFleet.filter((s) => s.type !== newShip.type), newShip];
    socketService.emit(SOCKET_EVENTS.GAME_BATTLESHIP_PLACE, {
      gameId: activeGame.id,
      fleet: nextFleet,
    });

    // Auto-select next unplaced ship
    const nextUnplaced = FLEET_SPECS.find((s) => !nextFleet.some((placed) => placed.type === s.type));
    if (nextUnplaced) {
      setSelectedShipType(nextUnplaced.type);
    }
  };

  const handleRandomizeFleet = () => {
    if (isReady) return;
    socketService.emit(SOCKET_EVENTS.GAME_BATTLESHIP_RANDOMIZE, { gameId: activeGame.id });
  };

  const handleReadyFleet = () => {
    if (myFleet.length !== 5) return;
    socketService.emit(SOCKET_EVENTS.GAME_BATTLESHIP_READY, { gameId: activeGame.id });
  };

  const handleFireShot = (row: number, col: number) => {
    if (!isMyTurn || isFinished) return;
    if (opponentShotsMap.has(`${row},${col}`)) return; // Already attacked

    socketService.emit(SOCKET_EVENTS.GAME_BATTLESHIP_FIRE, {
      gameId: activeGame.id,
      target: { row, col },
    });
  };

  // Stats calculation
  const myStats = state?.stats?.[user?.id] || { shots: 0, hits: 0, misses: 0, shipsSunk: 0 };
  const accuracy = myStats.shots > 0 ? Math.round((myStats.hits / myStats.shots) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. SETUP PHASE */}
      {/* ========================================================================= */}
      {isSetup && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Anchor className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  Position Your Fleet
                  {isReady && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ready</span>}
                </h2>
                <p className="text-xs text-slate-400">
                  Secretly place all 5 ships on your water grid before the battle begins.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleRandomizeFleet}
                disabled={isReady}
                className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/15 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                <span>Randomize</span>
              </button>

              <button
                type="button"
                onClick={handleReadyFleet}
                disabled={myFleet.length !== 5 || isReady}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-glow transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isReady ? 'Ready & Waiting' : 'Confirm Ready'}</span>
              </button>
            </div>
          </div>

          {/* Partner Ready Status Bar */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${isReady ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <span className="font-semibold">Your Fleet</span>
              <span className="font-mono text-[11px]">{isReady ? '✓ Ready' : `${myFleet.length}/5 Placed`}</span>
            </div>
            <div className={`p-3 rounded-xl border flex items-center justify-between ${isPartnerReady ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-300'}`}>
              <span className="font-semibold">{partner?.displayName || 'Partner'}</span>
              <span className="font-mono text-[11px]">{isPartnerReady ? '✓ Ready' : 'Preparing...'}</span>
            </div>
          </div>

          {/* Ship Placement Controls & Fleet Selector */}
          {!isReady && (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Ship to Position:</span>
                <button
                  type="button"
                  onClick={() => setIsVertical((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Orientation: {isVertical ? 'Vertical ↕' : 'Horizontal ↔'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {FLEET_SPECS.map((ship) => {
                  const placed = myFleet.some((s) => s.type === ship.type);
                  const selected = selectedShipType === ship.type;
                  return (
                    <button
                      key={ship.type}
                      type="button"
                      onClick={() => setSelectedShipType(ship.type)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        selected
                          ? 'bg-blue-600/30 border-blue-400 text-white shadow-glow'
                          : placed
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{ship.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">({ship.size})</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {Array.from({ length: ship.size }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-sm ${
                              placed ? 'bg-emerald-400/80' : selected ? 'bg-blue-400' : 'bg-slate-600'
                            }`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Setup Grid (Your Ocean) */}
          <div className="flex flex-col items-center">
            <div className="inline-block p-3 sm:p-5 rounded-3xl bg-space-950/90 border border-blue-500/20 shadow-2xl">
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                {/* Top header: blank corner + A-J */}
                <div className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-[10px] sm:text-xs font-mono text-slate-500" />
                {COLS.map((col) => (
                  <div
                    key={col}
                    className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-[10px] sm:text-xs font-bold font-mono text-blue-400"
                  >
                    {col}
                  </div>
                ))}

                {/* 10 Rows */}
                {Array.from({ length: 10 }).map((_, r) => (
                  <React.Fragment key={r}>
                    {/* Row number label (1-10) */}
                    <div className="w-7 h-7 sm:w-10 sm:h-10 flex items-center justify-center text-[10px] sm:text-xs font-bold font-mono text-blue-400">
                      {r + 1}
                    </div>

                    {/* 10 Cells */}
                    {Array.from({ length: 10 }).map((_, c) => {
                      const key = `${r},${c}`;
                      const shipCell = myShipCellsMap.get(key);
                      const isPreview = previewCells.find((p) => p.row === r && p.col === c);

                      return (
                        <button
                          key={key}
                          type="button"
                          onMouseEnter={() => setHoverCoord({ row: r, col: c })}
                          onMouseLeave={() => setHoverCoord(null)}
                          onClick={() => handleCellClickInSetup(r, c)}
                          disabled={isReady}
                          className={`w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border transition-all flex items-center justify-center relative ${
                            shipCell
                              ? 'bg-blue-600/80 border-blue-400 shadow-sm text-white'
                              : isPreview
                              ? isPreview.valid
                                ? 'bg-emerald-500/40 border-emerald-400'
                                : 'bg-rose-500/40 border-rose-400'
                              : 'bg-white/5 border-white/10 hover:bg-blue-500/10'
                          }`}
                        >
                          {shipCell && <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-sm bg-white/80" />}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ACTIVE GAMEPLAY & POST-GAME REVIEW */}
      {/* ========================================================================= */}
      {!isSetup && (
        <div className="space-y-6">
          {/* Turn / Finished Status Banner */}
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
                {isFinished ? <Trophy className="w-5 h-5" /> : isMyTurn ? <Crosshair className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  {isFinished ? (
                    state.winner === user?.id ? (
                      <span className="text-emerald-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-yellow-400" /> Victory! You sank all enemy ships!
                      </span>
                    ) : (
                      <span className="text-rose-300">Defeat! Partner sank your fleet!</span>
                    )
                  ) : isMyTurn ? (
                    <span className="text-rose-300 flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      </span>
                      Your Turn — Choose a target coordinate to strike!
                    </span>
                  ) : (
                    <span className="text-slate-300">Waiting for {partner?.displayName || 'Partner'} to fire...</span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {isFinished
                    ? 'Review the battlefield below. Both fleets are now revealed.'
                    : isMyTurn
                    ? 'Tap any unattacked cell on the opponent ocean grid.'
                    : 'Stay alert while your opponent calculates their shot.'}
                </p>
              </div>
            </div>

            {/* Stats Pills */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                Shots: {myStats.shots}
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-emerald-400">
                Hits: {myStats.hits}
              </span>
              <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-blue-400">
                Acc: {accuracy}%
              </span>
            </div>
          </div>

          {/* Mobile Board Tab Switcher (Segmented Control) */}
          <div className="sm:hidden grid grid-cols-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setMobileTab('opponent')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                mobileTab === 'opponent' ? 'bg-blue-600 text-white shadow-glow' : 'text-slate-400'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Target Ocean</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('mine')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                mobileTab === 'mine' ? 'bg-indigo-600 text-white shadow-glow' : 'text-slate-400'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Your Fleet</span>
            </button>
          </div>

          {/* Grid Views: Side-by-Side on Desktop, Tabbed on Mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start justify-center">
            {/* ------------------------------------------------------------- */}
            {/* OPPONENT OCEAN (Target Grid) */}
            {/* ------------------------------------------------------------- */}
            <div className={`space-y-3 flex flex-col items-center ${mobileTab === 'mine' ? 'hidden sm:flex' : 'flex'}`}>
              <div className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-300">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-blue-400" />
                  {isFinished ? `${partner?.displayName || 'Partner'}'s Revealed Ocean` : 'Opponent Ocean (Target Area)'}
                </span>
                <span className="text-slate-400 font-normal normal-case">
                  {myStats.shipsSunk} / 5 Sunk
                </span>
              </div>

              <div className="p-3 sm:p-4 rounded-3xl bg-space-950/90 border border-blue-500/20 shadow-2xl">
                <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                  {/* Top Column Labels */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9" />
                  {COLS.map((c) => (
                    <div key={c} className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-blue-400">
                      {c}
                    </div>
                  ))}

                  {/* 10 Rows */}
                  {Array.from({ length: 10 }).map((_, r) => (
                    <React.Fragment key={r}>
                      <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-blue-400">
                        {r + 1}
                      </div>

                      {Array.from({ length: 10 }).map((_, c) => {
                        const key = `${r},${c}`;
                        const shot = opponentShotsMap.get(key);
                        const revealedShip = isFinished ? revealedOpponentShipCellsMap.get(key) : null;
                        const canClick = isMyTurn && !shot && !isFinished;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleFireShot(r, c)}
                            disabled={!canClick}
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border transition-all flex items-center justify-center relative ${
                              shot?.result === 'hit' || shot?.result === 'sunk'
                                ? 'bg-rose-600/80 border-rose-400 shadow-glow-rose text-white'
                                : shot?.result === 'miss'
                                ? 'bg-blue-900/40 border-blue-500/40 text-blue-300'
                                : revealedShip
                                ? 'bg-purple-900/50 border-purple-400/50'
                                : canClick
                                ? 'bg-white/5 border-white/10 hover:bg-rose-500/20 hover:border-rose-400/50 cursor-crosshair'
                                : 'bg-white/5 border-white/5 opacity-60 cursor-not-allowed'
                            }`}
                          >
                            {shot?.result === 'hit' && <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />}
                            {shot?.result === 'sunk' && <span className="text-[9px] font-bold">💥</span>}
                            {shot?.result === 'miss' && <div className="w-1.5 h-1.5 rounded-full bg-blue-300/60" />}
                            {!shot && revealedShip && <div className="w-2 h-2 rounded-sm bg-purple-300/40" />}
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* YOUR FLEET (Defending Grid) */}
            {/* ------------------------------------------------------------- */}
            <div className={`space-y-3 flex flex-col items-center ${mobileTab === 'opponent' ? 'hidden sm:flex' : 'flex'}`}>
              <div className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-300">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-400" /> Your Fleet (Under Attack)
                </span>
                <span className="text-slate-400 font-normal normal-case">
                  {myFleet.filter((s) => s.isSunk).length} / 5 Destroyed
                </span>
              </div>

              <div className="p-3 sm:p-4 rounded-3xl bg-space-950/90 border border-indigo-500/20 shadow-2xl">
                <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
                  {/* Top Column Labels */}
                  <div className="w-7 h-7 sm:w-9 sm:h-9" />
                  {COLS.map((c) => (
                    <div key={c} className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-indigo-400">
                      {c}
                    </div>
                  ))}

                  {/* 10 Rows */}
                  {Array.from({ length: 10 }).map((_, r) => (
                    <React.Fragment key={r}>
                      <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-indigo-400">
                        {r + 1}
                      </div>

                      {Array.from({ length: 10 }).map((_, c) => {
                        const key = `${r},${c}`;
                        const shipCell = myShipCellsMap.get(key);
                        const isOpponentMiss = opponentShots.some((s) => s.row === r && s.col === c && s.result === 'miss');

                        return (
                          <div
                            key={key}
                            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl border transition-all flex items-center justify-center relative ${
                              shipCell?.isHit
                                ? 'bg-rose-600/90 border-rose-400 shadow-glow-rose text-white'
                                : shipCell
                                ? 'bg-indigo-600/70 border-indigo-400/80 text-white'
                                : isOpponentMiss
                                ? 'bg-blue-950/40 border-blue-500/30 text-blue-300'
                                : 'bg-white/5 border-white/10'
                            }`}
                          >
                            {shipCell?.isHit ? (
                              <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                            ) : shipCell ? (
                              <div className="w-2.5 h-2.5 rounded-sm bg-white/70" />
                            ) : isOpponentMiss ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60" />
                            ) : null}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Post-Game Rematch Button */}
          {isFinished && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={onStartNewGame}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold shadow-glow flex items-center gap-2 transition-transform hover:scale-105"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
