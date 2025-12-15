import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('deletedays')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getUser('target');
    const member = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('deletedays') || 0;

    // Validation checks
    if (target.id === interaction.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot ban yourself!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot ban myself!')
        ],
        ephemeral: true
      });
    }

    if (member) {
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ You cannot ban someone with a higher or equal role!')
          ],
          ephemeral: true
        });
      }

      if (!member.bannable) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ I cannot ban this user! They may have a higher role than me.')
          ],
          ephemeral: true
        });
      }
    }

    // Check if user is already banned
    try {
      const banList = await interaction.guild.bans.fetch();
      if (banList.has(target.id)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ This user is already banned!')
          ],
          ephemeral: true
        });
      }
    } catch (error) {
      console.error('Error checking ban list:', error);
    }

    // Try to DM the user before banning
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔨 You have been banned')
            .setDescription(`You were banned from **${interaction.guild.name}**`)
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
              }
            )
            .setTimestamp()
        ]
      });
    } catch (error) {
      // User has DMs disabled or blocked bot
    }

    // Ban the user
    try {
      await interaction.guild.members.ban(target, {
        reason: `${reason} | Banned by ${interaction.user.tag}`,
        deleteMessageSeconds: deleteDays * 86400
      });

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({
          name: 'Member Banned',
          iconURL: target.displayAvatarURL()
        })
        .setThumbnail(target.displayAvatarURL())
        .addFields(
          {
            name: '👤 User',
            value: `${target.tag}\n\`${target.id}\``,
            inline: true
          },
          {
            name: '👮 Moderator',
            value: `${interaction.user.tag}`,
            inline: true
          },
          {
            name: '📝 Reason',
            value: reason,
            inline: false
          },
          {
            name: '🗑️ Messages Deleted',
            value: `${deleteDays} day(s)`,
            inline: true
          }
        )
        .setFooter({ text: `Banned by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error banning user:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Failed to ban user: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  },
};