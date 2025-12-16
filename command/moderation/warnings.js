import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Member from '../../lib/database/schemas/Member.js';

export default {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The member to check warnings for')
        .setRequired(true)
    ),

  cooldown: 3,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(target.id);

    if (!member) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ User not found in this server!')
        ],
        ephemeral: true
      });
    }

    try {
      // Get member data
      const memberData = await Member.findByUserAndGuild(target.id, interaction.guildId);

      if (!memberData || memberData.moderation.warnings.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('✅ No Warnings')
              .setDescription(`${target} has no warnings in this server.`)
              .setThumbnail(target.displayAvatarURL())
          ]
        });
      }

      // Sort warnings by date (newest first)
      const warnings = memberData.moderation.warnings
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10); // Show max 10 warnings

      // Create warning list
      const warningList = warnings.map((warn, index) => {
        const moderator = interaction.guild.members.cache.get(warn.moderator);
        const modName = moderator ? moderator.user.tag : `Unknown (${warn.moderator})`;
        const date = new Date(warn.createdAt);
        
        return `**${index + 1}.** <t:${Math.floor(date.getTime() / 1000)}:R>\n` +
               `**Moderator:** ${modName}\n` +
               `**Reason:** ${warn.reason}\n` +
               `**ID:** \`${warn.id}\``;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setAuthor({
          name: `${target.username}'s Warnings`,
          iconURL: target.displayAvatarURL()
        })
        .setDescription(warningList)
        .addFields(
          {
            name: '📊 Statistics',
            value: `**Total Warnings:** ${memberData.moderation.totalWarnings}\n` +
                   `**Total Kicks:** ${memberData.moderation.totalKicks}\n` +
                   `**Total Bans:** ${memberData.moderation.totalBans}\n` +
                   `**Total Timeouts:** ${memberData.moderation.totalTimeouts}`,
            inline: false
          }
        )
        .setFooter({ 
          text: `Showing ${warnings.length} of ${memberData.moderation.warnings.length} warnings • Use /unwarn to remove` 
        })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching warnings:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while fetching warnings.')
        ],
        ephemeral: true
      });
    }
  },
};