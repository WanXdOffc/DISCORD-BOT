import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get avatar from')
        .setRequired(false)
    ),

  cooldown: 3,
  category: 'utility',

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild.members.cache.get(target.id);

    // Get different avatar URLs
    const globalAvatar = target.displayAvatarURL({ size: 4096, extension: 'png' });
    const serverAvatar = member?.displayAvatarURL({ size: 4096, extension: 'png' });

    // Check if user has server-specific avatar
    const hasServerAvatar = serverAvatar !== globalAvatar;

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || 0x5865F2)
      .setAuthor({
        name: `${target.username}'s Avatar`,
        iconURL: target.displayAvatarURL()
      })
      .setImage(globalAvatar)
      .setDescription(
        hasServerAvatar 
          ? '**Global Avatar** (Use buttons below to switch)'
          : '**Avatar**'
      )
      .setFooter({ text: `User ID: ${target.id}` })
      .setTimestamp();

    // Create buttons
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Download PNG')
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 4096, extension: 'png' })),
      new ButtonBuilder()
        .setLabel('Download JPG')
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 4096, extension: 'jpg' })),
      new ButtonBuilder()
        .setLabel('Download WebP')
        .setStyle(ButtonStyle.Link)
        .setURL(target.displayAvatarURL({ size: 4096, extension: 'webp' }))
    );

    // Add animated GIF option if avatar is animated
    if (target.avatar?.startsWith('a_')) {
      buttons.addComponents(
        new ButtonBuilder()
          .setLabel('Download GIF')
          .setStyle(ButtonStyle.Link)
          .setURL(target.displayAvatarURL({ size: 4096, extension: 'gif' }))
      );
    }

    // Add server avatar button if different
    if (hasServerAvatar) {
      const serverButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('View Server Avatar')
          .setStyle(ButtonStyle.Link)
          .setURL(serverAvatar)
      );

      await interaction.reply({ 
        embeds: [embed],
        components: [buttons, serverButtons]
      });
    } else {
      await interaction.reply({ 
        embeds: [embed],
        components: [buttons]
      });
    }
  },
};