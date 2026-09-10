import {
  ShipPlacement,
  ShipType,
  BattleshipBoardConfig,
  BattleshipShot,
  BattleshipClientGameState,
} from '@couple/shared';

export const FLEET_DEFINITIONS: Record<'classic' | 'small', { type: ShipType; size: number }[]> = {
  classic: [
    { type: 'carrier', size: 5 },
    { type: 'battleship', size: 4 },
    { type: 'cruiser', size: 3 },
    { type: 'submarine', size: 3 },
    { type: 'destroyer', size: 2 },
  ],
  small: [
    { type: 'battleship', size: 4 },
    { type: 'cruiser', size: 3 },
    { type: 'submarine', size: 3 },
    { type: 'destroyer', size: 2 },
  ],
};

export class BattleshipEngine {
  static getBoardDimension(boardSize?: '10x10' | '8x8'): number {
    return boardSize === '8x8' ? 8 : 10;
  }

  static getShipCells(ship: { row: number; col: number; size: number; isVertical: boolean }): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let i = 0; i < ship.size; i++) {
      cells.push({
        row: ship.isVertical ? ship.row + i : ship.row,
        col: ship.isVertical ? ship.col : ship.col + i,
      });
    }
    return cells;
  }

  static validateFleet(
    fleet: ShipPlacement[],
    boardSize: '10x10' | '8x8' = '10x10'
  ): { valid: boolean; error?: string } {
    const dim = this.getBoardDimension(boardSize);
    const expectedFleet = boardSize === '8x8' ? FLEET_DEFINITIONS.small : FLEET_DEFINITIONS.classic;

    if (!Array.isArray(fleet) || fleet.length !== expectedFleet.length) {
      return { valid: false, error: `Fleet must contain exactly ${expectedFleet.length} ships` };
    }

    const occupiedCells = new Set<string>();

    for (const exp of expectedFleet) {
      const match = fleet.find((s) => s.type === exp.type);
      if (!match) {
        return { valid: false, error: `Missing ship of type ${exp.type}` };
      }
      if (match.size !== exp.size) {
        return { valid: false, error: `Ship ${exp.type} must have length ${exp.size}` };
      }

      const cells = this.getShipCells(match);
      for (const cell of cells) {
        if (cell.row < 0 || cell.row >= dim || cell.col < 0 || cell.col >= dim) {
          return { valid: false, error: `Ship ${match.type} extends outside board boundaries` };
        }
        const key = `${cell.row},${cell.col}`;
        if (occupiedCells.has(key)) {
          return { valid: false, error: `Ships cannot overlap at coordinate (${cell.row}, ${cell.col})` };
        }
        occupiedCells.add(key);
      }
    }

    return { valid: true };
  }

  static generateRandomFleet(boardSize: '10x10' | '8x8' = '10x10'): ShipPlacement[] {
    const dim = this.getBoardDimension(boardSize);
    const expectedFleet = boardSize === '8x8' ? FLEET_DEFINITIONS.small : FLEET_DEFINITIONS.classic;
    const occupied = new Set<string>();
    const result: ShipPlacement[] = [];

    for (const spec of expectedFleet) {
      let placed = false;
      let attempts = 0;

      while (!placed && attempts < 500) {
        attempts++;
        const isVertical = Math.random() < 0.5;
        const maxRow = isVertical ? dim - spec.size : dim - 1;
        const maxCol = isVertical ? dim - 1 : dim - spec.size;
        const row = Math.floor(Math.random() * (maxRow + 1));
        const col = Math.floor(Math.random() * (maxCol + 1));

        const cells = this.getShipCells({ row, col, size: spec.size, isVertical });
        const collision = cells.some((c) => occupied.has(`${c.row},${c.col}`));

        if (!collision) {
          for (const c of cells) {
            occupied.add(`${c.row},${c.col}`);
          }
          result.push({
            type: spec.type,
            size: spec.size,
            row,
            col,
            isVertical,
            hits: 0,
            isSunk: false,
          });
          placed = true;
        }
      }

      if (!placed) {
        // Fallback: retry generation from scratch if rare deadlock occurs
        return this.generateRandomFleet(boardSize);
      }
    }

    return result;
  }

  static createInitialState(playerA: string, playerB: string, config?: BattleshipBoardConfig) {
    let startingPlayer = playerA;
    if (config?.firstPlayer === 'challenger') {
      startingPlayer = playerB;
    } else if (config?.firstPlayer === 'random') {
      startingPlayer = Math.random() < 0.5 ? playerA : playerB;
    }

    return {
      publicState: {
        players: [playerA, playerB] as [string, string],
        currentTurn: startingPlayer,
        shots: {
          [playerA]: [] as BattleshipShot[],
          [playerB]: [] as BattleshipShot[],
        },
        readyPlayers: [] as string[],
        winner: null as string | null,
        turnStartedAt: new Date().toISOString(),
        stats: {
          [playerA]: { shots: 0, hits: 0, misses: 0, shipsSunk: 0 },
          [playerB]: { shots: 0, hits: 0, misses: 0, shipsSunk: 0 },
        },
      },
      privatePlayers: {
        [playerA]: { fleet: [] as ShipPlacement[] },
        [playerB]: { fleet: [] as ShipPlacement[] },
      },
    };
  }

  static fireShot(
    gameState: any,
    attackingUserId: string,
    target: { row: number; col: number },
    boardSize: '10x10' | '8x8' = '10x10'
  ): {
    success: boolean;
    error?: string;
    result?: 'hit' | 'miss' | 'sunk';
    sunkShipType?: ShipType;
    isGameOver?: boolean;
    winner?: string;
  } {
    const dim = this.getBoardDimension(boardSize);
    const pub = gameState.publicState;
    const priv = gameState.privatePlayers;

    if (pub.currentTurn !== attackingUserId) {
      return { success: false, error: 'It is not your turn to fire' };
    }

    if (target.row < 0 || target.row >= dim || target.col < 0 || target.col >= dim) {
      return { success: false, error: `Coordinates must be within 0 and ${dim - 1}` };
    }

    const attackerShots: BattleshipShot[] = pub.shots[attackingUserId] || [];
    if (attackerShots.some((s) => s.row === target.row && s.col === target.col)) {
      return { success: false, error: 'This coordinate has already been attacked' };
    }

    const defendingUserId = pub.players.find((p: string) => p !== attackingUserId);
    if (!defendingUserId) {
      return { success: false, error: 'Opponent not found' };
    }

    const defenderFleet: ShipPlacement[] = priv[defendingUserId]?.fleet || [];

    let hitShip: ShipPlacement | null = null;
    for (const ship of defenderFleet) {
      const cells = this.getShipCells(ship);
      if (cells.some((c) => c.row === target.row && c.col === target.col)) {
        hitShip = ship;
        break;
      }
    }

    let shotResult: 'hit' | 'miss' | 'sunk' = 'miss';
    let sunkShipType: ShipType | undefined;

    if (hitShip) {
      hitShip.hits += 1;
      if (hitShip.hits >= hitShip.size) {
        hitShip.isSunk = true;
        shotResult = 'sunk';
        sunkShipType = hitShip.type;
      } else {
        shotResult = 'hit';
      }
    }

    // Record shot in public state
    // PRIVACY REQUIREMENT: shipType is strictly omitted unless the ship is SUNK!
    const newShot: BattleshipShot = {
      row: target.row,
      col: target.col,
      result: shotResult,
      ...(shotResult === 'sunk' && sunkShipType ? { shipType: sunkShipType } : {}),
      timestamp: new Date().toISOString(),
    };

    attackerShots.push(newShot);
    pub.shots[attackingUserId] = attackerShots;

    // Update stats
    const attackerStats = pub.stats[attackingUserId];
    if (attackerStats) {
      attackerStats.shots += 1;
      if (shotResult === 'miss') {
        attackerStats.misses += 1;
      } else {
        attackerStats.hits += 1;
        if (shotResult === 'sunk') {
          attackerStats.shipsSunk += 1;
        }
      }
    }

    // Check game over
    const allSunk = defenderFleet.length > 0 && defenderFleet.every((s) => s.isSunk);
    if (allSunk) {
      pub.winner = attackingUserId;
      return {
        success: true,
        result: shotResult,
        sunkShipType,
        isGameOver: true,
        winner: attackingUserId,
      };
    }

    // Next turn
    pub.currentTurn = defendingUserId;
    pub.turnStartedAt = new Date().toISOString();

    return {
      success: true,
      result: shotResult,
      sunkShipType,
      isGameOver: false,
    };
  }

  static sanitizeForPlayer(
    gameState: any,
    viewerUserId: string,
    isFinished: boolean
  ): BattleshipClientGameState {
    const pub = gameState.publicState || gameState;
    const priv = gameState.privatePlayers || {};

    const myFleet = priv[viewerUserId]?.fleet || [];
    let opponentFleet: ShipPlacement[] | null = null;

    if (isFinished) {
      const opponentId = pub.players?.find((p: string) => p !== viewerUserId);
      if (opponentId && priv[opponentId]) {
        opponentFleet = priv[opponentId].fleet || [];
      }
    }

    return {
      players: pub.players,
      currentTurn: pub.currentTurn,
      shots: pub.shots,
      readyPlayers: pub.readyPlayers || [],
      winner: pub.winner || null,
      turnStartedAt: pub.turnStartedAt,
      stats: pub.stats,
      myFleet,
      opponentFleet,
    };
  }
}
