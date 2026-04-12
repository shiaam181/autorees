import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import sql from '../app/api/utils/sql.js';
import { runPipeline } from '../app/api/utils/automation-worker.js';

let client = null;

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function getUserSettings(discordId) {
  // Finds or creates a standalone bot user profile based on discord_id
  const [existing] = await sql`SELECT * FROM user_settings WHERE discord_id = ${discordId} LIMIT 1`;
  if (existing) return existing;
  
  const [created] = await sql`
    INSERT INTO user_settings (discord_id) VALUES (${discordId}) RETURNING *
  `;
  return created;
}

export async function startDiscordBot() {
  if (!process.env.DISCORD_BOT_TOKEN) return;
  if (client) return;

  client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages] });

  client.on('ready', () => console.log(`[DiscordBot] Logged in as ${client.user.tag}!`));

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Base Commands
    if (['!cmds', '!help'].includes(command)) {
      message.reply(`
🤖 **Available Commands**
\`!info\` - Check your account status and limits
\`!ping\` - Check bot latency
\`!connect\` - Link Discord to web account
\`!folder\` - Connect a Google Drive folder
\`!scan\` - Force process the pipeline
\`!settings <daily> <hours>\` - Update daily limit
\`!redeem <code>\` - Activate premium key
\`!cmds\` - Show this message

_(Admins Only)_
\`!genpremium <days>\` - Generate a premium key
\`!addadmin <discord_id>\` - Promote a user
      `.trim());
    }

    if (command === '!ping') {
      const sent = await message.reply('Pinging...');
      sent.edit(`Pong! Latency is ${sent.createdTimestamp - message.createdTimestamp}ms.`);
    }

    if (['!info', '!status'].includes(command)) {
      const user = await getUserSettings(message.author.id);
      const isPremiumActive = user.is_premium && (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date());
      
      const embed = new EmbedBuilder()
        .setTitle('Your Account Info')
        .addFields(
          { name: 'Discord ID', value: message.author.id, inline: true },
          { name: 'Linked User ID', value: user.user_id ? user.user_id.substring(0, 8) + '...' : 'Not Linked', inline: true },
          { name: 'Premium Status', value: isPremiumActive ? `🟢 Active\nExpires: ${user.premium_expires_at ? new Date(user.premium_expires_at).toLocaleDateString() : 'Never'}` : '🔴 Inactive (Daily limits apply)' },
          { name: 'Daily Upload Limit', value: user.daily_upload_limit.toString() },
        )
        .setColor(isPremiumActive ? 0x00FF00 : 0x808080);
      message.reply({ embeds: [embed] });
    }

    if (command === '!connect') {
      message.reply(`🔗 Configure your web account and link APIs here: ${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts`);
    }

    if (command === '!folder') {
      message.reply(`📁 Add your Google Drive folders directly from the dashboard: ${process.env.NEXT_PUBLIC_CREATE_APP_URL}/drive`);
    }

    if (command === '!scan') {
      message.reply('🔍 Forcing pipeline scan. Check the web dashboard for task statuses.');
      runPipeline().catch(() => {});
    }

    if (command === '!settings') {
      if (args.length !== 2) {
        return message.reply('Usage: `!settings <daily_limit> <interval_hours>` (e.g. `!settings 10 2`)');
      }
      const [limit, hours] = args.map(Number);
      if (isNaN(limit) || isNaN(hours)) return message.reply('Invalid numbers provided.');
      
      await sql`UPDATE user_settings SET daily_upload_limit = ${limit}, upload_interval_hours = ${hours} WHERE discord_id = ${message.author.id}`;
      message.reply(`✅ Settings updated! Daily limit: ${limit}, Interval: ${hours} hours.`);
    }

    // Premium Redeem
    if (command === '!redeem') {
      const code = args[0]?.toUpperCase();
      if (!code) return message.reply('Usage: `!redeem <CODE>`');

      const user = await getUserSettings(message.author.id);
      const [redeemCheck] = await sql`SELECT * FROM redeem_codes WHERE code = ${code} AND is_used = false`;
      if (!redeemCheck) return message.reply('❌ Invalid or already used code.');

      const durationDays = redeemCheck.duration_days;
      let newDate = new Date();
      if (user.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date()) {
        newDate = new Date(user.premium_expires_at);
      }
      newDate.setDate(newDate.getDate() + durationDays);

      await sql`
        UPDATE user_settings SET is_premium = true, premium_expires_at = ${newDate.toISOString()} WHERE user_id = ${user.user_id || user.id}
      `;
      await sql`
        UPDATE redeem_codes SET is_used = true, redeemed_by = ${user.user_id || user.id}, redeemed_at = CURRENT_TIMESTAMP WHERE code = ${code}
      `;
      
      message.reply(`🎉 **Redeemed!** You have been granted ${durationDays} days of Premium! It expires on ${newDate.toLocaleDateString()}.`);
    }

    // Admin Commands
    if (['!genpremium', '!addadmin'].includes(command)) {
      const user = await getUserSettings(message.author.id);
      if (!user.is_bot_admin) return message.reply('⛔ Insufficient permissions.');

      if (command === '!addadmin') {
        const targetId = args[0];
        if (!targetId) return message.reply('Usage: `!addadmin <discord_id>`');
        await sql`UPDATE user_settings SET is_bot_admin = true WHERE discord_id = ${targetId}`;
        message.reply(`✅ Granted admin privileges to Discord user ${targetId}.`);
      }

      if (command === '!genpremium') {
        const days = parseInt(args[0]) || 30;
        const code = generateCode();
        await sql`
          INSERT INTO redeem_codes (code, duration_days, created_by) VALUES (${code}, ${days}, ${user.user_id || user.id})
        `;
        message.reply(`🔑 **Generated Code:** \`${code}\` (${days} days)`);
      }
    }
  });

  client.login(process.env.DISCORD_BOT_TOKEN).catch(err => console.error('[DiscordBot] Login failed:', err.message));
}
