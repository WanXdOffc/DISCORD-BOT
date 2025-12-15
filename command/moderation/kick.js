import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the kick')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'moderation',

  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

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
            .setDescription('❌ You cannot kick yourself!')
        ],
        ephemeral: true
      });
    }

    if (target.id === interaction.client.user.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot kick myself!')
        ],
        ephemeral: true
      });
    }

    if (target.roles.highest.position >= interaction.member.roles.highest.position) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You cannot kick someone with a higher or equal role!')
        ],
        ephemeral: true
      });
    }

    if (!target.kickable) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I cannot kick this user! They may have a higher role than me.')
        ],
        ephemeral: true
      });
    }

    // Try to DM the user before kicking
    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚪 You have been kicked')
            .setDescription(`You were kicked from **${interaction.guild.name}**`)
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

    // Kick the user
    try {
      await target.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'Member Kicked',
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
            name: '📝 Reason',
            value: reason,
            inline: false
          }
        )
        .setFooter({ text: `Kicked by ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error kicking user:', error);
      
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ Failed to kick user: ${error.message}`)
        ],
        ephemeral: true
      });
    }
  },
};