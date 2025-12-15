import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  discriminator: {
    type: String,
    default: '0',
  },
  // Economy
  economy: {
    balance: { type: Number, default: 0 },
    bank: { type: Number, default: 0 },
    inventory: [{
      itemId: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      acquiredAt: { type: Date, default: Date.now },
    }],
    dailyStreak: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastWork: { type: Date, default: null },
    totalEarned: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
  },
  // Leveling (Global)
  leveling: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalXp: { type: Number, default: 0 },
    lastMessage: { type: Date, default: null },
  },
  // Statistics
  stats: {
    commandsUsed: { type: Number, default: 0 },
    messagesCount: { type: Number, default: 0 },
    voiceTime: { type: Number, default: 0 }, // in seconds
    songsPlayed: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
  },
  // Achievements
  achievements: [{
    id: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  }],
  // Profile Customization
  profile: {
    bio: { type: String, maxlength: 200, default: '' },
    color: { type: String, default: '#5865F2' },
    background: { type: String, default: null },
    badges: [{ type: String }],
  },
  // Premium
  premium: {
    active: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    tier: { type: Number, default: 0 },
  },
  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    dmNotifications: { type: Boolean, default: true },
    publicProfile: { type: Boolean, default: true },
  },
  // Moderation History
  moderation: {
    warnings: { type: Number, default: 0 },
    kicks: { type: Number, default: 0 },
    bans: { type: Number, default: 0 },
    timeouts: { type: Number, default: 0 },
  },
  // Blacklist
  blacklisted: {
    status: { type: Boolean, default: false },
    reason: { type: String, default: null },
    until: { type: Date, default: null },
  },
}, {
  timestamps: true,
});

// Virtual for total money
userSchema.virtual('economy.total').get(function() {
  return this.economy.balance + this.economy.bank;
});

// Methods
userSchema.methods.addMoney = async function(amount, location = 'balance') {
  if (location === 'balance') {
    this.economy.balance += amount;
  } else if (location === 'bank') {
    this.economy.bank += amount;
  }
  this.economy.totalEarned += amount;
  return await this.save();
};

userSchema.methods.removeMoney = async function(amount, location = 'balance') {
  if (location === 'balance') {
    if (this.economy.balance < amount) return false;
    this.economy.balance -= amount;
  } else if (location === 'bank') {
    if (this.economy.bank < amount) return false;
    this.economy.bank -= amount;
  }
  this.economy.totalSpent += amount;
  await this.save();
  return true;
};

userSchema.methods.addXp = async function(amount) {
  this.leveling.xp += amount;
  this.leveling.totalXp += amount;
  
  // Check for level up
  const requiredXp = this.calculateRequiredXp();
  const leveledUp = [];
  
  while (this.leveling.xp >= requiredXp) {
    this.leveling.xp -= requiredXp;
    this.leveling.level += 1;
    leveledUp.push(this.leveling.level);
  }
  
  await this.save();
  return leveledUp;
};

userSchema.methods.calculateRequiredXp = function() {
  return Math.floor(100 * Math.pow(this.leveling.level, 1.5));
};

userSchema.methods.addItem = async function(itemId, quantity = 1) {
  const existingItem = this.economy.inventory.find(i => i.itemId === itemId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    this.economy.inventory.push({ itemId, quantity });
  }
  return await this.save();
};

userSchema.methods.removeItem = async function(itemId, quantity = 1) {
  const item = this.economy.inventory.find(i => i.itemId === itemId);
  if (!item || item.quantity < quantity) return false;
  
  item.quantity -= quantity;
  if (item.quantity === 0) {
    this.economy.inventory = this.economy.inventory.filter(i => i.itemId !== itemId);
  }
  
  await this.save();
  return true;
};

userSchema.methods.hasItem = function(itemId, quantity = 1) {
  const item = this.economy.inventory.find(i => i.itemId === itemId);
  return item && item.quantity >= quantity;
};

userSchema.methods.unlockAchievement = async function(achievementId) {
  if (this.achievements.find(a => a.id === achievementId)) {
    return false; // Already unlocked
  }
  this.achievements.push({ id: achievementId });
  await this.save();
  return true;
};

// Statics
userSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

userSchema.statics.getOrCreate = async function(userId, username, discriminator = '0') {
  let user = await this.findOne({ userId });
  if (!user) {
    user = await this.create({ userId, username, discriminator });
  } else {
    // Update username if changed
    if (user.username !== username || user.discriminator !== discriminator) {
      user.username = username;
      user.discriminator = discriminator;
      await user.save();
    }
  }
  return user;
};

userSchema.statics.getLeaderboard = async function(field, limit = 10) {
  const sortField = {};
  sortField[field] = -1;
  return await this.find({ blacklisted: { status: false } })
    .sort(sortField)
    .limit(limit)
    .select('userId username economy.balance economy.bank leveling.level leveling.totalXp');
};

export default model('User', userSchema);