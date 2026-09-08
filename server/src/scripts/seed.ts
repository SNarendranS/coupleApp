import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { connectDatabase } from '../config/db';
import {
  User,
  Couple,
  DrawingBoard,
  DrawingStroke,
  CalendarEvent,
  SharedLink,
  Memory,
  Game,
  Activity,
  Notification,
  PartnerRequest,
} from '../models';

async function seed() {
  console.log('🌱 Starting database seed for UsTwo...');
  await connectDatabase();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Couple.deleteMany({}),
    PartnerRequest.deleteMany({}),
    DrawingBoard.deleteMany({}),
    DrawingStroke.deleteMany({}),
    CalendarEvent.deleteMany({}),
    SharedLink.deleteMany({}),
    Memory.deleteMany({}),
    Game.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('🧹 Cleaned existing collections');

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  // 1. Create two demo users
  const alex = await User.create({
    username: 'alex',
    email: 'alex@example.com',
    passwordHash,
    displayName: 'Alex Rivers',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Coffee lover, photographer, and proud partner to Sam ❤️',
    isOnline: true,
  });

  const sam = await User.create({
    username: 'sam',
    email: 'sam@example.com',
    passwordHash,
    displayName: 'Sam Taylor',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Stargazer, amateur chef, forever in love with Alex ✨',
    isOnline: false,
    lastSeenAt: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
  });

  // 2. Create the Couple
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 420); // ~1 year and 2 months ago

  const couple = await Couple.create({
    memberIds: [alex._id, sam._id],
    name: 'Alex & Sam',
    relationshipStartDate: startDate,
    coverImage: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=1200&auto=format&fit=crop&q=80',
  });

  // Update user coupleId
  alex.coupleId = couple._id;
  sam.coupleId = couple._id;
  await alex.save();
  await sam.save();

  // 3. Create Drawing Board & Sample Heart strokes
  const board = await DrawingBoard.create({
    coupleId: couple._id,
    version: 3,
    backgroundColor: '#ffffff',
  });

  // Heart points
  const heartPoints = [
    { x: 300, y: 250 },
    { x: 280, y: 230 },
    { x: 260, y: 230 },
    { x: 250, y: 250 },
    { x: 250, y: 270 },
    { x: 300, y: 320 },
    { x: 350, y: 270 },
    { x: 350, y: 250 },
    { x: 340, y: 230 },
    { x: 320, y: 230 },
    { x: 300, y: 250 },
  ];

  await DrawingStroke.create({
    coupleId: couple._id,
    strokeId: uuidv4(),
    createdBy: alex._id,
    tool: 'pen',
    color: '#f43f5e',
    width: 5,
    points: heartPoints,
  });

  // "Love You!" handwriting stroke points
  const textPoints = [
    { x: 270, y: 360 },
    { x: 270, y: 390 },
    { x: 290, y: 390 },
  ];

  await DrawingStroke.create({
    coupleId: couple._id,
    strokeId: uuidv4(),
    createdBy: sam._id,
    tool: 'marker',
    color: '#9333ea',
    width: 4,
    points: textPoints,
  });

  // 4. Sample Calendar Events
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 24);

  const thisSaturday = new Date(today);
  thisSaturday.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));

  await CalendarEvent.create([
    {
      coupleId: couple._id,
      createdBy: alex._id,
      title: 'Our 1st Official Anniversary',
      description: 'Celebrating 1 year together with a surprise weekend getaway!',
      date: nextMonth.toISOString().split('T')[0],
      allDay: true,
      type: 'anniversary',
      location: 'Big Sur Coastline',
      isRecurringYearly: true,
    },
    {
      coupleId: couple._id,
      createdBy: sam._id,
      title: 'Stargazing & Italian Dinner',
      description: 'Home-cooked truffle pasta and watching the Perseid meteors on the roof.',
      date: thisSaturday.toISOString().split('T')[0],
      startTime: '19:30',
      endTime: '22:00',
      allDay: false,
      type: 'date_night',
      location: 'Our Cozy Rooftop',
    },
    {
      coupleId: couple._id,
      createdBy: alex._id,
      title: 'First Day We Met',
      description: 'At that rainy coffee shop on 4th Street when you asked for a napkin.',
      date: startDate.toISOString().split('T')[0],
      allDay: true,
      type: 'memory',
      location: 'Bean & Bloom Cafe',
      isRecurringYearly: true,
    },
  ]);

  // 5. Sample Shared Links
  await SharedLink.create([
    {
      coupleId: couple._id,
      createdBy: alex._id,
      url: 'https://www.cntraveler.com/destinations/japan',
      title: 'Kyoto Fall Foliage Itinerary',
      description: 'Spots for our dream autumn trip together in Japan!',
      thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=300&auto=format&fit=crop&q=80',
      category: 'travel',
    },
    {
      coupleId: couple._id,
      createdBy: sam._id,
      url: 'https://cooking.nytimes.com/recipes/tiramisu',
      title: 'Classic Italian Tiramisu Recipe',
      description: 'Let us bake this together next Friday night!',
      thumbnail: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&auto=format&fit=crop&q=80',
      category: 'food',
    },
    {
      coupleId: couple._id,
      createdBy: alex._id,
      url: 'https://open.spotify.com',
      title: 'Our Late Night Drives Playlist',
      description: 'Songs that remind me of our midnight escapes.',
      thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80',
      category: 'music',
    },
  ]);

  // 6. Sample Memories
  await Memory.create([
    {
      coupleId: couple._id,
      createdBy: sam._id,
      title: 'Sunrise above the Clouds',
      description: 'Waking up at 4 AM to hike Mount Tamalpais. Cold hands, hot thermos, and the most golden view with you.',
      date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      imageUrls: [
        'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80',
      ],
      location: 'Mount Tamalpais, CA',
      tags: ['hiking', 'sunrise', 'adventure'],
    },
    {
      coupleId: couple._id,
      createdBy: alex._id,
      title: 'That Rainy Afternoon Cafe',
      description: 'When it poured non-stop for three hours and we stayed talking about our favorite childhood books until the cafe closed.',
      date: startDate.toISOString().split('T')[0],
      imageUrls: [
        'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80',
      ],
      location: 'Bean & Bloom Cafe',
      tags: ['coffee', 'rain', 'first meeting'],
    },
  ]);

  // 7. Sample XO Game
  await Game.create({
    coupleId: couple._id,
    type: 'xo',
    status: 'in_progress',
    createdBy: alex._id,
    state: {
      board: ['X', null, 'O', null, 'X', null, null, null, null],
      playerX: alex._id.toString(),
      playerO: sam._id.toString(),
      currentTurn: sam._id.toString(),
      winningLine: null,
      winner: null,
    },
  });

  // 8. Recent Activities
  await Activity.create([
    {
      coupleId: couple._id,
      userId: alex._id,
      action: 'calendar_added',
      details: 'Added our 1st Official Anniversary celebration',
    },
    {
      coupleId: couple._id,
      userId: sam._id,
      action: 'memory_added',
      details: 'Added memory: "Sunrise above the Clouds"',
    },
    {
      coupleId: couple._id,
      userId: alex._id,
      action: 'drawing_updated',
      details: 'Drew a heart on the shared canvas',
    },
  ]);

  // 9. Sample Notification
  await Notification.create({
    userId: sam._id,
    coupleId: couple._id,
    type: 'calendar_new',
    title: 'New Calendar Event',
    message: 'Alex added "Our 1st Official Anniversary" to the shared calendar.',
    read: false,
  });

  console.log('✨ Seed complete!');
  console.log('--------------------------------------------------');
  console.log('Demo Credentials:');
  console.log('User 1: alex@example.com (or username: alex) | Password: password123');
  console.log('User 2: sam@example.com  (or username: sam)  | Password: password123');
  console.log('Couple: Alex & Sam (Connected and populated)');
  console.log('--------------------------------------------------');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
