import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as OAuth2Strategy } from 'passport-oauth2';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../../config.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.setupMiddleware();
    this.setupAuth();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // View engine
    this.app.set('view engine', 'ejs');
    this.app.set('views', join(__dirname, '../../views'));

    // Body parser
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Static files
    this.app.use('/assets', express.static(join(__dirname, '../../asset')));

    // Session
    this.app.use(session({
      secret: config.web.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
      }
    }));

    // Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    // Make client available in all routes
    this.app.use((req, res, next) => {
      req.client = this.client;
      next();
    });

    logger.info('✅ Express middleware configured');
  }

  /**
   * Setup Discord OAuth2 authentication
   */
  setupAuth() {
    // Configure Discord OAuth2 Strategy
    passport.use('discord', new OAuth2Strategy({
      authorizationURL: 'https://discord.com/api/oauth2/authorize',
      tokenURL: 'https://discord.com/api/oauth2/token',
      clientID: config.discord.clientId,
      clientSecret: config.discord.clientSecret,
      callbackURL: config.web.callbackUrl,
      scope: ['identify', 'guilds'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user info
        const userResponse = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const user = await userResponse.json();

        // Fetch user guilds
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const guilds = await guildsResponse.json();

        // Filter guilds where user has MANAGE_GUILD permission
        const manageableGuilds = guilds.filter(guild => 
          (parseInt(guild.permissions) & 0x20) === 0x20
        );

        user.guilds = guilds;
        user.manageableGuilds = manageableGuilds;
        user.accessToken = accessToken;

        return done(null, user);
      } catch (error) {
        logger.error('OAuth error:', error);
        return done(error, null);
      }
    }));

    // Serialize user
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    // Deserialize user
    passport.deserializeUser((user, done) => {
      done(null, user);
    });

    logger.info('✅ Discord OAuth2 configured');
  }

  /**
   * Setup Express routes
   */
  setupRoutes() {
    // Home page
    this.app.get('/', (req, res) => {
      res.render('index', {
        user: req.user,
        client: this.client,
        config: config,
      });
    });

    // Login
    this.app.get('/login', passport.authenticate('discord'));

    // OAuth callback
    this.app.get('/callback',
      passport.authenticate('discord', { failureRedirect: '/' }),
      (req, res) => {
        res.redirect('/dashboard');
      }
    );

    // Logout
    this.app.get('/logout', (req, res) => {
      req.logout(() => {
        res.redirect('/');
      });
    });

    // Dashboard - requires authentication
    this.app.get('/dashboard', this.requireAuth, (req, res) => {
      res.render('dashboard', {
        user: req.user,
        client: this.client,
        guilds: req.user.manageableGuilds,
      });
    });

    // Guild settings
    this.app.get('/dashboard/:guildId', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      
      // Check if user can manage this guild
      const canManage = req.user.manageableGuilds.some(g => g.id === guildId);
      if (!canManage) {
        return res.status(403).render('error', { 
          message: 'You do not have permission to manage this server',
          user: req.user 
        });
      }

      // Get guild from client
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).render('error', { 
          message: 'Bot is not in this server',
          user: req.user 
        });
      }

      // Get guild settings from database (will implement later)
      const guildSettings = await this.getGuildSettings(guildId);

      res.render('guild', {
        user: req.user,
        guild: guild,
        settings: guildSettings,
      });
    });

    // API endpoint - update guild settings
    this.app.post('/api/guild/:guildId/settings', this.requireAuth, async (req, res) => {
      const { guildId } = req.params;
      const settings = req.body;

      // Verify permissions
      const canManage = req.user.manageableGuilds.some(g => g.id === guildId);
      if (!canManage) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      try {
        // Save settings to database (will implement later)
        await this.saveGuildSettings(guildId, settings);
        res.json({ success: true, message: 'Settings saved successfully' });
      } catch (error) {
        logger.error('Error saving settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
      }
    });

    // API endpoint - get bot stats
    this.app.get('/api/stats', (req, res) => {
      const stats = {
        guilds: this.client.guilds.cache.size,
        users: this.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        channels: this.client.channels.cache.size,
        commands: this.client.commands.size,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };
      res.json(stats);
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).render('error', {
        message: 'Page not found',
        user: req.user,
      });
    });

    logger.info('✅ Express routes configured');
  }

  /**
   * Middleware to require authentication
   */
  requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/login');
  }

  /**
   * Get guild settings from database
   * @param {string} guildId 
   */
  async getGuildSettings(guildId) {
    // Will be implemented with MongoDB schema in PHASE 4
    return {
      prefix: config.discord.prefix,
      musicEnabled: true,
      levelingEnabled: true,
      welcomeEnabled: false,
      welcomeChannel: null,
      verificationEnabled: false,
      aiChatEnabled: false,
      aiChatChannels: [],
    };
  }

  /**
   * Save guild settings to database
   * @param {string} guildId 
   * @param {Object} settings 
   */
  async saveGuildSettings(guildId, settings) {
    // Will be implemented with MongoDB schema in PHASE 4
    logger.info(`Saving settings for guild ${guildId}`);
    return true;
  }

  /**
   * Start the web server
   */
  start() {
    const port = config.web.port;
    this.app.listen(port, () => {
      logger.info('='.repeat(50));
      logger.info(`🌐 Web Dashboard started on port ${port}`);
      logger.info(`📍 URL: ${config.web.domain}`);
      logger.info(`🔐 OAuth Callback: ${config.web.callbackUrl}`);
      logger.info('='.repeat(50));
    });
  }
}

export default WebServer;