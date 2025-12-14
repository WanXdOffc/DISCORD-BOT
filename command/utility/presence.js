import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import config from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('presence')
    .setDescription('Manage bot rich presence (Owner only)')
    .addSubcommand(subcommand =>
      subcommand
        .setName('theme')
        .setDescription('Change presence theme')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Theme to use')
            .setRequired(true)
            .addChoices(
              { name: '📊 Default - Stats Rotation', value: 'default' },
              { name: '🎮 Gaming - Game References', value: 'gaming' },
              { name: '🎵 Music - Music Focused', value: 'music' },
              { name: '📈 Stats - Detailed Statistics', value: 'stats' },
              { name: '💪 Motivational - Inspiring Messages', value: 'motivational' },
              { name: '👨‍💻 Developer - Dev Mode', value: 'developer' },
              { name: '🕐 Time Based - Changes by Time', value: 'timeBased' },
              { name: '🎭 Fun Random - Random Fun Messages', value: 'funRandom' }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('Show all available themes')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('Show current presence information')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 5,
  category: 'utility',

  async execute(interaction, client) {
    // Check if user is bot owner
    if (interaction.user.id !== config.discord.ownerId) {
      return interaction.reply({
        content: '❌ This command can only be used by the bot owner!',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'theme') {
      const themeName = interaction.options.getString('name');
      
      // Change theme
      const success = client.richPresence.changeTheme(themeName);
      
      if (success) {
        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('✅ Presence Theme Changed')
          .setDescription(`Successfully switched to **${themeName}** theme!`)
          .addFields({
            name: '🎨 Active Theme',
            value: `\`${themeName}\``,
            inline: true
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({
          content: '❌ Failed to change theme. Please try again.',
          ephemeral: true
        });
      }
    }

    else if (subcommand === 'list') {
      const themes = client.richPresence.getAvailableThemes();
      
      const themeDescriptions = {
        default: '📊 Rotating server stats and user count',
        gaming: '🎮 Game references and competitive activities',
        music: '🎵 Music-focused activities and streaming',
        stats: '📈 Detailed bot statistics and metrics',
        motivational: '💪 Inspirational and motivating messages',
        developer: '👨‍💻 Development mode indicators',
        timeBased: '🕐 Changes based on time of day',
        funRandom: '🎭 Fun and random activities'
      };

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🎨 Available Presence Themes')
        .setDescription('Use `/presence theme <name>` to change theme\n\n' +
          themes.map(theme => {
            const isCurrent = theme === client.richPresence.currentTheme;
            return `${isCurrent ? '➡️' : '▫️'} **${theme}**\n${themeDescriptions[theme] || 'No description'}`;
          }).join('\n\n')
        )
        .addFields({
          name: '🎯 Current Theme',
          value: `\`${client.richPresence.currentTheme}\``,
          inline: true
        })
        .setFooter({ text: 'Themes rotate every 15 seconds' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }

    else if (subcommand === 'info') {
      const stats = client.richPresence.getStats();
      const uptime = client.richPresence.getUptime();

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('ℹ️ Rich Presence Information')
        .setDescription('Current bot presence system status')
        .addFields(
          {
            name: '🎨 Active Theme',
            value: `\`${client.richPresence.currentTheme}\``,
            inline: true
          },
          {
            name: '🔄 Rotation Index',
            value: `\`${client.richPresence.currentIndex}\``,
            inline: true
          },
          {
            name: '⏱️ Bot Uptime',
            value: `\`${uptime}\``,
            inline: true
          },
          {
            name: '📊 Cached Stats',
            value: `**Guilds:** ${stats.guilds}\n` +
                   `**Users:** ${stats.users.toLocaleString()}\n` +
                   `**Channels:** ${stats.channels}\n` +
                   `**Commands:** ${stats.commands}`,
            inline: false
          },
          {
            name: '🕐 Status Schedule',
            value: '**Online:** 06:00 - 22:00\n' +
                   '**Idle:** 22:00 - 06:00\n' +
                   '**DND:** 03:00 - 05:00 (Maintenance)',
            inline: false
          }
        )
        .setFooter({ 
          text: `Last stats update: ${stats.lastUpdate ? stats.lastUpdate.toLocaleTimeString() : 'Never'}` 
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};