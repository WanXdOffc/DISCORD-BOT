import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause or resume the current song'),

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
    const isPaused = queue.node.isPaused();

    // Toggle pause
    queue.node.setPaused(!isPaused);

    const embed = new EmbedBuilder()
      .setColor(isPaused ? 0x57F287 : 0xFEE75C)
      .setAuthor({
        name: isPaused ? 'Music Resumed' : 'Music Paused',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(`${isPaused ? '▶️' : '⏸️'} **[${currentTrack.title}](${currentTrack.url})**`)
      .setThumbnail(currentTrack.thumbnail)
      .addFields(
        {
          name: '👤 Artist',
          value: currentTrack.author,
          inline: true
        },
        {
          name: '⏱️ Duration',
          value: currentTrack.duration,
          inline: true
        }
      )
      .setFooter({ text: `${isPaused ? 'Resumed' : 'Paused'} by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};