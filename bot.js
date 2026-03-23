const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);

// ===== WEBHOOK =====
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

// ===== MODEL (reuse) =====
const User = mongoose.model("User");

const userState = {};

// START
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "📲 OSON QR BOT\n\n🆕 Aktivatsiya ni bosing",
    {
      reply_markup: {
        keyboard: [["🆕 Aktivatsiya"]],
        resize_keyboard: true
      }
    }
  );
});

// MESSAGE
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = userState[chatId];

  if (text === "🆕 Aktivatsiya") {
    userState[chatId] = { step: "code" };
    return bot.sendMessage(chatId, "Kod kiriting:");
  }

  if (state?.step === "code") {
    const code = text.toUpperCase();

    const exist = await User.findOne({ code });
    if (exist) return bot.sendMessage(chatId, "Band kod");

    userState[chatId] = { step: "name", code };
    return bot.sendMessage(chatId, "Ismingiz:");
  }

  if (state?.step === "name") {
    state.name = text;
    state.step = "phone";
    return bot.sendMessage(chatId, "Telefon:");
  }

  if (state?.step === "phone") {
    state.phone = text;
    state.step = "done";
    return bot.sendMessage(chatId, "Saqlayapman...");
  }

  if (state?.step === "done") {
    await User.create({
      code: state.code,
      name: state.name,
      phone: state.phone,
      owner: chatId
    });

    delete userState[chatId];

    return bot.sendMessage(chatId,
      `✅ Tayyor!\n\n${DOMAIN}/${state.code}`
    );
  }
});

module.exports = bot;
