const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};

const ADMIN_ID = 1773342331;

// ===== START WITH CODE =====
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1];

  const user = await User.findOne({ code });

  if (!user) {
    return bot.sendMessage(chatId, "❌ Kod topilmadi");
  }

  if (user.activated) {
    return bot.sendMessage(chatId, "❌ Bu kod allaqachon ishlatilgan");
  }

  userState[chatId] = { step: "name", code };

  return bot.sendMessage(chatId, "👤 Ismingizni kiriting:", {
    reply_markup: {
      keyboard: [["⏭ Ismsiz davom etish"]],
      resize_keyboard: true
    }
  });
});

// ===== ODDIY START =====
bot.onText(/^\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["✏️ Tahrirlash"],
        ["📞 Qo‘llab-quvvatlash"]
      ],
      resize_keyboard: true
    }
  });
});

// ===== MESSAGE =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  const state = userState[chatId];

  // ===== SUPPORT =====
  if (text === "📞 Qo‘llab-quvvatlash") {
    return bot.sendMessage(
      chatId,
      "📞 Aloqa:\n\n📱 +998884715959\n💬 @Shixnazarov"
    );
  }

  // ===== AKTIVATSIYA =====

  if (state?.step === "name") {
    state.name = text === "⏭ Ismsiz davom etish" ? "" : text;
    state.step = "phone";

    return bot.sendMessage(chatId, "📞 Telefon kiriting:", {
      reply_markup: {
        keyboard: [[{ text: "📱 Kontakt yuborish", request_contact: true }]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "phone") {
    let phone = text;

    if (msg.contact) {
      phone = msg.contact.phone_number;
    }

    if (!phone || !phone.match(/^[0-9+]{7,15}$/)) {
      return bot.sendMessage(chatId, "❌ Telefon noto‘g‘ri");
    }

    state.phone = phone;
    state.step = "telegram";

    return bot.sendMessage(chatId, "💬 Telegram username:", {
      reply_markup: {
        keyboard: [["⏭ O‘tkazib yuborish"]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "telegram") {
    if (text !== "⏭ O‘tkazib yuborish") {
      if (!text.startsWith("@")) {
        return bot.sendMessage(chatId, "❌ @ bilan boshlansin");
      }
      state.telegram = text.replace("@", "");
    } else {
      state.telegram = "";
    }

    state.step = "instagram";

    return bot.sendMessage(chatId, "📸 Instagram username:", {
      reply_markup: {
        keyboard: [["⏭ O‘tkazib yuborish"]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "instagram") {
    const instagram = text === "⏭ O‘tkazib yuborish" ? "" : text;

    await User.findOneAndUpdate(
      { code: state.code },
      {
        name: state.name,
        phone: state.phone,
        telegram: state.telegram,
        instagram: instagram,
        owner: chatId,
        activated: true
      }
    );

    delete userState[chatId];

    // 👉 ADMIN GA LINK
    bot.sendMessage(
      ADMIN_ID,
      `🔔 Yangi aktivatsiya!

📌 Kod: ${state.code}
👤 Ism: ${state.name}
📞 Telefon: ${state.phone}

🔗 ${DOMAIN}/${state.code}`
    );

    // 👉 USER GA FAOL
    return bot.sendMessage(
      chatId,
      `✅ ${state.code} faollashtirildi`,
      {
        reply_markup: {
          keyboard: [
            ["✏️ Tahrirlash"],
            ["📞 Qo'llab-quvvatlash"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  // ===== EDIT =====

  if (text === "✏️ Tahrirlash") {
    userState[chatId] = { step: "edit_code" };
    return bot.sendMessage(chatId, "✏️ Kod kiriting:");
  }

  if (state?.step === "edit_code") {
    const user = await User.findOne({ code: text.toUpperCase() });

    if (!user) return bot.sendMessage(chatId, "❌ Topilmadi");
    if (user.owner !== chatId)
      return bot.sendMessage(chatId, "❌ Bu sizniki emas");

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
