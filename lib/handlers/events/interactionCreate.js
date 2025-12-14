import { Collection } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`Command not found: ${interaction.commandName}`);
        return;
      }

      try {
        // Cooldown system
        const { cooldowns } = client;

        if (!cooldowns.has(command.data.name)) {
          cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(interaction.user.id)) {
          const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({
              content: `⏱️ Please wait ${timeLeft.toFixed(1)} more seconds before using \`${command.data.name}\` again.`,
              ephemeral: true,
            });
          }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

        // Execute command
        await command.execute(interaction, client);
        
        logger.info(`${interaction.user.tag} used /${interaction.commandName} in ${interaction.guild?.name || 'DM'}`);
      } catch (error) {
        logger.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = {
          content: '❌ There was an error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Handle Button Interactions
    if (interaction.isButton()) {
      logger.info(`Button clicked: ${interaction.customId} by ${interaction.user.tag}`);
      // Button handler logic will be added later
    }

    // Handle Select Menu Interactions
    if (interaction.isStringSelectMenu()) {
      logger.info(`Select menu: ${interaction.customId} by ${interaction.user.tag}`);
      // Select menu handler logic will be added later
    }

    // Handle Modal Submissions
    if (interaction.isModalSubmit()) {
      logger.info(`Modal submitted: ${interaction.customId} by ${interaction.user.tag}`);
      // Modal handler logic will be added later
    }
  },
};