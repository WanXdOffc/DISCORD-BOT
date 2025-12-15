import { Schema, model } from 'mongoose';

const memberSchema = new Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  guildId: {
    type: String,
    required: true,
    index: true,
  },
  // Leveling per guild
  leveling: {
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalXp: { type: Number, default: 0 },
    lastMessage: { type: Date, default: null },
    messageCount: { type: Number, default: 0 },
  },
  // Moderation
  moderation: {
    warnings: [{
      id: { type: String, required: true },
      reason: { type: String, required: true },
      moderator: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    infractions: [{
      type: { type: String, enum: ['warn', 'kick', 'ban', 'timeout'], required: true },
      reason: { type: String, required: true },
      moderator: { type: String, required: true },
      duration: { type: Number, default: null }, // for timeouts
      createdAt: { type: Date, default: Date.now },
    }],
    totalWarnings: { type: Number, default: 0 },
    totalKicks: { type: Number, default: 0 },
    totalBans: { type: Number, default: 0 },
    totalTimeouts: { type: Number, default: 0 },
    notes: [{
      note: { type: String, required: true },
      moderator: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
  },
  // Timestamps
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
  rejoins: { type: Number, default: 0 },
}, {
  timestamps: true,
});

// Compound index for faster queries
memberSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Methods
memberSchema.methods.addXp = async function(amount) {
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

memberSchema.methods.calculateRequiredXp = function() {
  return Math.floor(100 * Math.pow(this.leveling.level, 1.5));
};

memberSchema.methods.addWarning = async function(reason, moderatorId) {
  const warningId = `warn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  this.moderation.warnings.push({
    id: warningId,
    reason,
    moderator: moderatorId,
  });
  this.moderation.totalWarnings += 1;
  
  this.moderation.infractions.push({
    type: 'warn',
    reason,
    moderator: moderatorId,
  });
  
  await this.save();
  return warningId;
};

memberSchema.methods.removeWarning = async function(warningId) {
  const index = this.moderation.warnings.findIndex(w => w.id === warningId);
  if (index === -1) return false;
  
  this.moderation.warnings.splice(index, 1);
  this.moderation.totalWarnings = Math.max(0, this.moderation.totalWarnings - 1);
  await this.save();
  return true;
};

memberSchema.methods.clearWarnings = async function() {
  this.moderation.warnings = [];
  this.moderation.totalWarnings = 0;
  await this.save();
  return true;
};

memberSchema.methods.addInfraction = async function(type, reason, moderatorId, duration = null) {
  this.moderation.infractions.push({
    type,
    reason,
    moderator: moderatorId,
    duration,
  });
  
  // Increment counters
  if (type === 'kick') this.moderation.totalKicks += 1;
  else if (type === 'ban') this.moderation.totalBans += 1;
  else if (type === 'timeout') this.moderation.totalTimeouts += 1;
  
  await this.save();
};

memberSchema.methods.addNote = async function(note, moderatorId) {
  this.moderation.notes.push({
    note,
    moderator: moderatorId,
  });
  await this.save();
};

// Statics
memberSchema.statics.getOrCreate = async function(userId, guildId) {
  let member = await this.findOne({ userId, guildId });
  if (!member) {
    member = await this.create({ userId, guildId });
  }
  return member;
};

memberSchema.statics.getGuildLeaderboard = async function(guildId, limit = 10) {
  return await this.find({ guildId })
    .sort({ 'leveling.totalXp': -1 })
    .limit(limit)
    .select('userId leveling');
};

memberSchema.statics.findByUserAndGuild = function(userId, guildId) {
  return this.findOne({ userId, guildId });
};

memberSchema.statics.getModerationStats = async function(guildId) {
  const stats = await this.aggregate([
    { $match: { guildId } },
    {
      $group: {
        _id: null,
        totalWarnings: { $sum: '$moderation.totalWarnings' },
        totalKicks: { $sum: '$moderation.totalKicks' },
        totalBans: { $sum: '$moderation.totalBans' },
        totalTimeouts: { $sum: '$moderation.totalTimeouts' },
        totalMembers: { $sum: 1 },
      }
    }
  ]);
  
  return stats[0] || {
    totalWarnings: 0,
    totalKicks: 0,
    totalBans: 0,
    totalTimeouts: 0,
    totalMembers: 0,
  };
};

export default model('Member', memberSchema);