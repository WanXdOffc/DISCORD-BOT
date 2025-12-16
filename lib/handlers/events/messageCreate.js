import { EmbedBuilder } from 'discord.js';
import OpenAI from 'openai';
import config from '../../../config.js';
import logger from '../../utils/logger.js';
import Member from '../../database/schemas/Member.js';
import Guild from '../../database/schemas/Guild.js';
import { handleAntiSpam, handleBadWords, handleAntiLinks, handleAntiInvites } from '../security.js';

// Initialize OpenAI client
let aiClient;
if (config.ai.provider === 'openai' && config.ai.openai.apiKey) {
  aiClient = new OpenAI({ apiKey: config.ai.openai.apiKey });
} else if (config.ai.provider === 'openrouter' && config.ai.openrouter.apiKey) {
  aiClient = new OpenAI({
    apiKey: config.ai.openrouter.apiKey,
    baseURL: config.ai.openrouter.baseUrl,
  });
}

// Store conversation history per channel (max 10 messages)
const conversationHistory = new Map();

export default {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignore bot messages
    if (message.author.bot) return;

    // Ignore DMs for now
    if (!message.guild) return;

    // Security checks first
    await handleAntiSpam(message);
    await handleBadWords(message);
    await handleAntiLinks(message);
    await handleAntiInvites(message);

    // Handle leveling system
    await handleLeveling(message);

    // Check if AI chat is enabled (will be from DB later)
    // For now, check if channel name contains 'ai-chat' or mentioned bot
    const isAIChannel = message.channel.name.includes('ai-chat') || 
                        message.channel.name.includes('ai') ||
                        message.mentions.has(client.user);

    if (!isAIChannel) return;

    // Check if AI client is configured
    if (!aiClient) {
      if (message.mentions.has(client.user)) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xED4245)
              .setDescription('❌ AI Chat is not configured. Please add API key to `.env` file.')
          ]
        });
      }
      return;
    }

    // Show typing indicator
    await message.channel.sendTyping();

    try {
      // Get or create conversation history for this channel
      if (!conversationHistory.has(message.channelId)) {
        conversationHistory.set(message.channelId, []);
      }

      const history = conversationHistory.get(message.channelId);

      // Clean message content (remove bot mention)
      let userMessage = message.content
        .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
        .trim();

      if (!userMessage && message.mentions.has(client.user)) {
        userMessage = 'Hello!';
      }

      // Build messages array for API
      const messages = [
        {
          role: 'system',
          content: `You are Hosei, a helpful and friendly Discord bot assistant. You are witty, knowledgeable, and enjoy helping users. Keep responses concise and engaging. Server: ${message.guild.name}. Current date: ${new Date().toLocaleDateString()}.`
        },
        ...history,
        {
          role: 'user',
          content: `${message.author.username}: ${userMessage}`
        }
      ];

      // Call AI API
      const completion = await aiClient.chat.completions.create({
        model: config.ai.provider === 'openai' ? config.ai.openai.model : config.ai.openrouter.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.9,
      });

      const aiResponse = completion.choices[0].message.content;

      // Update conversation history
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      );

      // Keep only last 10 messages (20 entries - user + assistant)
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      conversationHistory.set(message.channelId, history);

      // Split long messages if needed
      if (aiResponse.length > 2000) {
        const chunks = aiResponse.match(/[\s\S]{1,2000}/g);
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(aiResponse);
      }

      logger.info(`AI Chat: ${message.author.tag} in ${message.guild.name}/#${message.channel.name}`);

    } catch (error) {
      console.error('AI Chat error:', error);

      let errorMessage = 'An error occurred while processing your message.';
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check configuration.';
      } else if (error.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.status === 500) {
        errorMessage = 'AI service is temporarily unavailable.';
      }

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription(`❌ ${errorMessage}`)
        ]
      });
    }
  },
};

/**
 * Handle leveling system
 */
async function handleLeveling(message) {
  try {
    // Get guild settings
    const guildData = await Guild.getOrCreate(message.guildId, message.guild.name);
    
    // Check if leveling is enabled
    if (!guildData.features.leveling || !guildData.leveling.enabled) return;

    // Check if channel is ignored
    if (guildData.leveling.ignoredChannels.includes(message.channelId)) return;

    // Get or create member data
    const memberData = await Member.getOrCreate(message.author.id, message.guildId);

    // Check cooldown (1 message per minute for XP)
    const now = new Date();
    if (memberData.leveling.lastMessage) {
      const timeDiff = now - memberData.leveling.lastMessage;
      if (timeDiff < 60000) return; // 1 minute cooldown
    }

    // Calculate XP gain (15-25 XP per message, affected by multiplier)
    const baseXp = Math.floor(Math.random() * 11) + 15; // 15-25
    const xpGain = Math.floor(baseXp * guildData.leveling.xpRate);

    // Update member data
    memberData.leveling.lastMessage = now;
    memberData.leveling.messageCount += 1;
    
    const leveledUp = await memberData.addXp(xpGain);

    // If leveled up, send announcement
    if (leveledUp.length > 0 && guildData.leveling.channelId) {
      const newLevel = leveledUp[leveledUp.length - 1];
      const channel = message.guild.channels.cache.get(guildData.leveling.channelId);
      
      if (channel) {
        let levelUpMessage = guildData.leveling.message
          .replace('{user}', `<@${message.author.id}>`)
          .replace('{level}', newLevel)
          .replace('{server}', message.guild.name);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('📊 Level Up!')
          .setDescription(levelUpMessage)
          .setThumbnail(message.author.displayAvatarURL())
          .addFields({
            name: '🎉 New Level',
            value: `Level ${newLevel}`,
            inline: true
          })
          .setTimestamp();

        await channel.send({ embeds: [embed] });

        // Check for role rewards
        const roleReward = guildData.leveling.roleRewards.find(r => r.level === newLevel);
        if (roleReward) {
          const role = message.guild.roles.cache.get(roleReward.roleId);
          if (role) {
            const member = message.guild.members.cache.get(message.author.id);
            if (member && !member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              await channel.send({
                embeds: [
                  new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setDescription(`🎁 ${message.author} earned the ${role} role!`)
                ]
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in leveling system:', error);
  }
}