import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } from 'discord.js';

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

    // Categorize commands
    const categories = {
      music: { emoji: '🎵', name: 'Music', commands: [] },
      moderation: { emoji: '🛡️', name: 'Moderation', commands: [] },
      economy: { emoji: '💰', name: 'Economy', commands: [] },
      leveling: { emoji: '📊', name: 'Leveling', commands: [] },
      utility: { emoji: '🔧', name: 'Utility', commands: [] },
    };

    client.commands.forEach(command => {
      const category = command.category || 'utility';
      if (categories[category]) {
        categories[category].commands.push(command.data.name);
      }
    });

    // Main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: 'Hosei BOT Command Help',
        iconURL: client.user.displayAvatarURL()
      })
      .setDescription(
        `👋 Hello ${interaction.user}! I'm **Hosei BOT**!\n\n` +
        `**📚 Total Commands:** ${client.commands.size}\n` +
        `**🎯 Select a category below to view commands**`
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({
        text: 'Use /help <command> for detailed info',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Add quick overview
    Object.entries(categories).forEach(([key, cat]) => {
      if (cat.commands.length > 0) {
        helpEmbed.addFields({
          name: `${cat.emoji} ${cat.name} (${cat.commands.length})`,
          value: cat.commands.slice(0, 5).map(cmd => `\`/${cmd}\``).join(', ') + (cat.commands.length > 5 ? '...' : ''),
          inline: false
        });
      }
    });

    // Create select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category-select')
      .setPlaceholder('📂 Select a category to view commands')
      .addOptions([
        {
          label: '🎵 Music Commands',
          description: `${categories.music.commands.length} commands - Music playback and control`,
          value: 'music',
          emoji: '🎵'
        },
        {
          label: '🛡️ Moderation Commands',
          description: `${categories.moderation.commands.length} commands - Server moderation tools`,
          value: 'moderation',
          emoji: '🛡️'
        },
        {
          label: '💰 Economy Commands',
          description: `${categories.economy.commands.length} commands - Currency and trading`,
          value: 'economy',
          emoji: '💰'
        },
        {
          label: '📊 Leveling Commands',
          description: `${categories.leveling.commands.length} commands - XP and ranking`,
          value: 'leveling',
          emoji: '📊'
        },
        {
          label: '🔧 Utility Commands',
          description: `${categories.utility.commands.length} commands - Useful tools`,
          value: 'utility',
          emoji: '🔧'
        }
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const response = await interaction.reply({
      embeds: [helpEmbed],
      components: [row]
    });

    // Handle select menu interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This menu is not for you!', ephemeral: true });
      }

      const category = i.values[0];
      const categoryData = categories[category];

      const categoryEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${categoryData.emoji} ${categoryData.name} Commands`)
        .setDescription(`Here are all ${categoryData.commands.length} commands in the ${categoryData.name} category:`)
        .setThumbnail(client.user.displayAvatarURL());

      // Group commands in fields
      const commandsList = categoryData.commands.map(cmdName => {
        const cmd = client.commands.get(cmdName);
        return `**/${cmdName}**\n${cmd.data.description}`;
      }).join('\n\n');

      categoryEmbed.addFields({
        name: 'Commands',
        value: commandsList || 'No commands in this category',
        inline: false
      });

      categoryEmbed.setFooter({
        text: `Use /help <command> for more details • ${categoryData.commands.length} commands`,
        iconURL: interaction.user.displayAvatarURL()
      });

      await i.update({ embeds: [categoryEmbed], components: [row] });
    });

    collector.on('end', () => {
      // Remove select menu after timeout
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};