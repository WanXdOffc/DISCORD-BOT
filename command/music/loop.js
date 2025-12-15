import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer, QueueRepeatMode } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Loop mode to set')
        .setRequired(true)
        .addChoices(
          { name: '🔁 Loop Queue', value: 'queue' },
          { name: '🔂 Loop Track', value: 'track' },
          { name: '▶️ Off', value: 'off' },
          { name: '🔀 AutoPlay', value: 'autoplay' }
        )
    ),

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

    const mode = interaction.options.getString('mode');
    let repeatMode;
    let modeText;
    let modeEmoji;
    let description;

    switch (mode) {
      case 'queue':
        repeatMode = QueueRepeatMode.QUEUE;
        modeText = 'Loop Queue';
        modeEmoji = '🔁';
        description = 'The entire queue will repeat';
        break;
      case 'track':
        repeatMode = QueueRepeatMode.TRACK;
        modeText = 'Loop Track';
        modeEmoji = '🔂';
        description = 'Current track will repeat';
        break;
      case 'autoplay':
        repeatMode = QueueRepeatMode.AUTOPLAY;
        modeText = 'AutoPlay';
        modeEmoji = '🔀';
        description = 'Similar songs will be added automatically';
        break;
      default:
        repeatMode = QueueRepeatMode.OFF;
        modeText = 'Off';
        modeEmoji = '▶️';
        description = 'Loop mode disabled';
    }

    // Set loop mode
    queue.setRepeatMode(repeatMode);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: 'Loop Mode Changed',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(`${modeEmoji} **${modeText}** is now active\n${description}`)
      .addFields(
        {
          name: '🎵 Current Track',
          value: `[${queue.currentTrack.title}](${queue.currentTrack.url})`,
          inline: false
        },
        {
          name: '📜 Queue Size',
          value: `${queue.tracks.size} song(s)`,
          inline: true
        }
      )
      .setThumbnail(queue.currentTrack.thumbnail)
      .setFooter({ text: `Set by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};