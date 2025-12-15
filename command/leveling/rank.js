import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import Member from '../../lib/database/schemas/Member.js';
import User from '../../lib/database/schemas/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or someone\'s rank card')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check rank for')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'leveling',

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser('user') || interaction.user;
    
    if (target.bot) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ Bots don\'t have levels!')
        ]
      });
    }

    try {
      // Get member data for this guild
      const memberData = await Member.getOrCreate(target.id, interaction.guildId);
      
      // Get global user data
      const userData = await User.getOrCreate(
        target.id,
        target.username,
        target.discriminator
      );

      // Calculate required XP
      const requiredXp = Math.floor(100 * Math.pow(memberData.leveling.level, 1.5));
      const progress = (memberData.leveling.xp / requiredXp) * 100;

      // Get guild rank
      const allMembers = await Member.find({ guildId: interaction.guildId })
        .sort({ 'leveling.totalXp': -1 })
        .select('userId leveling.totalXp');
      
      const rank = allMembers.findIndex(m => m.userId === target.id) + 1;

      // Create rank card
      const canvas = createCanvas(934, 282);
      const ctx = canvas.getContext('2d');

      // Background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Avatar circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(141, 141, 100, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      
      const avatar = await loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
      ctx.drawImage(avatar, 41, 41, 200, 200);
      ctx.restore();

      // Avatar border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(141, 141, 100, 0, Math.PI * 2);
      ctx.stroke();

      // Username
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px Arial';
      ctx.fillText(target.username, 270, 90);

      // Rank and Level
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`Rank #${rank}`, 270, 140);
      ctx.fillText(`Level ${memberData.leveling.level}`, 270, 180);

      // XP Text
      ctx.font = '22px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${memberData.leveling.xp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`, 270, 210);

      // Progress bar background
      const barX = 270;
      const barY = 220;
      const barWidth = 630;
      const barHeight = 40;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 20);
      ctx.fill();

      // Progress bar fill
      const fillWidth = (barWidth * progress) / 100;
      const progressGradient = ctx.createLinearGradient(barX, 0, barX + fillWidth, 0);
      progressGradient.addColorStop(0, '#57F287');
      progressGradient.addColorStop(1, '#5865F2');
      ctx.fillStyle = progressGradient;
      ctx.beginPath();
      ctx.roundRect(barX, barY, fillWidth, barHeight, 20);
      ctx.fill();

      // Progress percentage
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${progress.toFixed(1)}%`, barX + barWidth / 2, barY + 27);

      // Create attachment
      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
        name: 'rank-card.png'
      });

      // Create embed with stats
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${target.username}'s Stats`)
        .setImage('attachment://rank-card.png')
        .addFields(
          {
            name: '📊 Server Stats',
            value: `**Level:** ${memberData.leveling.level}\n` +
                   `**XP:** ${memberData.leveling.totalXp.toLocaleString()}\n` +
                   `**Messages:** ${memberData.leveling.messageCount}\n` +
                   `**Rank:** #${rank}/${allMembers.length}`,
            inline: true
          },
          {
            name: '🌐 Global Stats',
            value: `**Level:** ${userData.leveling.level}\n` +
                   `**XP:** ${userData.leveling.totalXp.toLocaleString()}\n` +
                   `**Commands:** ${userData.stats.commandsUsed}`,
            inline: true
          }
        )
        .setFooter({ text: `Keep chatting to level up! • ID: ${target.id}` })
        .setTimestamp();

      await interaction.editReply({ 
        embeds: [embed],
        files: [attachment]
      });

    } catch (error) {
      console.error('Error creating rank card:', error);
      
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ An error occurred while creating your rank card.')
        ]
      });
    }
  },
};