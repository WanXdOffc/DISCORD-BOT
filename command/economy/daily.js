import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';
import Guild from '../../lib/database/schemas/Guild.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins reward'),

  cooldown: 5,
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
    if (!guildData.features.economy) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Economy system is disabled in this server!')
        ],
        ephemeral: true
      });
    }

    // Check cooldown (24 hours)
    const now = new Date();
    const lastDaily = userData.economy.lastDaily;
    
    if (lastDaily) {
      const timeDiff = now - lastDaily;
      const hoursLeft = 24 - (timeDiff / 3600000);
      
      if (hoursLeft > 0) {
        const hours = Math.floor(hoursLeft);
        const minutes = Math.floor((hoursLeft - hours) * 60);
        
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('⏰ Daily Cooldown')
              .setDescription(`You've already claimed your daily reward!\n\nCome back in **${hours}h ${minutes}m**`)
              .setFooter({ text: 'Daily rewards reset every 24 hours' })
          ],
          ephemeral: true
        });
      }
    }

    // Calculate reward
    let baseAmount = guildData.economy.daily.amount || 100;
    let streak = userData.economy.dailyStreak || 0;
    
    // Check if streak should reset (more than 48 hours)
    if (lastDaily) {
      const hoursSinceLastDaily = (now - lastDaily) / 3600000;
      if (hoursSinceLastDaily > 48) {
        streak = 0;
      }
    }

    // Increment streak
    streak += 1;
    
    // Streak bonus (5% per day, max 50%)
    const streakBonus = Math.min(streak * 0.05, 0.5);
    const totalAmount = Math.floor(baseAmount * (1 + streakBonus));

    // Update user data
    userData.economy.balance += totalAmount;
    userData.economy.totalEarned += totalAmount;
    userData.economy.dailyStreak = streak;
    userData.economy.lastDaily = now;
    await userData.save();

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('💰 Daily Reward Claimed!')
      .setDescription(`You received **${totalAmount.toLocaleString()}** ${guildData.economy.currency.symbol} coins!`)
      .addFields(
        {
          name: '🔥 Current Streak',
          value: `${streak} day(s)`,
          inline: true
        },
        {
          name: '📈 Streak Bonus',
          value: `+${Math.floor(streakBonus * 100)}%`,
          inline: true
        },
        {
          name: '💰 New Balance',
          value: `${userData.economy.balance.toLocaleString()} coins`,
          inline: true
        }
      )
      .setFooter({ text: 'Come back tomorrow to keep your streak!' })
      .setTimestamp();

    // Add milestone messages
    if (streak === 7) {
      embed.setDescription(
        embed.data.description + 
        '\n\n🎉 **Weekly Milestone!** Keep up the streak!'
      );
    } else if (streak === 30) {
      embed.setDescription(
        embed.data.description + 
        '\n\n🏆 **Monthly Milestone!** Amazing dedication!'
      );
    } else if (streak === 100) {
      embed.setDescription(
        embed.data.description + 
        '\n\n👑 **100 Day Milestone!** You\'re a legend!'
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};