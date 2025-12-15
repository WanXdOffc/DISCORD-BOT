import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

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

    // Check if user is in the same voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || voiceChannel.id !== queue.channel.id) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You need to be in the same voice channel as the bot!')
        ],
        ephemeral: true
      });
    }

    const currentTrack = queue.currentTrack;

    // Skip the track
    queue.node.skip();

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setAuthor({
        name: 'Song Skipped',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(`⏭️ Skipped **[${currentTrack.title}](${currentTrack.url})**`)
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({ text: `Skipped by ${interaction.user.username}` })
      .setTimestamp();

    // Add next track info if available
    const nextTrack = queue.tracks.at(0);
    if (nextTrack) {
      embed.addFields({
        name: '▶️ Now Playing',
        value: `[${nextTrack.title}](${nextTrack.url})\n👤 ${nextTrack.author} - \`${nextTrack.duration}\``
      });
    } else {
      embed.addFields({
        name: 'ℹ️ Queue Status',
        value: 'No more songs in queue'
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};