import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop the music and clear the queue'),

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

    // Stop and clear queue
    queue.delete();

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setAuthor({
        name: 'Music Stopped',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription('⏹️ Music has been stopped and queue cleared')
      .addFields({
        name: '🎵 Last Playing',
        value: `[${currentTrack.title}](${currentTrack.url})`
      })
      .setThumbnail(currentTrack.thumbnail)
      .setFooter({ text: `Stopped by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};