import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db';
import { User, Couple, Media, Game } from '../models';
import { storageService } from '../services/storage.service';
import { CoupleService } from '../services/couple.service';
import { GameService } from '../services/game.service';

describe('Production UX & Enhancement Pass Tests', () => {
  let userA: any;
  let userB: any;
  let couple: any;

  before(async () => {
    await connectDatabase();

    // Clean up test users or fetch existing
    let uA = await User.findOne({ email: 'alex@example.com' });
    let uB = await User.findOne({ email: 'sam@example.com' });

    if (!uA) {
      uA = await User.create({
        username: 'alex_test',
        email: 'alex@example.com',
        displayName: 'Alex',
        passwordHash: 'dummyhash',
      });
    }

    if (!uB) {
      uB = await User.create({
        username: 'sam_test',
        email: 'sam@example.com',
        displayName: 'Sam',
        passwordHash: 'dummyhash',
      });
    }

    let c = await Couple.findOne({ memberIds: { $all: [uA._id, uB._id] } });
    if (!c) {
      c = await Couple.create({
        memberIds: [uA._id, uB._id],
        name: 'Alex & Sam',
      });
      uA.coupleId = c._id;
      uB.coupleId = c._id;
      await uA.save();
      await uB.save();
    }

    userA = uA;
    userB = uB;
    couple = c;
  });

  after(async () => {
    await mongoose.connection.close();
  });

  // -------------------------------------------------------------
  // 1. STORAGE SERVICE & MEDIA TESTS
  // -------------------------------------------------------------
  test('1. Storage Provider: Buffer upload and deletion works with valid metadata', async () => {
    // 1x1 transparent PNG buffer
    const testPngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const stored = await storageService.uploadImage(
      testPngBuffer,
      'test_avatar.png',
      'image/png',
      { category: 'couple_avatar' }
    );

    assert.ok(stored.url, 'URL must exist');
    assert.ok(stored.publicId, 'publicId must exist');
    assert.equal(stored.mimeType, 'image/png');
    assert.ok(stored.bytes > 0, 'Bytes must be positive');

    // Create Media record
    const media = await Media.create({
      coupleId: couple._id,
      uploadedBy: userA._id,
      category: 'couple_avatar',
      provider: stored.provider,
      publicId: stored.publicId,
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl,
      mimeType: stored.mimeType,
      bytes: stored.bytes,
    });

    assert.equal(media.category, 'couple_avatar');
    assert.equal(media.publicId, stored.publicId);

    // Delete image
    await storageService.deleteImage(stored.publicId);
    await Media.findByIdAndDelete(media._id);
  });

  // -------------------------------------------------------------
  // 2. COUPLE PROFILE AVATAR TESTS
  // -------------------------------------------------------------
  test('2. Couple Avatar: Update shared couple avatar and verify persistence', async () => {
    const fakeAvatarUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const fakePublicId = 'sample_couple_avatar_123';

    const updated = await CoupleService.updateCoupleSettings(couple._id.toString(), {
      avatarUrl: fakeAvatarUrl,
      avatarPublicId: fakePublicId,
    });

    assert.equal(updated.avatarUrl, fakeAvatarUrl);
    assert.equal(updated.avatarPublicId, fakePublicId);

    // Verify in database
    const dbCouple = await Couple.findById(couple._id);
    assert.equal(dbCouple?.avatarUrl, fakeAvatarUrl);
    assert.equal(dbCouple?.avatarPublicId, fakePublicId);
  });

  // -------------------------------------------------------------
  // 3. BINGO COMPLETE LIFECYCLE & STATE MACHINE TESTS
  // -------------------------------------------------------------
  test('3. Bingo Automatic Setup: Generates valid 5x5 boards with all numbers 1..25', async () => {
    const game = await GameService.initBingoSetup(couple._id.toString(), userA._id.toString(), {
      fillMode: 'automatic',
    });

    assert.equal(game.status, 'in_progress');
    assert.equal(game.type, 'bingo');

    const state = game.state;
    const boardA: number[][] = state.playerBoards[userA._id.toString()];
    const boardB: number[][] = state.playerBoards[userB._id.toString()];

    assert.equal(boardA.length, 5);
    assert.equal(boardB.length, 5);

    const flatA = boardA.flat();
    const flatB = boardB.flat();

    assert.equal(flatA.length, 25);
    assert.equal(new Set(flatA).size, 25);
    assert.equal(new Set(flatB).size, 25);

    // Check all numbers 1-25 exist
    for (let i = 1; i <= 25; i++) {
      assert.ok(flatA.includes(i), `Board A missing number ${i}`);
      assert.ok(flatB.includes(i), `Board B missing number ${i}`);
    }
  });

  test('4. Bingo Manual & Timed Setup: Validates unique boards, auto-fill, and transitions', async () => {
    // Start game in timed setup
    const game = await GameService.initBingoSetup(couple._id.toString(), userA._id.toString(), {
      fillMode: 'timed',
      timeLimitSeconds: 30,
    });

    assert.equal(game.status, 'setup');

    const gameId = game._id.toString();

    // Invalid board submission (duplicate numbers) should reject
    const invalidBoard = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
      [21, 22, 23, 24, 24], // duplicate 24, missing 25
    ];

    await assert.rejects(
      async () => {
        await GameService.submitBingoBoard(gameId, userA._id.toString(), invalidBoard);
      },
      /Board must contain every number from 1 to 25 exactly once/
    );

    // Valid board submission for Player A
    const validBoardA = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
      [21, 22, 23, 24, 25],
    ];

    const afterSubmitA = await GameService.submitBingoBoard(gameId, userA._id.toString(), validBoardA);
    // Player B is not ready yet, so status remains 'setup'
    assert.equal(afterSubmitA.status, 'setup');
    assert.ok(afterSubmitA.state.readyPlayers.includes(userA._id.toString()));

    // Auto-fill Player B's board -> transitions game to 'in_progress'
    const afterAutoFillB = await GameService.autoFillBingoBoard(gameId, userB._id.toString());
    assert.equal(afterAutoFillB.status, 'in_progress');
    assert.ok(afterAutoFillB.state.readyPlayers.includes(userB._id.toString()));
  });

  test('5. Bingo Gameplay: Authoritative number calling, 5-line win calculation, and persistence', async () => {
    // Setup a clean match where Player A has a predictable board
    const game = await GameService.initBingoSetup(couple._id.toString(), userA._id.toString(), {
      fillMode: 'manual',
    });

    const gameId = game._id.toString();
    const linearBoard = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20],
      [21, 22, 23, 24, 25],
    ];

    await GameService.submitBingoBoard(gameId, userA._id.toString(), linearBoard);
    await GameService.submitBingoBoard(gameId, userB._id.toString(), linearBoard);

    // Simulate calling the 5 rows for Player A
    // Row 1: 1, 2, 3, 4, 5
    // Row 2: 6, 7, 8, 9, 10
    // Row 3: 11, 12, 13, 14, 15
    // Row 4: 16, 17, 18, 19, 20
    // Row 5: 21, 22, 23, 24, 25
    // Let's call them taking turns:
    const numbersToCall = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

    let currentGame: any;
    for (const num of numbersToCall) {
      const dbGame = await Game.findById(gameId);
      if (dbGame?.status === 'finished') break;

      const currentTurn = dbGame?.state.currentTurn;
      currentGame = await GameService.handleBingoCall(gameId, currentTurn, num);
    }

    assert.equal(currentGame.status, 'finished');
    assert.ok(currentGame.winner, 'Winner must be set');
    assert.ok(currentGame.finishedAt, 'finishedAt must be recorded');

    // Verify post-game review: getActiveGame returns completed game when finished
    const reviewGame = await GameService.getActiveGame(couple._id.toString(), 'bingo');
    assert.ok(reviewGame, 'Review game must be returned');
    assert.equal(reviewGame.status, 'finished');
  });

  // -------------------------------------------------------------
  // 4. XO LIFECYCLE & RESTART CONFIRMATION TESTS
  // -------------------------------------------------------------
  test('6. XO Match: Start, move count tracking, deliberate restart validation', async () => {
    const xoGame = await GameService.startXOGame(couple._id.toString(), userA._id.toString());
    assert.equal(xoGame.status, 'in_progress');
    assert.equal(xoGame.type, 'xo');
    assert.equal(xoGame.state.movesCount, 0);

    const gameId = xoGame._id.toString();

    // Make Move
    const afterMove1 = await GameService.handleXOMove(gameId, userA._id.toString(), 0);
    assert.equal(afterMove1.state.movesCount, 1);
    assert.equal(afterMove1.state.board[0], 'X');

    // Server-verified deliberate restart
    const restarted = await GameService.restartGame(couple._id.toString(), userA._id.toString(), gameId);
    assert.equal(restarted.status, 'in_progress');
    assert.notEqual(restarted._id.toString(), gameId);

    // Verify old game is cancelled
    const oldGame = await Game.findById(gameId);
    assert.equal(oldGame?.status, 'cancelled');
  });
});
