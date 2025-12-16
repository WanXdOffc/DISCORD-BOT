import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display detailed information about this server'),

  cooldown: 5,
  category: 'utility',

  async execute(interaction) {
    const guild = interaction.guild;

    // Fetch additional data
    await guild.members.fetch();
    await guild.channels.fetch();

    // Member statistics
    const totalMembers = guild.memberCount;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const online = guild.members.cache.filter(m => m.presence?.status === 'online').size;

    // Channel statistics
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === 0).size;
    const voiceChannels = channels.filter(c => c.type === 2).size;
    const categories = channels.filter(c => c.type === 4).size;
    const threads = channels.filter(c => c.isThread()).size;

    // Role statistics
    const roles = guild.roles.cache.size - 1; // Exclude @everyone

    // Boost information
    const boostTier = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostEmoji = ['📊', '📈', '📈', '🚀'][boostTier];

    // Server features
    const features = guild.features.map(f => {
      const featureNames = {
        'ANIMATED_ICON': 'Animated Icon',
        'BANNER': 'Server Banner',
        'COMMERCE': 'Store Channels',
        'COMMUNITY': 'Community',
        'DISCOVERABLE': 'Discoverable',
        'PARTNERED': 'Partnered',
        'VANITY_URL': 'Vanity URL',
        'VERIFIED': 'Verified',
        'VIP_REGIONS': 'VIP Regions',
        'WELCOME_SCREEN_ENABLED': 'Welcome Screen',
        'MEMBER_VERIFICATION_GATE_ENABLED': 'Membership Screening',
        'PREVIEW_ENABLED': 'Preview Enabled',
      };
      return featureNames[f] || f;
    }).slice(0, 10);

    // Verification level
    const verificationLevels = ['None', 'Low', 'Medium', 'High', 'Very High'];
    const verificationLevel = verificationLevels[guild.verificationLevel];

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📊 ${guild.name}`)
      .setThumbnail(guild.iconURL({ size: 256 }))
      .addFields(
        {
          name: '👑 Owner',
          value: `<@${guild.ownerId}>`,
          inline: true
        },
        {
          name: '📅 Created',
          value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
          inline: true
        },
        {
          name: '🆔 Server ID',
          value: `\`${guild.id}\``,
          inline: true
        },
        {
          name: `👥 Members (${totalMembers})`,
          value: `👤 Humans: ${humans}\n🤖 Bots: ${bots}\n🟢 Online: ${online}`,
          inline: true
        },
        {
          name: `📝 Channels (${channels.size})`,
          value: `💬 Text: ${textChannels}\n🔊 Voice: ${voiceChannels}\n📁 Categories: ${categories}\n🧵 Threads: ${threads}`,
          inline: true
        },
        {
          name: `🎭 Roles`,
          value: `${roles} roles`,
          inline: true
        },
        {
          name: `${boostEmoji} Boost Status`,
          value: `Level ${boostTier}\n${boostCount} boosts`,
          inline: true
        },
        {
          name: '🔒 Verification',
          value: verificationLevel,
          inline: true
        },
        {
          name: '😊 Emojis',
          value: `${guild.emojis.cache.size}`,
          inline: true
        }
      );

    // Add server banner if exists
    if (guild.banner) {
      embed.setImage(guild.bannerURL({ size: 512 }));
    }

    // Add features if any
    if (features.length > 0) {
      embed.addFields({
        name: '✨ Features',
        value: features.join(', '),
        inline: false
      });
    }

    // Add description if exists
    if (guild.description) {
      embed.setDescription(guild.description);
    }

    embed.setFooter({ 
      text: `Joined: ${guild.members.me.joinedAt.toLocaleDateString()}` 
    });
    embed.setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};