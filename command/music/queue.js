import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),

  cooldown: 3,
  category: 'music',

  async execute(interaction) {
    const player = useMainPlayer();
    const queue = player.nodes.get(interaction.guildId);

    if (!queue || !queue.isPlaying()) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ There is no music playing right now!')
        ],
        ephemeral: true
      });
    }

    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();
    const totalDuration = tracks.reduce((acc, track) => acc + (track.durationMS || 0), 0);

    // Format queue display
    let queueString = '';
    
    if (tracks.length === 0) {
      queueString = '*No songs in queue*';
    } else {
      queueString = tracks.slice(0, 10).map((track, i) => {
        return `**${i + 1}.** [${track.title}](${track.url}) - \`${track.duration}\`\n   👤 ${track.author} | Requested by ${track.requestedBy}`;
      }).join('\n\n');

      if (tracks.length > 10) {
        queueString += `\n\n*...and ${tracks.length - 10} more song(s)*`;
      }
    }

    // Format total duration
    const hours = Math.floor(totalDuration / 3600000);
    const minutes = Math.floor((totalDuration % 3600000) / 60000);
    const durationString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🎵 Music Queue - ${interaction.guild.name}`)
      .setDescription(`**Now Playing:**\n[${currentTrack.title}](${currentTrack.url})\n👤 ${currentTrack.author} - \`${currentTrack.duration}\`\n\n**Up Next:**\n${queueString}`)
      .addFields(
        {
          name: '📊 Queue Stats',
          value: `**Songs:** ${tracks.length}\n**Duration:** ${durationString}\n**Loop:** ${queue.repeatMode === 0 ? 'Off' : queue.repeatMode === 1 ? 'Track' : 'Queue'}`,
          inline: true
        },
        {
          name: '🎚️ Settings',
          value: `**Volume:** ${queue.node.volume}%\n**Paused:** ${queue.node.isPaused() ? 'Yes' : 'No'}\n**AutoPlay:** ${queue.repeatMode === 3 ? 'On' : 'Off'}`,
          inline: true
        }
      )
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({ 
        text: `Page 1/${Math.ceil(tracks.length / 10) || 1}`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};