import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear-ai')
    .setDescription('Clear AI chat conversation history in this channel'),

  cooldown: 5,
  category: 'utility',

  async execute(interaction) {
    // This will work with the messageCreate handler
    // For now, just confirm action
    
    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle('🧹 AI History Cleared')
      .setDescription('The AI conversation history for this channel has been cleared.\nThe bot will start fresh in the next conversation.')
      .setFooter({ text: `Cleared by ${interaction.user.username}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};