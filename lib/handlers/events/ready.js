import { ActivityType } from 'discord.js';
import logger from '../../utils/logger.js';

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

    // Set bot presence/status
    const activities = [
      { name: 'your commands', type: ActivityType.Listening },
      { name: 'with Discord.js', type: ActivityType.Playing },
      { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'music 🎵', type: ActivityType.Listening },
    ];

    let currentActivity = 0;

    // Set initial activity
    client.user.setPresence({
      activities: [activities[0]],
      status: 'online',
    });

    // Rotate activities every 30 seconds
    setInterval(() => {
      currentActivity = (currentActivity + 1) % activities.length;
      client.user.setActivity(activities[currentActivity]);
    }, 30000);

    logger.info('✅ Bot is ready and online!');
  },
};