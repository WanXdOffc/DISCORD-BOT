import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Member from '../../lib/database/schemas/Member.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to warn')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)
    ),

  cooldown: 3,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason');

    // Validation
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
            .setDescription('❌ You cannot warn yourself!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot warn myself!')
        ],
        ephemeral: true
      });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot warn someone with a higher or equal role!')
        ],
        ephemeral: true
      });
    }

    try {
      // Get or create member data
      const memberData = await Member.getOrCreate(target.id, interaction.guildId);

      // Add warning
      const warningId = await memberData.addWarning(reason, interaction.user.id);

      // Try to DM the user
      try {
        await target.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle('⚠️ You have been warned')
              .setDescription(`You were warned in **${interaction.guild.name}**`)
              .addFields(
                {
                  name: '👮 Moderator',
                  value: `${interaction.user.tag}`,
                  inline: true
                },
                {
                  name: '📝 Reason',
                  value: reason,
                  inline: true
                },
                {
                  name: '🔢 Total Warnings',
                  value: `${memberData.moderation.totalWarnings}`,
                  inline: true
                },
                {
                  name: '🆔 Warning ID',
                  value: `\`${warningId}\``,
                  inline: false
                }
              )
              .setFooter({ text: 'Multiple warnings may result in further action' })
              .setTimestamp()
          ]
        });
      } catch (error) {
        // User has DMs disabled
      }

      // Create response embed
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({
          name: 'Member Warned',
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
            name: '🔢 Total Warnings',
            value: `${memberData.moderation.totalWarnings}`,
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: false
          },
          {
            name: '🆔 Warning ID',
            value: `\`${warningId}\``,
            inline: false
          }
        )
        .setFooter({ text: `Warned by ${interaction.user.username}` })
        .setTimestamp();

      // Add escalation warning if needed
      if (memberData.moderation.totalWarnings >= 3) {
        embed.addFields({
          name: '⚠️ Escalation Notice',
          value: `This user has **${memberData.moderation.totalWarnings}** warnings. Consider further action.`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error warning user:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Failed to warn user: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  },
};