import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show information about the current song'),

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

    const track = queue.currentTrack;
    const timestamp = queue.node.getTimestamp();
    
    // Create progress bar
    const progress = Math.round((timestamp.current.value / timestamp.total.value) * 100);
    const barLength = 20;
    const filledBars = Math.round((progress / 100) * barLength);
    const emptyBars = barLength - filledBars;
    const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

    // Format timestamps
    const currentTime = timestamp.current.label;
    const totalTime = timestamp.total.label;

    // Get loop mode
    let loopMode = 'Off';
    if (queue.repeatMode === 1) loopMode = '🔂 Track';
    else if (queue.repeatMode === 2) loopMode = '🔁 Queue';
    else if (queue.repeatMode === 3) loopMode = '🔀 AutoPlay';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: 'Now Playing',
        iconURL: interaction.client.user.displayAvatarURL()
      })
      .setTitle(track.title)
      .setURL(track.url)
      .setThumbnail(track.thumbnail)
      .setDescription(
        `\`${currentTime}\` ${progressBar} \`${totalTime}\`\n` +
        `**${progress}%** completed`
      )
      .addFields(
        {
          name: '👤 Artist',
          value: track.author || 'Unknown',
          inline: true
        },
        {
          name: '⏱️ Duration',
          value: track.duration,
          inline: true
        },
        {
          name: '🎧 Requested By',
          value: `${track.requestedBy}`,
          inline: true
        },
        {
          name: '🔊 Volume',
          value: `${queue.node.volume}%`,
          inline: true
        },
        {
          name: '🔁 Loop Mode',
          value: loopMode,
          inline: true
        },
        {
          name: '📜 Queue',
          value: `${queue.tracks.size} song(s)`,
          inline: true
        },
        {
          name: '🎵 Source',
          value: track.source || 'Unknown',
          inline: true
        },
        {
          name: '⏸️ Status',
          value: queue.node.isPaused() ? 'Paused' : 'Playing',
          inline: true
        },
        {
          name: '👥 Listeners',
          value: `${queue.channel.members.size - 1}`,
          inline: true
        }
      )
      .setFooter({ 
        text: `Use /queue to see all songs`,
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};