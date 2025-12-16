import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Attempt to rob another user (risky!)')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to rob')
        .setRequired(true)
    ),

  cooldown: 60, // 1 minute cooldown
  category: 'economy',

  async execute(interaction) {
    const target = interaction.options.getUser('user');

    // Validation
    if (target.bot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot rob bots!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot rob yourself!')
        ],
        ephemeral: true
      });
    }

    try {
      // Get both users data
      const robberData = await User.getOrCreate(
        interaction.user.id,
        interaction.user.username,
        interaction.user.discriminator
      );

      const victimData = await User.getOrCreate(
        target.id,
        target.username,
        target.discriminator
      );

      // Check if robber has at least 100 coins
      if (robberData.economy.balance < 100) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ You need at least **100 coins** in your wallet to attempt a robbery!')
          ],
          ephemeral: true
        });
      }

      // Check if victim has money
      if (victimData.economy.balance < 50) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ ${target} doesn't have enough coins to rob! (Minimum: 50 coins)`)
          ],
          ephemeral: true
        });
      }

      // Calculate success chance (40% base)
      const successChance = 0.4;
      const success = Math.random() < successChance;

      if (success) {
        // Successful robbery - steal 20-50% of victim's wallet
        const stealPercentage = Math.random() * 0.3 + 0.2; // 20-50%
        const stolenAmount = Math.floor(victimData.economy.balance * stealPercentage);

        // Transfer money
        victimData.economy.balance -= stolenAmount;
        robberData.economy.balance += stolenAmount;
        robberData.economy.totalEarned += stolenAmount;
        victimData.economy.totalSpent += stolenAmount;

        await victimData.save();
        await robberData.save();

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('💰 Robbery Successful!')
          .setDescription(`You successfully robbed ${target} and stole **${stolenAmount.toLocaleString()}** coins!`)
          .addFields(
            {
              name: '💰 Your New Balance',
              value: `${robberData.economy.balance.toLocaleString()} coins`,
              inline: true
            },
            {
              name: '😢 Victim\'s Balance',
              value: `${victimData.economy.balance.toLocaleString()} coins`,
              inline: true
            }
          )
          .setFooter({ text: 'Crime pays... sometimes!' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        // Notify victim
        try {
          await target.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xED4245)
                .setTitle('🚨 You were robbed!')
                .setDescription(`${interaction.user.username} robbed you and took **${stolenAmount.toLocaleString()}** coins!`)
                .addFields({
                  name: '💰 Remaining Balance',
                  value: `${victimData.economy.balance.toLocaleString()} coins`,
                })
                .setFooter({ text: 'Keep your coins in the bank to protect them!' })
                .setTimestamp()
            ]
          });
        } catch (error) {
          // Victim has DMs disabled
        }

      } else {
        // Failed robbery - pay fine (25% of your wallet)
        const fine = Math.floor(robberData.economy.balance * 0.25);

        robberData.economy.balance -= fine;
        robberData.economy.totalSpent += fine;
        await robberData.save();

        const embed = new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle('🚔 Robbery Failed!')
          .setDescription(`You were caught trying to rob ${target}!\n\nYou paid a fine of **${fine.toLocaleString()}** coins.`)
          .addFields({
            name: '💰 Your New Balance',
            value: `${robberData.economy.balance.toLocaleString()} coins`,
            inline: true
          })
          .setFooter({ text: 'Crime doesn\'t always pay!' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('Error processing robbery:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while processing the robbery.')
        ],
        ephemeral: true
      });
    }
  },
};