import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { useMainPlayer } from 'discord-player';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from various sources')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name, URL (YouTube, Spotify, SoundCloud)')
        .setRequired(true)
    ),

  cooldown: 3,
  category: 'music',

  async execute(interaction, client) {
    await interaction.deferReply();

    // Check if user is in voice channel
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ You need to be in a voice channel to play music!')
        ]
      });
    }

    // Check bot permissions
    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions.has(['Connect', 'Speak'])) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('❌ I need permissions to join and speak in your voice channel!')
        ]
      });
    }

    const player = useMainPlayer();
    const query = interaction.options.getString('query');

    try {
      // Search for the song
      const searchResult = await player.search(query, {
        requestedBy: interaction.user,
        searchEngine: 'auto' // Auto-detect: YouTube, Spotify, SoundCloud, etc.
      });

      if (!searchResult || !searchResult.tracks.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription(`❌ No results found for: **${query}**`)
          ]
        });
      }

      // Play the track
      const { track } = await player.play(voiceChannel, searchResult, {
        nodeOptions: {
          metadata: {
            channel: interaction.channel,
            client: interaction.guild.members.me,
            requestedBy: interaction.user
          },
          volume: 50,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 60000, // 1 minute
          leaveOnEnd: true,
          leaveOnEndCooldown: 60000,
          bufferingTimeout: 3000,
          connectionTimeout: 30000
        }
      });

      // Create embed response
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'Now Playing',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTitle(track.title)
        .setURL(track.url)
        .setThumbnail(track.thumbnail)
        .addFields(
          {
            name: '👤 Artist',
            value: track.author || 'Unknown',
            inline: true
          },
          {
            name: '⏱️ Duration',
            value: track.duration || 'Unknown',
            inline: true
          },
          {
            name: '🎧 Requested By',
            value: `${interaction.user}`,
            inline: true
          }
        )
        .setFooter({ 
          text: `Source: ${track.source}`,
          iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();

      // Add queue info if there are more tracks
      const queue = player.nodes.get(interaction.guildId);
      if (queue && queue.tracks.size > 0) {
        embed.addFields({
          name: '📜 Queue',
          value: `${queue.tracks.size} song(s) in queue`,
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error playing music:', error);
      
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ An error occurred while playing the song:\n\`\`\`${error.message}\`\`\``)
        ]
      });
    }
  },
};