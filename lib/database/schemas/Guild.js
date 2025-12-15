import { Schema, model } from 'mongoose';

const guildSchema = new Schema({
  guildId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  guildName: {
    type: String,
    required: true,
  },
  // Basic Settings
  prefix: {
    type: String,
    default: '!',
  },
  language: {
    type: String,
    default: 'en',
  },
  // Feature Toggles
  features: {
    music: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
    economy: { type: Boolean, default: true },
    leveling: { type: Boolean, default: true },
    aiChat: { type: Boolean, default: false },
    games: { type: Boolean, default: true },
    verification: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },
    goodbye: { type: Boolean, default: false },
  },
  // Welcome System
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { 
      type: String, 
      default: 'Welcome {user} to {server}! You are member #{memberCount}.' 
    },
    card: { type: Boolean, default: true },
    roleId: { type: String, default: null }, // Auto-role on join
  },
  // Goodbye System
  goodbye: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { 
      type: String, 
      default: '{user} has left the server. We now have {memberCount} members.' 
    },
  },
  // Verification System
  verification: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    roleId: { type: String, default: null }, // Verified role
    type: { type: String, enum: ['button', 'captcha', 'reaction'], default: 'button' },
  },
  // AI Chat Settings
  aiChat: {
    enabled: { type: Boolean, default: false },
    channels: [{ type: String }], // Array of channel IDs
    model: { type: String, default: 'gpt-3.5-turbo' },
    personality: { 
      type: String, 
      default: 'You are a helpful and friendly Discord bot assistant.' 
    },
  },
  // Moderation Settings
  moderation: {
    enabled: { type: Boolean, default: true },
    logChannelId: { type: String, default: null },
    muteRoleId: { type: String, default: null },
    autoMod: {
      enabled: { type: Boolean, default: false },
      antiSpam: { type: Boolean, default: false },
      antiLinks: { type: Boolean, default: false },
      antiInvites: { type: Boolean, default: false },
      badWords: [{ type: String }],
    },
  },
  // Leveling System
  leveling: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null }, // Level up announcements
    message: { 
      type: String, 
      default: 'Congratulations {user}! You reached level {level}!' 
    },
    xpRate: { type: Number, default: 1.0 }, // Multiplier
    ignoredChannels: [{ type: String }],
    roleRewards: [{
      level: { type: Number, required: true },
      roleId: { type: String, required: true },
    }],
  },
  // Economy Settings
  economy: {
    enabled: { type: Boolean, default: true },
    currency: {
      name: { type: String, default: 'coins' },
      symbol: { type: String, default: '🪙' },
    },
    daily: {
      enabled: { type: Boolean, default: true },
      amount: { type: Number, default: 100 },
      streak: { type: Boolean, default: true },
    },
    work: {
      enabled: { type: Boolean, default: true },
      cooldown: { type: Number, default: 3600000 }, // 1 hour in ms
      minAmount: { type: Number, default: 50 },
      maxAmount: { type: Number, default: 200 },
    },
  },
  // Music Settings
  music: {
    enabled: { type: Boolean, default: true },
    djRoleId: { type: String, default: null },
    maxQueueSize: { type: Number, default: 100 },
    defaultVolume: { type: Number, default: 50 },
    allowFilters: { type: Boolean, default: true },
  },
  // Logging
  logs: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    events: {
      memberJoin: { type: Boolean, default: true },
      memberLeave: { type: Boolean, default: true },
      messageDelete: { type: Boolean, default: true },
      messageEdit: { type: Boolean, default: true },
      roleUpdate: { type: Boolean, default: true },
      channelUpdate: { type: Boolean, default: true },
    },
  },
  // Premium
  premium: {
    enabled: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    features: [{ type: String }],
  },
}, {
  timestamps: true,
});

// Methods
guildSchema.methods.updateSettings = async function(settings) {
  Object.assign(this, settings);
  return await this.save();
};

guildSchema.methods.resetToDefaults = async function() {
  const defaults = new (model('Guild'))({ guildId: this.guildId });
  Object.keys(defaults.toObject()).forEach(key => {
    if (key !== '_id' && key !== 'guildId') {
      this[key] = defaults[key];
    }
  });
  return await this.save();
};

// Statics
guildSchema.statics.findByGuildId = function(guildId) {
  return this.findOne({ guildId });
};

guildSchema.statics.getOrCreate = async function(guildId, guildName) {
  let guild = await this.findOne({ guildId });
  if (!guild) {
    guild = await this.create({ guildId, guildName });
  } else if (guild.guildName !== guildName) {
    guild.guildName = guildName;
    await guild.save();
  }
  return guild;
};

export default model('Guild', guildSchema);