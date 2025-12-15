import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or someone else\'s balance')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check balance for')
        .setRequired(false)
    ),

  cooldown: 3,
  category: 'economy',

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
    
    if (target.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Bots don\'t have economy accounts!')
        ],
        ephemeral: true
      });
    }

    // Get or create user
    const userData = await User.getOrCreate(
      target.id,
      target.username,
      target.discriminator
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: `${target.username}'s Balance`,
        iconURL: target.displayAvatarURL()
      })
      .setThumbnail(target.displayAvatarURL())
      .addFields(
        {
          name: '💰 Wallet',
          value: `\`${userData.economy.balance.toLocaleString()}\` coins`,
          inline: true
        },
        {
          name: '🏦 Bank',
          value: `\`${userData.economy.bank.toLocaleString()}\` coins`,
          inline: true
        },
        {
          name: '💎 Total',
          value: `\`${(userData.economy.balance + userData.economy.bank).toLocaleString()}\` coins`,
          inline: true
        }
      );

    // Add streak info if checking self
    if (target.id === interaction.user.id && userData.economy.dailyStreak > 0) {
      embed.addFields({
        name: '🔥 Daily Streak',
        value: `${userData.economy.dailyStreak} day(s)`,
        inline: true
      });
    }

    // Add stats
    embed.addFields({
      name: '📊 Statistics',
      value: `**Total Earned:** ${userData.economy.totalEarned.toLocaleString()} coins\n` +
             `**Total Spent:** ${userData.economy.totalSpent.toLocaleString()} coins\n` +
             `**Net Worth:** ${((userData.economy.balance + userData.economy.bank) - userData.economy.totalSpent + userData.economy.totalEarned).toLocaleString()} coins`,
      inline: false
    });

    embed.setFooter({ text: `ID: ${target.id}` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};