import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';
import Guild from '../../lib/database/schemas/Guild.js';
import ms from 'ms';

export default {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn coins'),

  cooldown: 3,
  category: 'economy',

  async execute(interaction) {
    // Get user data
    const userData = await User.getOrCreate(
      interaction.user.id,
      interaction.user.username,
      interaction.user.discriminator
    );

    // Get guild settings
    const guildData = await Guild.getOrCreate(
      interaction.guildId,
      interaction.guild.name
    );

    // Check if economy is enabled
    if (!guildData.features.economy || !guildData.economy.work.enabled) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Work feature is disabled in this server!')
        ],
        ephemeral: true
      });
    }

    // Check cooldown
    const now = Date.now();
    const cooldown = guildData.economy.work.cooldown || 3600000; // Default 1 hour
    const lastWork = userData.economy.lastWork;

    if (lastWork) {
      const timeLeft = (lastWork.getTime() + cooldown) - now;
      
      if (timeLeft > 0) {
        const timeString = ms(timeLeft, { long: true });
        
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('⏰ Work Cooldown')
              .setDescription(`You're tired! Rest for **${timeString}** before working again.`)
          ],
          ephemeral: true
        });
      }
    }

    // Random work amount
    const minAmount = guildData.economy.work.minAmount || 50;
    const maxAmount = guildData.economy.work.maxAmount || 200;
    const earnedAmount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;

    // Random work scenarios
    const workScenarios = [
      { emoji: '👨‍💼', text: 'You worked as a manager' },
      { emoji: '👨‍💻', text: 'You wrote some code' },
      { emoji: '👨‍🍳', text: 'You cooked delicious food' },
      { emoji: '👨‍🔧', text: 'You fixed some machines' },
      { emoji: '👨‍🎨', text: 'You created amazing art' },
      { emoji: '👨‍🏫', text: 'You taught a class' },
      { emoji: '👨‍⚕️', text: 'You helped patients' },
      { emoji: '👨‍🌾', text: 'You worked on the farm' },
      { emoji: '👨‍✈️', text: 'You flew a plane' },
      { emoji: '👨‍🚀', text: 'You explored space' },
      { emoji: '🎮', text: 'You tested video games' },
      { emoji: '📸', text: 'You took amazing photos' },
      { emoji: '🎵', text: 'You performed music' },
      { emoji: '🎬', text: 'You made a movie' },
      { emoji: '📝', text: 'You wrote an article' },
    ];

    const scenario = workScenarios[Math.floor(Math.random() * workScenarios.length)];

    // Update user data
    userData.economy.balance += earnedAmount;
    userData.economy.totalEarned += earnedAmount;
    userData.economy.lastWork = new Date(now);
    await userData.save();

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${scenario.emoji} Work Complete!`)
      .setDescription(`${scenario.text} and earned **${earnedAmount.toLocaleString()}** ${guildData.economy.currency.symbol} coins!`)
      .addFields(
        {
          name: '💰 New Balance',
          value: `${userData.economy.balance.toLocaleString()} coins`,
          inline: true
        },
        {
          name: '⏰ Next Work',
          value: `<t:${Math.floor((now + cooldown) / 1000)}:R>`,
          inline: true
        }
      )
      .setFooter({ text: `Total earned: ${userData.economy.totalEarned.toLocaleString()} coins` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};