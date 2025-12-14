import { ActivityType } from 'discord.js';
import logger from '../../utils/logger.js';
import RichPresence from '../../utils/richPresence.js';

export default {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info('='.repeat(50));
    logger.info(`🤖 Bot logged in as: ${client.user.tag}`);
    logger.info(`📊 Serving ${client.guilds.cache.size} servers`);
    logger.info(`👥 Watching ${client.users.cache.size} users`);
    logger.info(`📝 Loaded ${client.commands.size} commands`);
    logger.info('='.repeat(50));

    // Initialize Rich Presence Manager
    const richPresence = new RichPresence(client);
    richPresence.start();

    // Store in client for access from other modules
    client.richPresence = richPresence;

    logger.info('✅ Bot is ready and online!');
    logger.info('🎨 Rich Presence system activated!');
  },
};