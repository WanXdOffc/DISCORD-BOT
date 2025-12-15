import { Player } from 'discord-player';
import { YoutubeiExtractor } from 'discord-player-youtubei';
import logger from '../utils/logger.js';

// Fix for encryption mode issue
try {
  const sodium = await import('libsodium-wrappers');
  await sodium.ready;
  logger.info('✅ Libsodium encryption loaded');
} catch (error) {
  logger.warn('⚠️ Libsodium not available, using fallback encryption');
}

/**
 * Setup and configure Discord Player
 * @param {Client} client - Discord.js client
 */
export async function setupMusicPlayer(client) {
  try {
    // Create player instance
    const player = new Player(client, {
      ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      },
    });

    // Register extractors
    await player.extractors.register(YoutubeiExtractor, {});
    await player.extractors.loadDefault((ext) => ext !== 'YouTubeExtractor');

    // Player Events
    player.events.on('playerStart', (queue, track) => {
      const channel = queue.metadata.channel;
      if (channel) {
        logger.info(`Started playing: ${track.title} in ${queue.guild.name}`);
      }
    });

    player.events.on('audioTrackAdd', (queue, track) => {
      const channel = queue.metadata.channel;
      if (channel && queue.tracks.size > 0) {
        channel.send({
          content: `🎵 Added to queue: **${track.title}** - \`${track.duration}\``,
        }).catch(console.error);
      }
    });

    player.events.on('playerSkip', (queue, track) => {
      logger.info(`Skipped: ${track.title} in ${queue.guild.name}`);
    });

    player.events.on('disconnect', (queue) => {
      const channel = queue.metadata.channel;
      if (channel) {
        channel.send('👋 Disconnected from voice channel!').catch(console.error);
      }
      logger.info(`Disconnected from ${queue.guild.name}`);
    });

    player.events.on('emptyChannel', (queue) => {
      const channel = queue.metadata.channel;
      if (channel) {
        channel.send('🚶 Left voice channel due to inactivity.').catch(console.error);
      }
      logger.info(`Left empty channel in ${queue.guild.name}`);
    });

    player.events.on('emptyQueue', (queue) => {
      const channel = queue.metadata.channel;
      if (channel) {
        channel.send('✅ Queue finished! Thank you for listening 🎵').catch(console.error);
      }
      logger.info(`Queue finished in ${queue.guild.name}`);
    });

    player.events.on('error', (queue, error) => {
      logger.error(`Player error in ${queue.guild.name}:`, error);
      const channel = queue.metadata.channel;
      if (channel) {
        channel.send(`❌ An error occurred: ${error.message}`).catch(console.error);
      }
    });

    player.events.on('playerError', (queue, error) => {
      logger.error(`Player error in ${queue.guild.name}:`, error);
      const channel = queue.metadata.channel;
      if (channel) {
        channel.send('❌ Error playing the track. Skipping...').catch(console.error);
      }
    });

    // Debug events
    player.events.on('debug', async (queue, message) => {
      logger.debug(`[Player Debug] ${message}`);
    });

    // Store player in client
    client.player = player;

    logger.info('✅ Discord Player initialized successfully');
    logger.info(`   Loaded extractors: YouTube, Spotify, SoundCloud, Apple Music`);

    return player;
  } catch (error) {
    logger.error('❌ Failed to initialize Discord Player:', error);
    throw error;
  }
}

/**
 * Get active music sessions count
 * @param {Client} client 
 * @returns {number}
 */
export function getActiveMusicSessions(client) {
  if (!client.player) return 0;
  
  let activeCount = 0;
  for (const queue of client.player.nodes.cache.values()) {
    if (queue.isPlaying()) {
      activeCount++;
    }
  }
  
  return activeCount;
}