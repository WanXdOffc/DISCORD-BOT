import dotenv from 'dotenv';
dotenv.config();

export default {
  // Discord Configuration
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    ownerId: process.env.OWNER_ID,
    prefix: process.env.PREFIX || '!',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/hosei_bot',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    }
  },

  // Web Dashboard Configuration
  web: {
    port: process.env.PORT || 3000,
    sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-this',
    callbackUrl: process.env.CALLBACK_URL || 'http://localhost:3000/callback',
    domain: process.env.DOMAIN || 'http://localhost:3000',
  },

  // AI Configuration
  ai: {
    provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    },
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
      baseUrl: 'https://openrouter.ai/api/v1',
    }
  },

  // Lavalink Configuration
  lavalink: {
    host: process.env.LAVALINK_HOST || 'localhost',
    port: process.env.LAVALINK_PORT || 2333,
    password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
  },

  // Bot Settings
  settings: {
    devMode: process.env.DEV_MODE === 'true',
    defaultColor: 0x5865F2, // Discord Blurple
    errorColor: 0xED4245,
    successColor: 0x57F287,
    warningColor: 0xFEE75C,
  },

  // Feature Toggles (Default values)
  features: {
    music: true,
    moderation: true,
    economy: true,
    leveling: true,
    aiChat: true,
    games: true,
    verification: true,
  }
};