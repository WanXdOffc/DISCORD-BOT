import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the economy leaderboard')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of leaderboard')
        .setRequired(false)
        .addChoices(
          { name: '💰 Balance', value: 'balance' },
          { name: '💎 Total Wealth', value: 'wealth' },
          { name: '📊 Level', value: 'level' }
        )
    ),

  cooldown: 5,
  category: 'economy',

  async execute(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString('type') || 'wealth';
    let leaderboard;
    let title;
    let emoji;

    try {
      switch (type) {
        case 'balance':
          leaderboard = await User.find({ 'blacklisted.status': false })
            .sort({ 'economy.balance': -1 })
            .limit(10)
            .select('userId username economy.balance');
          title = '💰 Balance Leaderboard';
          emoji = '💰';
          break;

        case 'wealth':
          // Get all users and calculate total wealth
          const users = await User.find({ 'blacklisted.status': false })
            .select('userId username economy.balance economy.bank');
          
          leaderboard = users
            .map(u => ({
              userId: u.userId,
              username: u.username,
              total: u.economy.balance + u.economy.bank
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);
          title = '💎 Total Wealth Leaderboard';
          emoji = '💎';
          break;

        case 'level':
          leaderboard = await User.find({ 'blacklisted.status': false })
            .sort({ 'leveling.totalXp': -1 })
            .limit(10)
            .select('userId username leveling.level leveling.totalXp');
          title = '📊 Level Leaderboard';
          emoji = '📊';
          break;
      }

      if (!leaderboard || leaderboard.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription('📊 No data available yet. Start using economy commands!')
          ]
        });
      }

      // Find user's rank
      const userId = interaction.user.id;
      let userRank = null;
      let userValue = null;

      if (type === 'wealth') {
        const allUsers = await User.find({ 'blacklisted.status': false })
          .select('userId economy.balance economy.bank');
        const sorted = allUsers
          .map(u => ({
            userId: u.userId,
            total: u.economy.balance + u.economy.bank
          }))
          .sort((a, b) => b.total - a.total);
        
        userRank = sorted.findIndex(u => u.userId === userId) + 1;
        const userData = sorted.find(u => u.userId === userId);
        if (userData) userValue = userData.total;
      } else if (type === 'balance') {
        const allUsers = await User.find({ 'blacklisted.status': false })
          .sort({ 'economy.balance': -1 })
          .select('userId economy.balance');
        
        userRank = allUsers.findIndex(u => u.userId === userId) + 1;
        const userData = allUsers.find(u => u.userId === userId);
        if (userData) userValue = userData.economy.balance;
      } else if (type === 'level') {
        const allUsers = await User.find({ 'blacklisted.status': false })
          .sort({ 'leveling.totalXp': -1 })
          .select('userId leveling.level leveling.totalXp');
        
        userRank = allUsers.findIndex(u => u.userId === userId) + 1;
        const userData = allUsers.find(u => u.userId === userId);
        if (userData) {
          userValue = `Level ${userData.leveling.level} (${userData.leveling.totalXp.toLocaleString()} XP)`;
        }
      }

      // Create leaderboard text
      const medals = ['🥇', '🥈', '🥉'];
      let description = '';

      for (let i = 0; i < leaderboard.length; i++) {
        const user = leaderboard[i];
        const medal = medals[i] || `${i + 1}.`;
        
        let valueText;
        if (type === 'level') {
          valueText = `Level ${user.leveling.level} (${user.leveling.totalXp.toLocaleString()} XP)`;
        } else if (type === 'wealth') {
          valueText = `${user.total.toLocaleString()} coins`;
        } else {
          valueText = `${user.economy.balance.toLocaleString()} coins`;
        }

        description += `${medal} **${user.username}**\n${emoji} ${valueText}\n\n`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(description)
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ 
          text: `Global Leaderboard • ${interaction.guild.name}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // Add user's rank if not in top 10
      if (userRank && userRank > 10) {
        embed.addFields({
          name: '📍 Your Rank',
          value: `**#${userRank}** - ${typeof userValue === 'string' ? userValue : `${userValue.toLocaleString()} coins`}`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while fetching the leaderboard.')
        ]
      });
    }
  },
};