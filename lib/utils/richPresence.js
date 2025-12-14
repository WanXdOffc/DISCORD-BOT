import { ActivityType } from 'discord.js';
import logger from './logger.js';

/**
 * Rich Presence Manager - Advanced bot status system
 * Features: Dynamic stats, multiple themes, time-based changes
 */
class RichPresence {
  constructor(client) {
    this.client = client;
    this.currentIndex = 0;
    this.currentTheme = 'default';
    this.interval = null;
    this.statsCache = {
      guilds: 0,
      users: 0,
      channels: 0,
      commands: 0,
      lastUpdate: null,
    };

    // Presence themes dengan berbagai style
    this.themes = {
      // Theme Default - Rotating stats
      default: [
        () => ({
          name: `👥 ${this.getStats().users} users`,
          type: ActivityType.Watching,
        }),
        () => ({
          name: `🏠 ${this.getStats().guilds} servers`,
          type: ActivityType.Watching,
        }),
        () => ({
          name: '🎵 Music & Fun',
          type: ActivityType.Listening,
        }),
        () => ({
          name: '⚡ /help for commands',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🤖 AI Chat Ready',
          type: ActivityType.Listening,
        }),
      ],

      // Theme Gaming - Game references
      gaming: [
        () => ({
          name: '🎮 Discord Quest',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '⚔️ RPG Adventures',
          type: ActivityType.Competing,
        }),
        () => ({
          name: '🎲 with Discord users',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🏆 Leaderboard Battles',
          type: ActivityType.Competing,
        }),
      ],

      // Theme Music - Music focused
      music: [
        () => ({
          name: '🎵 Spotify, YouTube, SoundCloud',
          type: ActivityType.Listening,
        }),
        () => ({
          name: '🎧 High Quality Audio',
          type: ActivityType.Streaming,
          url: 'https://twitch.tv/discord',
        }),
        () => ({
          name: '🎼 24/7 Music Ready',
          type: ActivityType.Listening,
        }),
        () => ({
          name: `🎶 Playing in ${this.getActiveMusicSessions()} servers`,
          type: ActivityType.Playing,
        }),
      ],

      // Theme Stats - Detailed statistics
      stats: [
        () => ({
          name: `📊 ${this.getStats().commands} commands loaded`,
          type: ActivityType.Watching,
        }),
        () => ({
          name: `💬 ${this.getStats().channels} channels`,
          type: ActivityType.Watching,
        }),
        () => ({
          name: `⚡ Uptime: ${this.getUptime()}`,
          type: ActivityType.Playing,
        }),
        () => ({
          name: `🔥 ${this.getStats().guilds} communities`,
          type: ActivityType.Watching,
        }),
      ],

      // Theme Motivational - Inspirational messages
      motivational: [
        () => ({
          name: '💪 Never Give Up!',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🌟 You Can Do It!',
          type: ActivityType.Watching,
        }),
        () => ({
          name: '🚀 Keep Growing!',
          type: ActivityType.Competing,
        }),
        () => ({
          name: '✨ Believe in Yourself',
          type: ActivityType.Playing,
        }),
      ],

      // Theme Developer - Dev mode indicators
      developer: [
        () => ({
          name: '👨‍💻 Development Mode',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🔧 Testing Features',
          type: ActivityType.Watching,
        }),
        () => ({
          name: '🐛 Debugging',
          type: ActivityType.Competing,
        }),
        () => ({
          name: `💾 v${this.getBotVersion()}`,
          type: ActivityType.Playing,
        }),
      ],

      // Theme Time-Based - Changes by time of day
      timeBased: [
        () => {
          const hour = new Date().getHours();
          if (hour >= 5 && hour < 12) {
            return { name: '☀️ Good Morning!', type: ActivityType.Playing };
          } else if (hour >= 12 && hour < 17) {
            return { name: '🌤️ Good Afternoon!', type: ActivityType.Playing };
          } else if (hour >= 17 && hour < 21) {
            return { name: '🌆 Good Evening!', type: ActivityType.Playing };
          } else {
            return { name: '🌙 Good Night!', type: ActivityType.Playing };
          }
        },
        () => ({
          name: `🕐 ${this.getCurrentTime()}`,
          type: ActivityType.Watching,
        }),
      ],

      // Theme Random Fun - Fun random messages
      funRandom: [
        () => ({
          name: '🎭 Being Awesome',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🍕 Pizza Time!',
          type: ActivityType.Competing,
        }),
        () => ({
          name: '☕ Coffee Break',
          type: ActivityType.Playing,
        }),
        () => ({
          name: '🎪 Discord Circus',
          type: ActivityType.Watching,
        }),
        () => ({
          name: '🦄 Unicorn Hunting',
          type: ActivityType.Competing,
        }),
      ],
    };
  }

  /**
   * Start the rich presence rotation
   * @param {string} theme - Theme name to use
   * @param {number} interval - Rotation interval in ms (default: 15000)
   */
  start(theme = 'default', interval = 15000) {
    // Stop existing interval if running
    this.stop();

    // Validate theme
    if (!this.themes[theme]) {
      logger.warn(`Theme "${theme}" not found, using default`);
      theme = 'default';
    }

    this.currentTheme = theme;
    this.updateStatsCache();

    // Set initial presence
    this.updatePresence();

    // Start rotation interval
    this.interval = setInterval(() => {
      this.updatePresence();
      
      // Update stats cache every 5 rotations
      if (this.currentIndex % 5 === 0) {
        this.updateStatsCache();
      }
    }, interval);

    logger.info(`🎨 Rich Presence started with theme: ${theme}`);
  }

  /**
   * Stop the rich presence rotation
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info('🎨 Rich Presence stopped');
    }
  }

  /**
   * Change theme on the fly
   * @param {string} theme - New theme name
   */
  changeTheme(theme) {
    if (!this.themes[theme]) {
      logger.warn(`Theme "${theme}" not found`);
      return false;
    }

    this.currentTheme = theme;
    this.currentIndex = 0;
    this.updatePresence();
    logger.info(`🎨 Changed theme to: ${theme}`);
    return true;
  }

  /**
   * Update bot presence with current activity
   */
  updatePresence() {
    const activities = this.themes[this.currentTheme];
    const activity = activities[this.currentIndex];

    try {
      const activityData = typeof activity === 'function' ? activity() : activity;
      
      this.client.user.setPresence({
        activities: [activityData],
        status: this.getStatusByTime(),
      });

      this.currentIndex = (this.currentIndex + 1) % activities.length;
    } catch (error) {
      logger.error('Error updating presence:', error);
    }
  }

  /**
   * Get bot status based on time (online/idle/dnd)
   */
  getStatusByTime() {
    const hour = new Date().getHours();
    
    // Night time: idle (22:00 - 06:00)
    if (hour >= 22 || hour < 6) {
      return 'idle';
    }
    
    // Maintenance window: dnd (03:00 - 05:00)
    if (hour >= 3 && hour < 5) {
      return 'dnd';
    }
    
    // Normal hours: online
    return 'online';
  }

  /**
   * Update cached statistics
   */
  updateStatsCache() {
    try {
      this.statsCache = {
        guilds: this.client.guilds.cache.size,
        users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        channels: this.client.channels.cache.size,
        commands: this.client.commands?.size || 0,
        lastUpdate: new Date(),
      };
    } catch (error) {
      logger.error('Error updating stats cache:', error);
    }
  }

  /**
   * Get cached stats
   */
  getStats() {
    return this.statsCache;
  }

  /**
   * Get active music sessions count
   */
  getActiveMusicSessions() {
    // Will be implemented when music system is ready
    return 0;
  }

  /**
   * Get bot uptime formatted
   */
  getUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get current time formatted
   */
  getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Get bot version from package.json
   */
  getBotVersion() {
    try {
      // Will read from package.json
      return '1.0.0';
    } catch {
      return 'dev';
    }
  }

  /**
   * Set custom activity manually
   * @param {Object} activity - Activity object
   * @param {string} status - Status (online/idle/dnd/invisible)
   */
  setCustom(activity, status = 'online') {
    try {
      this.client.user.setPresence({
        activities: [activity],
        status: status,
      });
      logger.info('🎨 Custom presence set');
      return true;
    } catch (error) {
      logger.error('Error setting custom presence:', error);
      return false;
    }
  }

  /**
   * Get all available themes
   */
  getAvailableThemes() {
    return Object.keys(this.themes);
  }
}

export default RichPresence;