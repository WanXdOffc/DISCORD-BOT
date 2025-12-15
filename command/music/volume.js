import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Adjust the music volume')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Volume level (0-100)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100)
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

    const volume = interaction.options.getInteger('level');
    const oldVolume = queue.node.volume;

    // Set volume
    queue.node.setVolume(volume);

    // Determine volume emoji
    let volumeEmoji = '🔇';
    if (volume > 0 && volume <= 30) volumeEmoji = '🔈';
    else if (volume > 30 && volume <= 70) volumeEmoji = '🔉';
    else if (volume > 70) volumeEmoji = '🔊';

    // Create volume bar
    const barLength = 20;
    const filledBars = Math.round((volume / 100) * barLength);
    const emptyBars = barLength - filledBars;
    const volumeBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name: 'Volume Adjusted',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setDescription(`${volumeEmoji} Volume set to **${volume}%**\n\`${volumeBar}\``)
      .addFields({
        name: '📊 Change',
        value: `${oldVolume}% → ${volume}% (${volume > oldVolume ? '+' : ''}${volume - oldVolume}%)`,
        inline: true
      })
      .setFooter({ text: `Adjusted by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};