import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Send coins to another user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to send coins to')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Amount of coins to send')
        .setRequired(true)
        .setMinValue(1)
    ),

  cooldown: 3,
  category: 'economy',

  async execute(interaction) {
    const recipient = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    // Validation
    if (recipient.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot send coins to bots!')
        ],
        ephemeral: true
      });
    }

    if (recipient.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot send coins to yourself!')
        ],
        ephemeral: true
      });
    }

    try {
      // Get sender data
      const senderData = await User.getOrCreate(
        interaction.user.id,
        interaction.user.username,
        interaction.user.discriminator
      );

      // Check if sender has enough money
      if (senderData.economy.balance < amount) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ You don't have enough coins!\n\n**Your balance:** ${senderData.economy.balance.toLocaleString()} coins\n**Needed:** ${amount.toLocaleString()} coins`)
          ],
          ephemeral: true
        });
      }

      // Get recipient data
      const recipientData = await User.getOrCreate(
        recipient.id,
        recipient.username,
        recipient.discriminator
      );

      // Transfer money
      await senderData.removeMoney(amount, 'balance');
      await recipientData.addMoney(amount, 'balance');

      // Create success embed
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('💸 Payment Successful')
        .setDescription(`${interaction.user} sent **${amount.toLocaleString()}** coins to ${recipient}`)
        .addFields(
          {
            name: '👤 Sender Balance',
            value: `${senderData.economy.balance.toLocaleString()} coins`,
            inline: true
          },
          {
            name: '👤 Recipient Balance',
            value: `${recipientData.economy.balance.toLocaleString()} coins`,
            inline: true
          }
        )
        .setFooter({ text: `Transaction ID: ${Date.now()}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      // Try to notify recipient
      try {
        await recipient.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('💰 You received coins!')
              .setDescription(`${interaction.user.username} sent you **${amount.toLocaleString()}** coins!`)
              .addFields({
                name: '💰 New Balance',
                value: `${recipientData.economy.balance.toLocaleString()} coins`,
              })
              .setTimestamp()
          ]
        });
      } catch (error) {
        // Recipient has DMs disabled
      }

    } catch (error) {
      console.error('Error processing payment:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while processing the payment.')
        ],
        ephemeral: true
      });
    }
  },
};