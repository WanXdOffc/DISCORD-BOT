import { EmbedBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import Guild from '../../database/schemas/Guild.js';
import { handleAntiRaid } from '../security.js';
import logger from '../../utils/logger.js';

export default {
  name: 'guildMemberAdd',
  async execute(member, client) {
    // Anti-raid check
    await handleAntiRaid(member);

    try {
      // Get guild settings
      const guildData = await Guild.getOrCreate(member.guild.id, member.guild.name);

      // Welcome system
      if (guildData.welcome.enabled && guildData.welcome.channelId) {
        const channel = member.guild.channels.cache.get(guildData.welcome.channelId);
        
        if (channel) {
          // Create welcome message
          let welcomeMessage = guildData.welcome.message
            .replace('{user}', `<@${member.id}>`)
            .replace('{server}', member.guild.name)
            .replace('{memberCount}', member.guild.memberCount);

          if (guildData.welcome.card) {
            // Generate welcome card
            try {
              const canvas = createCanvas(800, 300);
              const ctx = canvas.getContext('2d');

              // Background gradient
              const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
              gradient.addColorStop(0, '#667eea');
              gradient.addColorStop(1, '#764ba2');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Semi-transparent overlay
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Avatar circle
              ctx.save();
              ctx.beginPath();
              ctx.arc(150, 150, 80, 0, Math.PI * 2);
              ctx.closePath();
              ctx.clip();
              
              const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
              ctx.drawImage(avatar, 70, 70, 160, 160);
              ctx.restore();

              // Avatar border
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 6;
              ctx.beginPath();
              ctx.arc(150, 150, 80, 0, Math.PI * 2);
              ctx.stroke();

              // Welcome text
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 48px Arial';
              ctx.fillText('Welcome!', 270, 100);

              // Username
              ctx.font = 'bold 36px Arial';
              ctx.fillText(member.user.username, 270, 150);

              // Member count
              ctx.font = '24px Arial';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(`Member #${member.guild.memberCount}`, 270, 190);

              // Server name
              ctx.font = 'italic 20px Arial';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
              ctx.fillText(member.guild.name, 270, 220);

              const attachment = { attachment: canvas.toBuffer('image/png'), name: 'welcome.png' };

              await channel.send({
                content: welcomeMessage,
                files: [attachment]
              });
            } catch (error) {
              logger.error('Error creating welcome card:', error);
              // Fallback to text only
              await channel.send(welcomeMessage);
            }
          } else {
            // Text only welcome
            const embed = new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('👋 Welcome!')
              .setDescription(welcomeMessage)
              .setThumbnail(member.user.displayAvatarURL())
              .setFooter({ text: `Member #${member.guild.memberCount}` })
              .setTimestamp();

            await channel.send({ embeds: [embed] });
          }

          // Auto-role on join
          if (guildData.welcome.roleId) {
            const role = member.guild.roles.cache.get(guildData.welcome.roleId);
            if (role) {
              try {
                await member.roles.add(role);
                logger.info(`Added auto-role ${role.name} to ${member.user.tag} in ${member.guild.name}`);
              } catch (error) {
                logger.error('Error adding auto-role:', error);
              }
            }
          }
        }
      }

      // Verification system
      if (guildData.verification.enabled && guildData.verification.channelId) {
        const verifyChannel = member.guild.channels.cache.get(guildData.verification.channelId);
        
        if (verifyChannel) {
          // Send verification message
          // This will be implemented with buttons in a separate verification command
        }
      }

    } catch (error) {
      logger.error('Error in guildMemberAdd event:', error);
    }
  },
};