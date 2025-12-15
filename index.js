import { Client, GatewayIntentBits, Collection, Partials } from 'discord.js';
import config from './config.js';
import connectDatabase from './lib/database/connect.js';
import { loadCommands, loadEvents } from './lib/handlers/loader.js';
import { setupMusicPlayer } from './lib/handlers/musicPlayer.js';
import logger from './lib/utils/logger.js';
import WebServer from './lib/web/server.js';

// Initialize Discord Client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true,
  }
});

// Initialize Collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.config = config;

// Startup Function
async function startup() {
  try {
    logger.info('🚀 Starting Discord Hosei BOT...');

    // Connect to Database
    logger.info('📦 Connecting to MongoDB...');
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Load Commands
    logger.info('📝 Loading commands...');
    await loadCommands(client);
    logger.info(`✅ Loaded ${client.commands.size} commands`);

    // Load Events
    logger.info('🎯 Loading events...');
    await loadEvents(client);
    logger.info('✅ Events loaded successfully');

    // Login to Discord
    logger.info('🔐 Logging in to Discord...');
    await client.login(config.discord.token);

    // Wait for client to be ready before starting web server
    client.once('ready', async () => {
      // Setup Music Player
      logger.info('🎵 Setting up Music Player...');
      await setupMusicPlayer(client);
      
      // Start Web Dashboard
      logger.info('🌐 Starting Web Dashboard...');
      const webServer = new WebServer(client);
      webServer.start();
      client.webServer = webServer;
    });

  } catch (error) {
    logger.error('❌ Fatal error during startup:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('🛑 Shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

// Start the bot
startup();