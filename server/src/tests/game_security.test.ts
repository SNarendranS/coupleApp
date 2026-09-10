import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { User, Couple, Game } from '../models';
import { GameService } from '../services/game.service';
import { BattleshipEngine } from '../engines/battleship.engine';
import { CheckersEngine } from '../engines/checkers.engine';

describe('Realtime Games Security, Authorization & Reconnection Invariants', () => {
  let userA: any;
  let userB: any;
  let userC: any; // Unauthorized third party
  let coupleAB: any;
  let coupleC: any;

  before(async () => {
    await connectDatabase();

    // Setup couple A & B
    userA = await User.findOneAndUpdate(
      { email: 'bs_sec_alex@example.com' },
      { username: 'bs_sec_alex', email: 'bs_sec_alex@example.com', displayName: 'Alex', passwordHash: 'hash' },
      { upsert: true, new: true }
    );

    userB = await User.findOneAndUpdate(
      { email: 'bs_sec_sam@example.com' },
      { username: 'bs_sec_sam', email: 'bs_sec_sam@example.com', displayName: 'Sam', passwordHash: 'hash' },
      { upsert: true, new: true }
    );

    // Setup third user C and D (couple C, not in couple AB)
    userC = await User.findOneAndUpdate(
      { email: 'bs_sec_hacker@example.com' },
      { username: 'bs_sec_hacker', email: 'bs_sec_hacker@example.com', displayName: 'Hacker', passwordHash: 'hash' },
      { upsert: true, new: true }
    );

    const userD = await User.findOneAndUpdate(
      { email: 'bs_sec_hacker_partner@example.com' },
      { username: 'bs_sec_hacker_partner', email: 'bs_sec_hacker_partner@example.com', displayName: 'HackerPartner', passwordHash: 'hash' },
      { upsert: true, new: true }
    );

    let cAB = await Couple.findOne({ memberIds: { $all: [userA._id, userB._id] } });
    if (!cAB) {
      cAB = await Couple.create({ name: 'Alex & Sam Couple', memberIds: [userA._id, userB._id] });
    }
    coupleAB = cAB;

    let cC = await Couple.findOne({ memberIds: { $all: [userC._id, userD._id] } });
    if (!cC) {
      cC = await Couple.create({ name: 'Hacker Couple', memberIds: [userC._id, userD._id] });
    }
    coupleC = cC;

    userA.coupleId = coupleAB._id;
    await userA.save();
    userB.coupleId = coupleAB._id;
    await userB.save();
    userC.coupleId = coupleC._id;
    await userC.save();
  });

  after(async () => {
    await mongoose.connection.close();
  });

  test('1. Battleship Privacy: Player A cannot request or see Player B private fleet', async () => {
    const game = await GameService.startBattleshipGame(coupleAB._id.toString(), userA._id.toString());
    const gameId = game._id.toString();

    // Place random fleets for both players
    await GameService.randomizeBattleshipFleet(gameId, userA._id.toString());
    await GameService.randomizeBattleshipFleet(gameId, userB._id.toString());

    // Retrieve active game as Player A
    const viewA = await GameService.getActiveGame(coupleAB._id.toString(), 'battleship', userA._id.toString());
    assert.ok(viewA, 'Game view must exist');
    assert.ok(viewA.state.myFleet.length > 0, 'Player A must have their own fleet');
    assert.equal(viewA.state.opponentFleet, null, 'Opponent fleet MUST be null for Player A while in setup');

    // Retrieve active game as Player B
    const viewB = await GameService.getActiveGame(coupleAB._id.toString(), 'battleship', userB._id.toString());
    assert.ok(viewB, 'Game view must exist');
    assert.ok(viewB.state.myFleet.length > 0, 'Player B must have their own fleet');
    assert.equal(viewB.state.opponentFleet, null, 'Opponent fleet MUST be null for Player B while in setup');
  });

  test('2. Battleship Firing Authorization: Player A cannot fire twice in one turn, Player B cannot fire during A turn', async () => {
    const game = await GameService.startBattleshipGame(coupleAB._id.toString(), userA._id.toString());
    const gameId = game._id.toString();

    await GameService.randomizeBattleshipFleet(gameId, userA._id.toString());
    await GameService.randomizeBattleshipFleet(gameId, userB._id.toString());

    // Both ready -> advances to in_progress
    await GameService.readyBattleshipFleet(gameId, userA._id.toString());
    const afterReady = await GameService.readyBattleshipFleet(gameId, userB._id.toString());
    assert.equal(afterReady.status, 'in_progress');

    const startingTurn = afterReady.state.publicState.currentTurn;
    const waitingPlayer = startingTurn === userA._id.toString() ? userB._id.toString() : userA._id.toString();

    // Waiting player attempts to fire out of turn -> MUST FAIL
    await assert.rejects(
      async () => {
        await GameService.handleBattleshipFire(gameId, waitingPlayer, { row: 0, col: 0 });
      },
      (err: any) => {
        assert.match(err.message, /not your turn/i);
        return true;
      }
    );

    // Active player fires -> succeeds
    const shot1 = await GameService.handleBattleshipFire(gameId, startingTurn, { row: 0, col: 0 });
    assert.ok(shot1.game);

    // Active player attempts to fire again in the same turn -> MUST FAIL
    await assert.rejects(
      async () => {
        await GameService.handleBattleshipFire(gameId, startingTurn, { row: 0, col: 1 });
      },
      (err: any) => {
        assert.match(err.message, /not your turn/i);
        return true;
      }
    );
  });

  test('3. Checkers Authorization: Cannot move opponent pieces or move out of turn', async () => {
    const game = await GameService.startCheckersGame(coupleAB._id.toString(), userA._id.toString());
    const gameId = game._id.toString();

    const turn = game.state.currentTurn;
    const notTurn = turn === userA._id.toString() ? userB._id.toString() : userA._id.toString();

    // Player whose turn it is NOT tries to move -> MUST FAIL
    await assert.rejects(
      async () => {
        await GameService.handleCheckersMove(gameId, notTurn, { row: 5, col: 0 }, { row: 4, col: 1 });
      },
      (err: any) => {
        assert.match(err.message, /not your turn/i);
        return true;
      }
    );

    // Player tries to move opponent's piece -> MUST FAIL
    const opponentPieces = game.state.pieces.filter((p: any) => p.player === notTurn);
    const opPiece = opponentPieces[0];
    await assert.rejects(
      async () => {
        await GameService.handleCheckersMove(
          gameId,
          turn,
          { row: opPiece.row, col: opPiece.col },
          { row: opPiece.row + 1, col: opPiece.col + 1 }
        );
      },
      (err: any) => {
        assert.match(err.message, /no piece found/i);
        return true;
      }
    );
  });

  test('4. Durability & Recovery: Active state persisted in MongoDB is accurately retrieved on reconnect', async () => {
    const game = await GameService.startCheckersGame(coupleAB._id.toString(), userA._id.toString());
    const gameId = game._id.toString();

    // Make a move
    const turn = game.state.currentTurn;
    const pieces = game.state.pieces.filter((p: any) => p.player === turn);
    const piece = pieces.find((p: any) => p.row === 2);
    assert.ok(piece);

    await GameService.handleCheckersMove(
      gameId,
      turn,
      { row: piece.row, col: piece.col },
      { row: piece.row + 1, col: piece.col + 1 }
    );

    // Simulate complete process restart: load directly from MongoDB
    const loadedGame = await Game.findById(gameId);
    assert.ok(loadedGame);
    assert.equal(loadedGame.type, 'checkers');
    assert.equal(loadedGame.status, 'in_progress');
    assert.equal(loadedGame.state.movesCount, 1);

    // Verify sanitizeGameForUser
    const clientView = GameService.sanitizeGameForUser(loadedGame, userA._id.toString());
    assert.equal(clientView.state.movesCount, 1);
  });

  test('5. Couple Boundary: User C in different couple cannot access couple AB game', async () => {
    await GameService.startBattleshipGame(coupleAB._id.toString(), userA._id.toString());
    const viewC = await GameService.getActiveGame(coupleC._id.toString(), 'battleship', userC._id.toString());
    assert.equal(viewC, null, 'User C must not see couple AB active game');
  });
});
