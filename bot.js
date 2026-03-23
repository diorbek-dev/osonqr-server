const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["🆕 Aktivatsiya"],
        ["✏️ Tahrirlash"]
      ],
      resize_keyboard: true
    }
  });
});

// MESSAGE
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = userState[chatId];

  // ===== MENU =====
  if (text === "🆕 Aktivatsiya") {
    userState[chatId] = { step: "code" };
    return bot.sendMessage(chatId, "🔑 Kod kiriting:");
  }

  if (text === "✏️ Tahrirlash") {
    userState[chatId] = { step: "edit_code" };
    return bot.sendMessage(chatId, "✏️ Kod kiriting:");
  }

  // ===== AKTIVATSIYA =====

  if (state?.step === "code") {
    const code = text.toUpperCase();

    const exist = await User.findOne({ code });
    if (exist) return bot.sendMessage(chatId, "❌ Band kod");

    userState[chatId] = { step: "name", code };
    return bot.sendMessage(chatId, "👤 Ismingiz:");
  }

  if (state?.step === "name") {
    state.name = text;
    state.step = "phone";
    return bot.sendMessage(chatId, "📞 Telefon:");
  }

  if (state?.step === "phone") {
    state.phone = text;
    state.step = "telegram";
    return bot.sendMessage(chatId, "💬 Telegram username:");
  }

  if (state?.step === "telegram") {
    state.telegram = text;
    state.step = "instagram";
    return bot.sendMessage(chatId, "📸 Instagram:");
  }

  if (state?.step === "instagram") {
    await User.create({
      code: state.code,
      name: state.name,
      phone: state.phone,
      telegram: state.telegram,
      instagram: text,
      owner: chatId
    });

    delete userState[chatId];

    return bot.sendMessage(chatId,
      `✅ Tayyor!\n\n🔗 ${DOMAIN}/${state.code}`
    );
  }

  // ===== EDIT =====

  if (state?.step === "edit_code") {
    const user = await User.findOne({ code: text.toUpperCase() });

    if (!user) return bot.sendMessage(chatId, "❌ Topilmadi");
    if (user.owner !== chatId) return bot.sendMessage(chatId, "❌ Bu sizniki emas");

    userState[chatId] = { step: "edit_name", code: user.code };
    return bot.sendMessage(chatId, "👤 Yangi ism:");
  }

  if (state?.step === "edit_name") {
    state.name = text;
    state.step = "edit_phone";
    return bot.sendMessage(chatId, "📞 Yangi telefon:");
  }

  if (state?.step === "edit_phone") {
    state.phone = text;
    state.step = "edit_instagram";
    return bot.sendMessage(chatId, "📸 Yangi instagram:");
  }

  if (state?.step === "edit_instagram") {
    await User.findOneAndUpdate(
      { code: state.code },
      {
        name: state.name,
        phone: state.phone,
        instagram: text
      }
    );

    delete userState[chatId];

    return bot.sendMessage(chatId, "✅ Yangilandi!");
  }
});

module.exports = bot;
