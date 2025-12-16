import { EmbedBuilder } from 'discord.js';
import Guild from '../database/schemas/Guild.js';
import logger from '../utils/logger.js';

// Store spam tracking data
const messageTracking = new Map();
const joinTracking = new Map();

/**
 * Anti-Spam System
 */
export async function handleAntiSpam(message) {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  try {
    // Get guild settings
    const guildData = await Guild.getOrCreate(message.guildId, message.guild.name);

    // Check if anti-spam is enabled
    if (!guildData.moderation.enabled || !guildData.moderation.autoMod.enabled || !guildData.moderation.autoMod.antiSpam) {
      return;
    }

    // Don't check moderators and admins
    if (message.member.permissions.has('ManageMessages')) return;

    const userId = message.author.id;
    const now = Date.now();

    // Initialize tracking for this user
    if (!messageTracking.has(userId)) {
      messageTracking.set(userId, {
        messages: [],
        warnings: 0,
        lastWarning: 0,
      });
    }

    const userData = messageTracking.get(userId);

    // Remove messages older than 5 seconds
    userData.messages = userData.messages.filter(msg => now - msg.timestamp < 5000);

    // Add current message
    userData.messages.push({
      timestamp: now,
      content: message.content,
      channelId: message.channelId,
    });

    // Check for spam (5+ messages in 5 seconds)
    if (userData.messages.length >= 5) {
      // Delete the spam messages
      const messagesToDelete = userData.messages.slice(-5);
      for (const msg of messagesToDelete) {
        try {
          if (msg.channelId === message.channelId) {
            const channel = message.guild.channels.cache.get(msg.channelId);
            if (channel) {
              const messages = await channel.messages.fetch({ limit: 10 });
              const userMessages = messages.filter(m => m.author.id === userId);
              await channel.bulkDelete(userMessages);
            }
          }
        } catch (error) {
          logger.error('Error deleting spam messages:', error);
        }
      }

      userData.warnings += 1;
      userData.messages = [];

      // Warning message
      const warningEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle('⚠️ Anti-Spam Warning')
        .setDescription(`${message.author}, please slow down! You're sending messages too quickly.`)
        .setFooter({ text: `Warning ${userData.warnings}/3` })
        .setTimestamp();

      await message.channel.send({ embeds: [warningEmbed] }).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });

      // Timeout on 3rd warning
      if (userData.warnings >= 3 && now - userData.lastWarning > 60000) {
        try {
          await message.member.timeout(5 * 60 * 1000, 'Auto-mod: Spam detection');
          
          const timeoutEmbed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🔨 Auto-Moderation Action')
            .setDescription(`${message.author} has been timed out for 5 minutes due to spam.`)
            .setTimestamp();

          await message.channel.send({ embeds: [timeoutEmbed] });

          userData.warnings = 0;
          userData.lastWarning = now;

          // Log to mod channel
          if (guildData.moderation.logChannelId) {
            const logChannel = message.guild.channels.cache.get(guildData.moderation.logChannelId);
            if (logChannel) {
              await logChannel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0xED4245)
                    .setTitle('🤖 Auto-Mod: Spam Detection')
                    .addFields(
                      { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                      { name: 'Action', value: 'Timed out for 5 minutes', inline: true },
                      { name: 'Reason', value: 'Spam detection (5+ messages in 5 seconds)', inline: false }
                    )
                    .setTimestamp()
                ]
              });
            }
          }
        } catch (error) {
          logger.error('Error timing out spammer:', error);
        }
      }
    }

    // Check for duplicate messages (same message 3+ times)
    const recentMessages = userData.messages.slice(-10);
    const duplicates = recentMessages.filter(msg => msg.content === message.content);
    
    if (duplicates.length >= 3) {
      try {
        await message.delete();
        
        const duplicateEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setDescription(`${message.author}, please don't spam the same message!`)
          .setTimestamp();

        await message.channel.send({ embeds: [duplicateEmbed] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      } catch (error) {
        logger.error('Error handling duplicate message:', error);
      }
    }

  } catch (error) {
    logger.error('Error in anti-spam handler:', error);
  }
}

/**
 * Anti-Raid System
 */
export async function handleAntiRaid(member) {
  try {
    const guildId = member.guild.id;
    const now = Date.now();

    // Initialize tracking for this guild
    if (!joinTracking.has(guildId)) {
      joinTracking.set(guildId, []);
    }

    const guildJoins = joinTracking.get(guildId);

    // Remove joins older than 10 seconds
    const recentJoins = guildJoins.filter(join => now - join.timestamp < 10000);
    joinTracking.set(guildId, recentJoins);

    // Add current join
    recentJoins.push({
      userId: member.id,
      timestamp: now,
      accountAge: now - member.user.createdTimestamp,
    });

    // Get guild settings
    const guildData = await Guild.getOrCreate(guildId, member.guild.name);

    // Check if verification is enabled (acts as anti-raid)
    if (guildData.verification.enabled) {
      // Remove all roles from new members until verified
      if (member.roles.cache.size > 1) { // Has roles besides @everyone
        try {
          await member.roles.remove(member.roles.cache.filter(r => r.id !== guildId));
        } catch (error) {
          logger.error('Error removing roles from new member:', error);
        }
      }
    }

    // Detect raid (5+ joins in 10 seconds)
    if (recentJoins.length >= 5) {
      logger.warn(`🚨 Possible raid detected in ${member.guild.name}: ${recentJoins.length} joins in 10 seconds`);

      // Log to mod channel
      if (guildData.moderation.logChannelId) {
        const logChannel = member.guild.channels.cache.get(guildData.moderation.logChannelId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🚨 Raid Detection Alert')
            .setDescription(`Detected **${recentJoins.length}** members joining within 10 seconds!`)
            .addFields(
              {
                name: '📊 Recent Joins',
                value: recentJoins.slice(-5).map(j => `<@${j.userId}>`).join(', '),
                inline: false
              },
              {
                name: '⚠️ Recommended Actions',
                value: '• Enable verification system\n• Temporarily disable invites\n• Monitor new members\n• Use `/kick` or `/ban` if necessary',
                inline: false
              }
            )
            .setFooter({ text: 'Auto-detected by Security System' })
            .setTimestamp();

          await logChannel.send({ 
            embeds: [embed],
            content: member.guild.roles.cache.find(r => r.name.toLowerCase().includes('mod'))?.toString() || '@here'
          });
        }
      }
    }

    // Check for suspicious accounts (created < 7 days ago)
    const accountAge = now - member.user.createdTimestamp;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    if (accountAge < sevenDays && guildData.moderation.autoMod.enabled) {
      if (guildData.moderation.logChannelId) {
        const logChannel = member.guild.channels.cache.get(guildData.moderation.logChannelId);
        if (logChannel) {
          const daysOld = Math.floor(accountAge / (24 * 60 * 60 * 1000));
          
          await logChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xFEE75C)
                .setTitle('⚠️ New Account Alert')
                .setDescription(`${member.user.tag} just joined with a new account`)
                .addFields(
                  { name: 'User', value: `${member}`, inline: true },
                  { name: 'Account Age', value: `${daysOld} day(s)`, inline: true },
                  { name: 'Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()
            ]
          });
        }
      }
    }

  } catch (error) {
    logger.error('Error in anti-raid handler:', error);
  }
}

/**
 * Bad Words Filter
 */
export async function handleBadWords(message) {
  if (message.author.bot || !message.guild) return;

  try {
    const guildData = await Guild.getOrCreate(message.guildId, message.guild.name);

    if (!guildData.moderation.enabled || !guildData.moderation.autoMod.enabled) return;
    if (guildData.moderation.autoMod.badWords.length === 0) return;

    // Don't check moderators
    if (message.member.permissions.has('ManageMessages')) return;

    const content = message.content.toLowerCase();
    const hasBadWord = guildData.moderation.autoMod.badWords.some(word => 
      content.includes(word.toLowerCase())
    );

    if (hasBadWord) {
      try {
        await message.delete();
        
        const warningEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`${message.author}, please watch your language!`)
          .setTimestamp();

        await message.channel.send({ embeds: [warningEmbed] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });

        // Log to mod channel
        if (guildData.moderation.logChannelId) {
          const logChannel = message.guild.channels.cache.get(guildData.moderation.logChannelId);
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xED4245)
                  .setTitle('🤐 Bad Word Filtered')
                  .addFields(
                    { name: 'User', value: `${message.author.tag}`, inline: true },
                    { name: 'Channel', value: `${message.channel}`, inline: true },
                    { name: 'Message', value: `||${message.content.substring(0, 100)}||`, inline: false }
                  )
                  .setTimestamp()
              ]
            });
          }
        }
      } catch (error) {
        logger.error('Error filtering bad word:', error);
      }
    }
  } catch (error) {
    logger.error('Error in bad words filter:', error);
  }
}

/**
 * Anti-Link Filter
 */
export async function handleAntiLinks(message) {
  if (message.author.bot || !message.guild) return;

  try {
    const guildData = await Guild.getOrCreate(message.guildId, message.guild.name);

    if (!guildData.moderation.enabled || !guildData.moderation.autoMod.enabled || !guildData.moderation.autoMod.antiLinks) {
      return;
    }

    // Don't check moderators
    if (message.member.permissions.has('ManageMessages')) return;

    // Check for links
    const linkRegex = /(https?:\/\/[^\s]+)/gi;
    if (linkRegex.test(message.content)) {
      try {
        await message.delete();
        
        const warningEmbed = new EmbedBuilder()
          .setColor(0xFEE75C)
          .setDescription(`${message.author}, links are not allowed in this server!`)
          .setTimestamp();

        await message.channel.send({ embeds: [warningEmbed] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });
      } catch (error) {
        logger.error('Error filtering link:', error);
      }
    }
  } catch (error) {
    logger.error('Error in anti-links handler:', error);
  }
}

/**
 * Anti-Invite Filter
 */
export async function handleAntiInvites(message) {
  if (message.author.bot || !message.guild) return;

  try {
    const guildData = await Guild.getOrCreate(message.guildId, message.guild.name);

    if (!guildData.moderation.enabled || !guildData.moderation.autoMod.enabled || !guildData.moderation.autoMod.antiInvites) {
      return;
    }

    // Don't check moderators
    if (message.member.permissions.has('ManageMessages')) return;

    // Check for Discord invites
    const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[a-zA-Z0-9]+/gi;
    if (inviteRegex.test(message.content)) {
      try {
        await message.delete();
        
        const warningEmbed = new EmbedBuilder()
          .setColor(0xED4245)
          .setDescription(`${message.author}, Discord invites are not allowed!`)
          .setTimestamp();

        await message.channel.send({ embeds: [warningEmbed] }).then(msg => {
          setTimeout(() => msg.delete().catch(() => {}), 3000);
        });

        // Log to mod channel
        if (guildData.moderation.logChannelId) {
          const logChannel = message.guild.channels.cache.get(guildData.moderation.logChannelId);
          if (logChannel) {
            await logChannel.send({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xED4245)
                  .setTitle('🔗 Invite Link Blocked')
                  .addFields(
                    { name: 'User', value: `${message.author.tag}`, inline: true },
                    { name: 'Channel', value: `${message.channel}`, inline: true }
                  )
                  .setTimestamp()
              ]
            });
          }
        }
      } catch (error) {
        logger.error('Error filtering invite:', error);
      }
    }
  } catch (error) {
    logger.error('Error in anti-invites handler:', error);
  }
}