import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import config from './config.js';
import logger from './lib/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Deploy slash commands to Discord
 */
async function deployCommands() {
  const commands = [];
  const commandPath = join(__dirname, 'command');

  try {
    logger.info('📝 Loading commands for deployment...');

    // Get all categories
    const categories = readdirSync(commandPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    // Load all command files
    for (const category of categories) {
      const categoryPath = join(commandPath, category);
      const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        try {
          const filePath = join(categoryPath, file);
          const fileUrl = pathToFileURL(filePath).href;
          const command = await import(fileUrl);

          if (command.default && command.default.data) {
            commands.push(command.default.data.toJSON());
            logger.info(`  ✓ Loaded: ${category}/${file}`);
          } else {
            logger.warn(`  ⚠️ Skipped ${file}: Invalid structure`);
          }
        } catch (error) {
          logger.error(`  ✗ Error loading ${file}:`, error.message);
        }
      }
    }

    logger.info(`📦 Total commands to deploy: ${commands.length}`);

    // Create REST instance
    const rest = new REST({ version: '10' }).setToken(config.discord.token);

    logger.info('🚀 Starting deployment...');

    // Deploy commands globally
    const data = await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands }
    );

    logger.info('='.repeat(50));
    logger.info(`✅ Successfully deployed ${data.length} slash commands globally!`);
    logger.info('='.repeat(50));

    // List deployed commands
    logger.info('\n📋 Deployed Commands:');
    data.forEach((cmd, index) => {
      logger.info(`  ${index + 1}. /${cmd.name} - ${cmd.description}`);
    });

  } catch (error) {
    logger.error('❌ Error deploying commands:', error);
    process.exit(1);
  }
}

// Run deployment
deployCommands();