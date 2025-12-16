import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from the channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    ),

  cooldown: 5,
  category: 'moderation',

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch messages
      let messages = await interaction.channel.messages.fetch({ limit: amount + 1 });

      // Filter out messages older than 14 days (Discord API limitation)
      messages = messages.filter(msg => {
        const messageAge = Date.now() - msg.createdTimestamp;
        return messageAge < 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
      });

      // If targeting specific user
      if (targetUser) {
        messages = messages.filter(msg => msg.author.id === targetUser.id);
      }

      // Remove the interaction message
      messages = messages.filter(msg => msg.id !== interaction.id);

      if (messages.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFEE75C)
              .setDescription('⚠️ No messages found to delete. Messages older than 14 days cannot be deleted.')
          ]
        });
      }

      // Bulk delete
      const deletedMessages = await interaction.channel.bulkDelete(messages, true);

      // Create response
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🗑️ Messages Cleared')
        .setDescription(`Successfully deleted **${deletedMessages.size}** message(s)`)
        .addFields(
          {
            name: '📝 Details',
            value: targetUser 
              ? `Deleted messages from ${targetUser}` 
              : 'Deleted recent messages',
            inline: false
          },
          {
            name: '👮 Moderator',
            value: `${interaction.user}`,
            inline: true
          },
          {
            name: '📍 Channel',
            value: `${interaction.channel}`,
            inline: true
          }
        )
        .setFooter({ text: 'Messages older than 14 days cannot be deleted' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      // Delete the success message after 5 seconds
      setTimeout(async () => {
        try {
          await interaction.deleteReply();
        } catch (error) {
          // Message already deleted or error
        }
      }, 5000);

    } catch (error) {
      console.error('Error clearing messages:', error);
      
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ An error occurred while deleting messages:\n\`${error.message}\``)
        ]
      });
    }
  },
};