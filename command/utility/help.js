import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available commands and features')
    .addStringOption(option =>
      option
        .setName('command')
        .setDescription('Get detailed help for a specific command')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'utility',

  async execute(interaction, client) {
    const commandName = interaction.options.getString('command');

    // If specific command requested
    if (commandName) {
      const command = client.commands.get(commandName);
      
      if (!command) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ Command \`${commandName}\` not found!`)
          ],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📖 Command: /${command.data.name}`)
        .setDescription(command.data.description || 'No description available')
        .addFields({
          name: '⏱️ Cooldown',
          value: `${command.cooldown || 3} seconds`,
          inline: true
        });

      if (command.category) {
        embed.addFields({
          name: '📂 Category',
          value: command.category,
          inline: true
        });
      }

      // Show options if available
      if (command.data.options && command.data.options.length > 0) {
        const options = command.data.options.map(opt => {
          const required = opt.required ? '`[Required]`' : '`[Optional]`';
          return `**${opt.name}** ${required}\n${opt.description}`;
        }).join('\n\n');

        embed.addFields({
          name: '⚙️ Options',
          value: options,
          inline: false
        });
      }

      return interaction.reply({ embeds: [embed] });
    }

    // General help - categorize commands
    const categories = {
      music: { emoji: '🎵', name: 'Music', commands: [] },
      moderation: { emoji: '🛡️', name: 'Moderation', commands: [] },
      economy: { emoji: '💰', name: 'Economy', commands: [] },
      leveling: { emoji: '📊', name: 'Leveling', commands: [] },
      games: { emoji: '🎮', name: 'Games', commands: [] },
      utility: { emoji: '🔧', name: 'Utility', commands: [] },
    };

    // Organize commands by category
    client.commands.forEach(command => {
      const category = command.category || 'utility';
      if (categories[category]) {
        categories[category].commands.push(command.data.name);
      }
    });

    // Create main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: 'Hosei BOT Help Menu',
        iconURL: client.user.displayAvatarURL()
      })
      .setDescription(
        `👋 Hello ${interaction.user}! I'm **Hosei BOT**, your all-in-one Discord assistant!\n\n` +
        `**📚 Total Commands:** ${client.commands.size}\n` +
        `**🌐 Dashboard:** [Click here](${client.config.web.domain})\n\n` +
        `Use \`/help <command>\` for detailed information about a command.`
      )
      .setThumbnail(client.user.displayAvatarURL());

    // Add categories with commands
    Object.entries(categories).forEach(([key, cat]) => {
      if (cat.commands.length > 0) {
        helpEmbed.addFields({
          name: `${cat.emoji} ${cat.name}`,
          value: cat.commands.map(cmd => `\`/${cmd}\``).join(', '),
          inline: false
        });
      }
    });

    helpEmbed.addFields(
      {
        name: '🔗 Links',
        value: '[Dashboard](${client.config.web.domain}) • [Invite Bot](#) • [Support Server](#)',
        inline: false
      },
      {
        name: '💡 Tips',
        value: '• Use `/ping` to check bot status\n' +
               '• Use `/presence` to change bot status (Owner only)\n' +
               '• Mention me in an AI channel for conversation!',
        inline: false
      }
    );

    helpEmbed.setFooter({
      text: `Requested by ${interaction.user.username} • Page 1/1`,
      iconURL: interaction.user.displayAvatarURL()
    });
    
    helpEmbed.setTimestamp();

    // Create select menu for categories
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category')
      .setPlaceholder('🔍 Select a category for more info')
      .addOptions(
        {
          label: '🎵 Music Commands',
          description: 'Play, queue, skip, and control music',
          value: 'music',
          emoji: '🎵'
        },
        {
          label: '🛡️ Moderation Commands',
          description: 'Kick, ban, timeout members',
          value: 'moderation',
          emoji: '🛡️'
        },
        {
          label: '🔧 Utility Commands',
          description: 'Helpful utility commands',
          value: 'utility',
          emoji: '🔧'
        }
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [helpEmbed],
      components: [row]
    });
  },
};