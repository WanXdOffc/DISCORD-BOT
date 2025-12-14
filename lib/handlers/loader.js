import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load all command files from command directory
 * @param {Client} client - Discord.js client instance
 */
export async function loadCommands(client) {
  const commandPath = join(__dirname, '../../command');
  let commandCount = 0;

  try {
    // Check if command directory exists
    const categories = readdirSync(commandPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    if (categories.length === 0) {
      logger.warn('⚠️ No command categories found. Please add command files.');
      return;
    }

    // Load commands from each category
    for (const category of categories) {
      const categoryPath = join(commandPath, category);
      const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        try {
          const filePath = join(categoryPath, file);
          const fileUrl = pathToFileURL(filePath).href;
          const command = await import(fileUrl);
          
          // Validate command structure
          if (command.default && command.default.data && command.default.execute) {
            const commandData = command.default;
            client.commands.set(commandData.data.name, commandData);
            commandCount++;
            logger.info(`  ✓ Loaded: ${category}/${file}`);
          } else {
            logger.warn(`  ⚠️ Skipped ${file}: Invalid command structure`);
          }
        } catch (error) {
          logger.error(`  ✗ Error loading ${file}:`, error.message);
        }
      }
    }

    logger.info(`📝 Total commands loaded: ${commandCount}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('⚠️ Command directory not found. Creating structure...');
      // Directory will be created when first command is added
    } else {
      logger.error('❌ Error loading commands:', error);
    }
  }
}

/**
 * Load all event files from lib/handlers/events directory
 * @param {Client} client - Discord.js client instance
 */
export async function loadEvents(client) {
  const eventPath = join(__dirname, 'events');
  let eventCount = 0;

  try {
    const eventFiles = readdirSync(eventPath).filter(file => file.endsWith('.js'));

    if (eventFiles.length === 0) {
      logger.warn('⚠️ No event handlers found.');
      return;
    }

    for (const file of eventFiles) {
      try {
        const filePath = join(eventPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const event = await import(fileUrl);

        if (event.default && event.default.name && event.default.execute) {
          const eventData = event.default;
          
          if (eventData.once) {
            client.once(eventData.name, (...args) => eventData.execute(...args, client));
          } else {
            client.on(eventData.name, (...args) => eventData.execute(...args, client));
          }
          
          eventCount++;
          logger.info(`  ✓ Loaded event: ${eventData.name}`);
        } else {
          logger.warn(`  ⚠️ Skipped ${file}: Invalid event structure`);
        }
      } catch (error) {
        logger.error(`  ✗ Error loading ${file}:`, error.message);
      }
    }

    logger.info(`🎯 Total events loaded: ${eventCount}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('⚠️ Events directory not found. Creating basic events...');
    } else {
      logger.error('❌ Error loading events:', error);
    }
  }
}