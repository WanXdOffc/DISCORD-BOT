import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit coins into your bank')
    .addStringOption(option =>
      option
        .setName('amount')
        .setDescription('Amount to deposit (or "all" for everything)')
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

      // Check if user has any money in wallet
      if (userData.economy.balance === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ You don\'t have any coins in your wallet to deposit!')
          ],
          ephemeral: true
        });
      }

      // Calculate amount
      let amount;
      if (amountInput === 'all' || amountInput === 'max') {
        amount = userData.economy.balance;
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
      if (amount > userData.economy.balance) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ You don't have enough coins in your wallet!\n\n**Wallet:** ${userData.economy.balance.toLocaleString()} coins\n**Trying to deposit:** ${amount.toLocaleString()} coins`)
          ],
          ephemeral: true
        });
      }

      // Transfer from wallet to bank
      userData.economy.balance -= amount;
      userData.economy.bank += amount;
      await userData.save();

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🏦 Deposit Successful')
        .setDescription(`Successfully deposited **${amount.toLocaleString()}** coins into your bank!`)
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
        .setFooter({ text: 'Keep your coins safe in the bank!' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error depositing:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while depositing.')
        ],
        ephemeral: true
      });
    }
  },
};