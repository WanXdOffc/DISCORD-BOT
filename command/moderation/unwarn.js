import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Member from '../../lib/database/schemas/Member.js';

export default {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to remove warning from')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('warning_id')
        .setDescription('The warning ID to remove')
        .setRequired(true)
    ),

  cooldown: 3,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const warningId = interaction.options.getString('warning_id');

    try {
      // Get member data
      const memberData = await Member.findByUserAndGuild(target.id, interaction.guildId);

      if (!memberData || memberData.moderation.warnings.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ ${target} has no warnings in this server.`)
          ],
          ephemeral: true
        });
      }

      // Find the warning
      const warning = memberData.moderation.warnings.find(w => w.id === warningId);
      
      if (!warning) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ Warning ID \`${warningId}\` not found.\nUse \`/warnings @user\` to see valid warning IDs.`)
          ],
          ephemeral: true
        });
      }

      // Remove warning
      const removed = await memberData.removeWarning(warningId);

      if (!removed) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ Failed to remove warning.')
          ],
          ephemeral: true
        });
      }

      // Try to notify user
      const member = interaction.guild.members.cache.get(target.id);
      if (member) {
        try {
          await member.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x57F287)
                .setTitle('✅ Warning Removed')
                .setDescription(`A warning has been removed from your record in **${interaction.guild.name}**`)
                .addFields(
                  {
                    name: '👮 Removed By',
                    value: `${interaction.user.tag}`,
                    inline: true
                  },
                  {
                    name: '🔢 Remaining Warnings',
                    value: `${memberData.moderation.totalWarnings}`,
                    inline: true
                  },
                  {
                    name: '📝 Original Reason',
                    value: warning.reason,
                    inline: false
                  }
                )
                .setTimestamp()
            ]
          });
        } catch (error) {
          // User has DMs disabled
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'Warning Removed',
          iconURL: target.displayAvatarURL()
        })
        .setDescription(`✅ Successfully removed warning \`${warningId}\` from ${target}`)
        .addFields(
          {
            name: '📝 Warning Details',
            value: `**Reason:** ${warning.reason}\n` +
                   `**Issued By:** <@${warning.moderator}>\n` +
                   `**Date:** <t:${Math.floor(warning.createdAt.getTime() / 1000)}:R>`,
            inline: false
          },
          {
            name: '🔢 Remaining Warnings',
            value: `${memberData.moderation.totalWarnings}`,
            inline: true
          },
          {
            name: '👮 Removed By',
            value: `${interaction.user.tag}`,
            inline: true
          }
        )
        .setFooter({ text: `Warning ID: ${warningId}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error removing warning:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while removing the warning.')
        ],
        ephemeral: true
      });
    }
  },
};