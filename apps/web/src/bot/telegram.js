import TelegramBot from 'node-telegram-bot-api';
import sql from '../app/api/utils/sql.js';
import { runPipeline } from '../app/api/utils/automation-worker.js';

let bot = null;

function generateCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function getUserSettings(telegramId) {
  const strId = String(telegramId);
  const [existing] = await sql`SELECT * FROM user_settings WHERE telegram_id = ${strId} LIMIT 1`;
  if (existing) return existing;
  
  const [created] = await sql`
    INSERT INTO user_settings (telegram_id) VALUES (${strId}) RETURNING *
  `;
  return created;
}

export async function startTelegramBot() {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  if (bot) return;

  bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
  console.log('[TelegramBot] Started polling...');

  // Base Commands
  bot.onText(/\/(cmds|help)/, (msg) => {
    bot.sendMessage(msg.chat.id, `
🤖 *Available Commands*
\`/info\` - Check your account status and limits
\`/ping\` - Check bot latency
\`/connect\` - Link Telegram to web account
\`/folder\` - Connect a Google Drive folder
\`/scan\` - Force process the pipeline
\`/settings <daily> <hours>\` - Update daily limit
\`/redeem <code>\` - Activate premium key
\`/cmds\` - Show this message

_(Admins Only)_
\`/genpremium <days>\` - Generate a premium key
\`/addadmin <telegram_id>\` - Promote a user
    `.trim(), { parse_mode: 'Markdown' });
  });

  bot.onText(/\/ping/, async (msg) => {
    bot.sendMessage(msg.chat.id, '🏓 Pong! Bot is online and listening.');
  });

  bot.onText(/\/info|\/status/, async (msg) => {
    const user = await getUserSettings(msg.from.id);
    const isPremiumActive = user.is_premium && (!user.premium_expires_at || new Date(user.premium_expires_at) > new Date());
    
    const text = `
*Your Account Info*
👤 **Telegram ID**: \`${msg.from.id}\`
🔗 **Linked Web ID**: \`${user.user_id ? user.user_id.substring(0, 8) + '...' : 'Not Linked'}\`
💎 **Premium Status**: ${isPremiumActive ? `🟢 Active\nExpires: ${user.premium_expires_at ? new Date(user.premium_expires_at).toLocaleDateString() : 'Never'}` : '🔴 Inactive (Daily limits apply)'}
⚙ **Daily Upload Limit**: ${user.daily_upload_limit}
    `.trim();
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  });

  bot.onText(/\/connect/, (msg) => {
    bot.sendMessage(msg.chat.id, `🔗 Configure your web account and link APIs here: ${process.env.NEXT_PUBLIC_CREATE_APP_URL}/accounts`);
  });

  bot.onText(/\/folder/, (msg) => {
    bot.sendMessage(msg.chat.id, `📁 Add your Google Drive folders directly from the dashboard: ${process.env.NEXT_PUBLIC_CREATE_APP_URL}/drive`);
  });

  bot.onText(/\/scan/, (msg) => {
    bot.sendMessage(msg.chat.id, '🔍 Forcing pipeline scan. Check the web dashboard for task statuses.');
    runPipeline().catch(() => {});
  });

  bot.onText(/\/settings(?: (.+))?/, async (msg, match) => {
    const args = match[1] ? match[1].split(' ') : [];
    if (args.length !== 2) {
      return bot.sendMessage(msg.chat.id, 'Usage: `/settings <daily_limit> <interval_hours>` (e.g. `/settings 10 2`)', { parse_mode: 'Markdown' });
    }
    const [limit, hours] = args.map(Number);
    if (isNaN(limit) || isNaN(hours)) return bot.sendMessage(msg.chat.id, 'Invalid numbers provided.');
    
    await sql`UPDATE user_settings SET daily_upload_limit = ${limit}, upload_interval_hours = ${hours} WHERE telegram_id = ${String(msg.from.id)}`;
    bot.sendMessage(msg.chat.id, `✅ Settings updated! Daily limit: ${limit}, Interval: ${hours} hours.`);
  });

  // Premium Redeem
  bot.onText(/\/redeem(?: (.+))?/, async (msg, match) => {
    const code = match[1]?.toUpperCase();
    if (!code) return bot.sendMessage(msg.chat.id, 'Usage: `/redeem <CODE>`', { parse_mode: 'Markdown' });

    const user = await getUserSettings(msg.from.id);
    const [redeemCheck] = await sql`SELECT * FROM redeem_codes WHERE code = ${code} AND is_used = false`;
    if (!redeemCheck) return bot.sendMessage(msg.chat.id, '❌ Invalid or already used code.');

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
    
    bot.sendMessage(msg.chat.id, `🎉 *Redeemed!* You have been granted ${durationDays} days of Premium! It expires on ${newDate.toLocaleDateString()}.`, { parse_mode: 'Markdown' });
  });

  // Admin Commands
  bot.onText(/\/(genpremium|addadmin)(?: (.+))?/, async (msg, match) => {
    const command = match[1];
    const user = await getUserSettings(msg.from.id);
    if (!user.is_bot_admin) return bot.sendMessage(msg.chat.id, '⛔ Insufficient permissions.');

    if (command === 'addadmin') {
      const targetId = match[2];
      if (!targetId) return bot.sendMessage(msg.chat.id, 'Usage: `/addadmin <telegram_id>`', { parse_mode: 'Markdown' });
      await sql`UPDATE user_settings SET is_bot_admin = true WHERE telegram_id = ${targetId}`;
      bot.sendMessage(msg.chat.id, `✅ Granted admin privileges to Telegram user ${targetId}.`);
    }

    if (command === 'genpremium') {
      const days = parseInt(match[2]) || 30;
      const code = generateCode();
      await sql`
        INSERT INTO redeem_codes (code, duration_days, created_by) VALUES (${code}, ${days}, ${user.user_id || user.id})
      `;
      bot.sendMessage(msg.chat.id, `🔑 *Generated Code:* \`${code}\` (${days} days)`, { parse_mode: 'Markdown' });
    }
  });

  bot.on('polling_error', (error) => console.error('[TelegramBot] Event polling error:', error.message));
}
