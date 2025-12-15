import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import ms from 'ms';

export default {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('duration')
        .setDescription('Timeout duration (e.g., 10m, 1h, 1d)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the timeout')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const durationString = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Parse duration
    const duration = ms(durationString);
    
    if (!duration || duration < 5000 || duration > 2419200000) { // 5 seconds to 28 days
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Invalid duration! Please use a valid time format (e.g., 10m, 1h, 1d)\n**Range:** 5 seconds to 28 days')
        ],
        ephemeral: true
      });
    }

    // Validation checks
    if (!target) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ User not found in this server!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot timeout yourself!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot timeout myself!')
        ],
        ephemeral: true
      });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot timeout someone with a higher or equal role!')
        ],
        ephemeral: true
      });
    }

    if (!target.moderatable) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot timeout this user! They may have a higher role than me.')
        ],
        ephemeral: true
      });
    }

    // Try to DM the user before timeout
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏱️ You have been timed out')
            .setDescription(`You were timed out in **${interaction.guild.name}**`)
            .addFields(
              {
                name: '👮 Moderator',
                value: `${interaction.user.tag}`,
                inline: true
              },
              {
                name: '⏱️ Duration',
                value: ms(duration, { long: true }),
                inline: true
              },
              {
                name: '📝 Reason',
                value: reason,
                inline: false
              }
            )
            .setTimestamp()
        ]
      });
    } catch (error) {
      // User has DMs disabled or blocked bot
    }

    // Timeout the user
    try {
      await target.timeout(duration, reason);

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({
          name: 'Member Timed Out',
          iconURL: target.user.displayAvatarURL()
        })
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          {
            name: '👤 User',
            value: `${target.user.tag}\n\`${target.id}\``,
            inline: true
          },
          {
            name: '👮 Moderator',
            value: `${interaction.user.tag}`,
            inline: true
          },
          {
            name: '⏱️ Duration',
            value: ms(duration, { long: true }),
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: false
          },
          {
            name: '⏰ Expires',
            value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`,
            inline: false
          }
        )
        .setFooter({ text: `Timed out by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error timing out user:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Failed to timeout user: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  },
};