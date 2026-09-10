import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BattleshipEngine } from '../engines/battleship.engine';
import { CheckersEngine } from '../engines/checkers.engine';
import { ShipPlacement } from '@couple/shared';

describe('Battleship & Checkers Engine Logic & Invariants', () => {
  const userA = 'user_111';
  const userB = 'user_222';

  describe('🚢 Battleship Engine Tests', () => {
    test('1. Validates classic 5-ship fleet vs overlapping or out-of-bounds', () => {
      const validFleet: ShipPlacement[] = [
        { type: 'carrier', size: 5, row: 0, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'battleship', size: 4, row: 1, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'cruiser', size: 3, row: 2, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'submarine', size: 3, row: 3, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'destroyer', size: 2, row: 4, col: 0, isVertical: false, hits: 0, isSunk: false },
      ];

      const validCheck = BattleshipEngine.validateFleet(validFleet, '10x10');
      assert.equal(validCheck.valid, true);

      // Overlapping ships
      const overlappingFleet: ShipPlacement[] = [
        { type: 'carrier', size: 5, row: 0, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'battleship', size: 4, row: 0, col: 2, isVertical: true, hits: 0, isSunk: false }, // crosses (0,2)
        { type: 'cruiser', size: 3, row: 2, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'submarine', size: 3, row: 3, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'destroyer', size: 2, row: 4, col: 0, isVertical: false, hits: 0, isSunk: false },
      ];
      const overlapCheck = BattleshipEngine.validateFleet(overlappingFleet, '10x10');
      assert.equal(overlapCheck.valid, false);

      // Out of bounds
      const outOfBoundsFleet: ShipPlacement[] = [
        { type: 'carrier', size: 5, row: 0, col: 8, isVertical: false, hits: 0, isSunk: false }, // col 8+5 > 10
        { type: 'battleship', size: 4, row: 1, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'cruiser', size: 3, row: 2, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'submarine', size: 3, row: 3, col: 0, isVertical: false, hits: 0, isSunk: false },
        { type: 'destroyer', size: 2, row: 4, col: 0, isVertical: false, hits: 0, isSunk: false },
      ];
      const oobCheck = BattleshipEngine.validateFleet(outOfBoundsFleet, '10x10');
      assert.equal(oobCheck.valid, false);
    });

    test('2. Server random fleet generator creates 100% legal, non-overlapping fleets', () => {
      for (let i = 0; i < 10; i++) {
        const fleet = BattleshipEngine.generateRandomFleet('10x10');
        const check = BattleshipEngine.validateFleet(fleet, '10x10');
        assert.equal(check.valid, true, `Generated random fleet must be valid: ${check.error}`);
      }
    });

    test('3. Shot Processing: Hit without revealing shipType, sunk reveals shipType, win detection', () => {
      const state = BattleshipEngine.createInitialState(userA, userB);
      // Give Player B a 2-cell destroyer at (0,0) and (0,1)
      state.privatePlayers[userB].fleet = [
        { type: 'destroyer', size: 2, row: 0, col: 0, isVertical: false, hits: 0, isSunk: false },
      ];

      // Player A fires at (5,5) -> Miss
      const missRes = BattleshipEngine.fireShot(state, userA, { row: 5, col: 5 }, '10x10');
      assert.equal(missRes.success, true);
      assert.equal(missRes.result, 'miss');
      assert.equal(missRes.sunkShipType, undefined);
      assert.equal(state.publicState.shots[userA][0].shipType, undefined);
      assert.equal(state.publicState.currentTurn, userB); // Turn toggled

      // Player B fires at (1,1) -> Miss
      BattleshipEngine.fireShot(state, userB, { row: 1, col: 1 }, '10x10');
      assert.equal(state.publicState.currentTurn, userA);

      // Duplicate shot at (5,5) should fail
      const dupRes = BattleshipEngine.fireShot(state, userA, { row: 5, col: 5 }, '10x10');
      assert.equal(dupRes.success, false);

      // Player A fires at (0,0) -> Hit (Ship NOT yet sunk)
      const hitRes = BattleshipEngine.fireShot(state, userA, { row: 0, col: 0 }, '10x10');
      assert.equal(hitRes.success, true);
      assert.equal(hitRes.result, 'hit');
      assert.equal(hitRes.sunkShipType, undefined);
      // CRITICAL PRIVACY: shipType must NOT be in public shot for ordinary hit!
      const lastShot = state.publicState.shots[userA][state.publicState.shots[userA].length - 1];
      assert.equal(lastShot.shipType, undefined);

      // Turn toggled to B, B fires
      BattleshipEngine.fireShot(state, userB, { row: 2, col: 2 }, '10x10');

      // Player A fires at (0,1) -> Sinks the destroyer and wins!
      const finalRes = BattleshipEngine.fireShot(state, userA, { row: 0, col: 1 }, '10x10');
      assert.equal(finalRes.success, true);
      assert.equal(finalRes.result, 'sunk');
      assert.equal(finalRes.sunkShipType, 'destroyer');
      assert.equal(finalRes.isGameOver, true);
      assert.equal(finalRes.winner, userA);
      assert.equal(state.publicState.winner, userA);
    });

    test('4. Privacy Sanitizer: Redacts opponent fleet in progress, reveals on finish', () => {
      const state = BattleshipEngine.createInitialState(userA, userB);
      state.privatePlayers[userA].fleet = BattleshipEngine.generateRandomFleet('10x10');
      state.privatePlayers[userB].fleet = BattleshipEngine.generateRandomFleet('10x10');

      // 1. In Progress
      const sanitizedA = BattleshipEngine.sanitizeForPlayer(state, userA, false);
      assert.ok(sanitizedA.myFleet.length > 0, 'Player A should have their fleet');
      assert.equal(sanitizedA.opponentFleet, null, 'Opponent fleet MUST be null in progress');

      // 2. Finished
      const finishedA = BattleshipEngine.sanitizeForPlayer(state, userA, true);
      assert.ok(finishedA.myFleet.length > 0);
      assert.ok(finishedA.opponentFleet && finishedA.opponentFleet.length > 0, 'Opponent fleet must be revealed after finish');
    });
  });

  describe('♟️ Checkers Engine Tests', () => {
    test('1. Initial Board: 24 pieces on dark squares, Player A at rows 0-2, Player B at 5-7', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      assert.equal(state.pieces.length, 24);

      for (const p of state.pieces) {
        assert.equal((p.row + p.col) % 2, 1, 'Pieces must only be placed on dark squares');
        if (p.player === userA) {
          assert.ok(p.row <= 2);
        } else {
          assert.ok(p.row >= 5);
        }
      }
    });

    test('2. Diagonal movement: legal forward steps, illegal backward moves for men', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      state.currentTurn = userA;

      // Piece at (2, 1) can move to (3, 0) or (3, 2)
      const res = CheckersEngine.executeMove(state, userA, { row: 2, col: 1 }, { row: 3, col: 0 });
      assert.equal(res.success, true);
      assert.equal(state.currentTurn, userB); // Turn passed to B

      // Piece at (3,0) cannot move backwards to (2,1) because it is not a king!
      // First let B move
      CheckersEngine.executeMove(state, userB, { row: 5, col: 0 }, { row: 4, col: 1 });

      // Now A tries moving backwards
      const backRes = CheckersEngine.executeMove(state, userA, { row: 3, col: 0 }, { row: 2, col: 1 });
      assert.equal(backRes.success, false, 'Non-king piece cannot move backward');
    });

    test('3. Mandatory Capture: Normal moves blocked when a jump is available', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      // Place piece A at (2, 2) and piece B at (3, 3)
      state.pieces = [
        { id: 'pA_test', player: userA, row: 2, col: 2, isKing: false },
        { id: 'pA_other', player: userA, row: 0, col: 0, isKing: false },
        { id: 'pB_target', player: userB, row: 3, col: 3, isKing: false },
      ];
      state.currentTurn = userA;

      // Jump is available from (2,2) over (3,3) to (4,4)
      // If Player A tries to move (0,0) to (1,1), it MUST be rejected!
      const regularMoveRes = CheckersEngine.executeMove(state, userA, { row: 0, col: 0 }, { row: 1, col: 1 });
      assert.equal(regularMoveRes.success, false, 'Regular move must be rejected when capture is available');
      assert.match(regularMoveRes.error || '', /capture/i);

      // Executing the jump move must succeed and remove piece B!
      const jumpRes = CheckersEngine.executeMove(state, userA, { row: 2, col: 2 }, { row: 4, col: 4 });
      assert.equal(jumpRes.success, true);
      assert.equal(state.pieces.some((p) => p.id === 'pB_target'), false, 'Captured piece must be removed');
      assert.equal(state.captures[userA], 1);
    });

    test('4. Multiple Jumps: Enforces consecutive jump with active piece', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      // Setup double jump for Player A:
      // A at (1, 1). B1 at (2, 2) -> landing (3, 3). B2 at (4, 4) -> landing (5, 5).
      state.pieces = [
        { id: 'pA', player: userA, row: 1, col: 1, isKing: false },
        { id: 'pB1', player: userB, row: 2, col: 2, isKing: false },
        { id: 'pB2', player: userB, row: 4, col: 4, isKing: false },
        { id: 'pB_extra', player: userB, row: 7, col: 7, isKing: false },
      ];
      state.currentTurn = userA;

      // First jump: (1,1) -> (3,3)
      const firstJump = CheckersEngine.executeMove(state, userA, { row: 1, col: 1 }, { row: 3, col: 3 });
      assert.equal(firstJump.success, true);
      assert.equal(firstJump.hasContinuation, true);
      assert.equal(state.activePieceId, 'pA');
      assert.equal(state.currentTurn, userA, 'Turn must remain on player A for multi-jump');

      // Second jump: (3,3) -> (5,5)
      const secondJump = CheckersEngine.executeMove(state, userA, { row: 3, col: 3 }, { row: 5, col: 5 });
      assert.equal(secondJump.success, true);
      assert.equal(secondJump.hasContinuation, undefined);
      assert.equal(state.activePieceId, null);
      assert.equal(state.currentTurn, userB, 'Turn now passes to B after jump sequence completes');
      assert.equal(state.captures[userA], 2);
    });

    test('5. King Promotion: Crowning on reaching back row & backward movement', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      // Player A piece at (6, 2) moving to row 7
      state.pieces = [
        { id: 'pA_crown', player: userA, row: 6, col: 2, isKing: false },
        { id: 'pB_dummy', player: userB, row: 7, col: 7, isKing: false },
      ];
      state.currentTurn = userA;

      const crownMove = CheckersEngine.executeMove(state, userA, { row: 6, col: 2 }, { row: 7, col: 3 });
      assert.equal(crownMove.success, true);
      assert.equal(crownMove.promoted, true);

      const crownedPiece = state.pieces.find((p) => p.id === 'pA_crown');
      assert.equal(crownedPiece?.isKing, true);

      // Now it's B's turn, B moves
      CheckersEngine.executeMove(state, userB, { row: 7, col: 7 }, { row: 6, col: 6 });

      // Crowned King can now move backwards from row 7 to row 6!
      const kingBackMove = CheckersEngine.executeMove(state, userA, { row: 7, col: 3 }, { row: 6, col: 2 });
      assert.equal(kingBackMove.success, true);
    });

    test('6. Victory Detection: 0 pieces remaining gives immediate win', () => {
      const state = CheckersEngine.createInitialState(userA, userB);
      state.pieces = [
        { id: 'pA', player: userA, row: 2, col: 2, isKing: false },
        { id: 'pB', player: userB, row: 3, col: 3, isKing: false },
      ];
      state.currentTurn = userA;

      const res = CheckersEngine.executeMove(state, userA, { row: 2, col: 2 }, { row: 4, col: 4 });
      assert.equal(res.success, true);
      assert.equal(res.isGameOver, true);
      assert.equal(res.winner, userA);
      assert.equal(state.winner, userA);
    });
  });
});
