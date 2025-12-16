import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to get information about')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'utility',

  async execute(interaction) {
    const target = interaction.options.getUser('user') || interaction.user;
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

    // Status emoji
    const statusEmoji = {
      'online': '🟢',
      'idle': '🟡',
      'dnd': '🔴',
      'offline': '⚫'
    };

    const status = member.presence?.status || 'offline';
    const statusText = statusEmoji[status] + ' ' + status.charAt(0).toUpperCase() + status.slice(1);

    // Get roles (exclude @everyone)
    const roles = member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => r.toString())
      .slice(0, 10);

    const roleText = roles.length > 0 ? roles.join(', ') : 'None';
    const moreRoles = member.roles.cache.size - 11 > 0 ? `\n+${member.roles.cache.size - 11} more` : '';

    // Permissions
    const keyPermissions = [];
    if (member.permissions.has('Administrator')) keyPermissions.push('Administrator');
    if (member.permissions.has('ManageGuild')) keyPermissions.push('Manage Server');
    if (member.permissions.has('ManageChannels')) keyPermissions.push('Manage Channels');
    if (member.permissions.has('ManageRoles')) keyPermissions.push('Manage Roles');
    if (member.permissions.has('BanMembers')) keyPermissions.push('Ban Members');
    if (member.permissions.has('KickMembers')) keyPermissions.push('Kick Members');

    // User flags (badges)
    const flags = target.flags?.toArray() || [];
    const badges = {
      'Staff': '👨‍💼',
      'Partner': '🤝',
      'HypeSquadEvents': '🎉',
      'BugHunterLevel1': '🐛',
      'BugHunterLevel2': '🐛',
      'HypeSquadBravery': '🛡️',
      'HypeSquadBrilliance': '💎',
      'HypeSquadBalance': '⚖️',
      'PremiumEarlySupporter': '⭐',
      'VerifiedDeveloper': '✅',
      'CertifiedModerator': '🔨',
      'ActiveDeveloper': '💻'
    };

    const userBadges = flags.map(flag => badges[flag]).filter(Boolean).join(' ');

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(member.displayHexColor || 0x5865F2)
      .setTitle(`${target.bot ? '🤖' : '👤'} ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: '🆔 User ID',
          value: `\`${target.id}\``,
          inline: true
        },
        {
          name: '📅 Account Created',
          value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`,
          inline: true
        },
        {
          name: '📥 Joined Server',
          value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,
          inline: true
        },
        {
          name: '📊 Status',
          value: statusText,
          inline: true
        },
        {
          name: '🎭 Nickname',
          value: member.nickname || 'None',
          inline: true
        },
        {
          name: '🏆 Highest Role',
          value: member.roles.highest.toString(),
          inline: true
        }
      );

    // Add badges if any
    if (userBadges) {
      embed.addFields({
        name: '🏅 Badges',
        value: userBadges,
        inline: false
      });
    }

    // Add roles
    embed.addFields({
      name: `🎨 Roles [${member.roles.cache.size - 1}]`,
      value: roleText + moreRoles,
      inline: false
    });

    // Add key permissions
    if (keyPermissions.length > 0) {
      embed.addFields({
        name: '🔑 Key Permissions',
        value: keyPermissions.join(', '),
        inline: false
      });
    }

    // Add boost status
    if (member.premiumSince) {
      embed.addFields({
        name: '💎 Boosting Since',
        value: `<t:${Math.floor(member.premiumSinceTimestamp / 1000)}:R>`,
        inline: true
      });
    }

    // Add timeout info if exists
    if (member.communicationDisabledUntilTimestamp) {
      const timeoutEnd = Math.floor(member.communicationDisabledUntilTimestamp / 1000);
      embed.addFields({
        name: '⏱️ Timed Out Until',
        value: `<t:${timeoutEnd}:R>`,
        inline: true
      });
    }

    // Add activity if present
    if (member.presence?.activities && member.presence.activities.length > 0) {
      const activity = member.presence.activities[0];
      const activityTypes = ['Playing', 'Streaming', 'Listening to', 'Watching', 'Competing in'];
      const activityText = `${activityTypes[activity.type]} ${activity.name}`;
      
      embed.addFields({
        name: '🎮 Activity',
        value: activityText,
        inline: false
      });
    }

    embed.setFooter({ text: `Requested by ${interaction.user.username}` });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};