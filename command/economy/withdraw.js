import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw coins from your bank')
    .addStringOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to withdraw (or "all" for everything)')
        .setRequired(true)
    ),

  cooldown: 3,
  category: 'economy',

  async execute(interaction) {
    const amountInput = interaction.options.getString('amount').toLowerCase();

    try {
      // Get user data
      const userData = await User.getOrCreate(
        interaction.user.id,
        interaction.user.username,
        interaction.user.discriminator
      );

      // Check if user has any money in bank
      if (userData.economy.bank === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ You don\'t have any coins in your bank to withdraw!')
          ],
          ephemeral: true
        });
      }

      // Calculate amount
      let amount;
      if (amountInput === 'all' || amountInput === 'max') {
        amount = userData.economy.bank;
      } else {
        amount = parseInt(amountInput);
        
        if (isNaN(amount) || amount < 1) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setDescription('❌ Please provide a valid amount or use "all"!')
            ],
            ephemeral: true
          });
        }
      }

      // Check if user has enough
      if (amount > userData.economy.bank) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ You don't have enough coins in your bank!\n\n**Bank:** ${userData.economy.bank.toLocaleString()} coins\n**Trying to withdraw:** ${amount.toLocaleString()} coins`)
          ],
          ephemeral: true
        });
      }

      // Transfer from bank to wallet
      userData.economy.bank -= amount;
      userData.economy.balance += amount;
      await userData.save();

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('💰 Withdrawal Successful')
        .setDescription(`Successfully withdrew **${amount.toLocaleString()}** coins from your bank!`)
        .addFields(
          {
            name: '💰 Wallet',
            value: `${userData.economy.balance.toLocaleString()} coins`,
            inline: true
          },
          {
            name: '🏦 Bank',
            value: `${userData.economy.bank.toLocaleString()} coins`,
            inline: true
          },
          {
            name: '💎 Total',
            value: `${(userData.economy.balance + userData.economy.bank).toLocaleString()} coins`,
            inline: true
          }
        )
        .setFooter({ text: 'Be careful! Coins in wallet can be robbed!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error withdrawing:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while withdrawing.')
        ],
        ephemeral: true
      });
    }
  },
};