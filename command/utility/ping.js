import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  
  cooldown: 3,
  category: 'utility',

  async execute(interaction, client) {
    // Defer reply untuk perhitungan latency
    await interaction.deferReply();

    // Hitung latency
    const sent = await interaction.fetchReply();
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);

    // Determine status color based on latency
    let color;
    if (apiLatency < 100) {
      color = 0x57F287; // Green - Excellent
    } else if (apiLatency < 200) {
      color = 0xFEE75C; // Yellow - Good
    } else {
      color = 0xED4245; // Red - Poor
    }

    // Get bot uptime
    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const uptimeString = [
      days > 0 ? `${days}d` : '',
      hours > 0 ? `${hours}h` : '',
      minutes > 0 ? `${minutes}m` : '',
      `${seconds}s`
    ].filter(Boolean).join(' ');

    // Create embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🏓 Pong!')
      .setDescription('Bot latency and system information')
      .addFields(
        {
          name: '📡 Bot Latency',
          value: `\`${latency}ms\``,
          inline: true
        },
        {
          name: '💓 API Latency',
          value: `\`${apiLatency}ms\``,
          inline: true
        },
        {
          name: '⏱️ Uptime',
          value: `\`${uptimeString}\``,
          inline: true
        },
        {
          name: '🏠 Servers',
          value: `\`${client.guilds.cache.size}\``,
          inline: true
        },
        {
          name: '👥 Users',
          value: `\`${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0).toLocaleString()}\``,
          inline: true
        },
        {
          name: '💾 Memory',
          value: `\`${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\``,
          inline: true
        }
      )
      .setFooter({ 
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};