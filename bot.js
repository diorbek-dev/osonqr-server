const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};

// ===== MAIN MENU =====
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["🆕 Aktivatsiya"],
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

  const state = userState[chatId];

  // ===== SUPPORT =====
  if (text === "📞 Qo‘llab-quvvatlash") {
    return bot.sendMessage(
      chatId,
      "📞 Aloqa:\n\n📱 +998884715959\n💬 @Shixnazarov"
    );
  }

  // ===== MENU =====
  if (text === "🆕 Aktivatsiya") {
    userState[chatId] = { step: "code" };
    return bot.sendMessage(chatId, "🔑 Kod kiriting (masalan: A001)");
  }

  if (text === "✏️ Tahrirlash") {
    userState[chatId] = { step: "edit_code" };
    return bot.sendMessage(chatId, "✏️ Kod kiriting:");
  }

  // ===== AKTIVATSIYA =====

  if (state?.step === "code") {
    const code = text.toUpperCase();

    const user = await User.findOne({ code });

    if (!user) {
      return bot.sendMessage(chatId, "❌ Kod topilmadi");
    }

    if (user.activated) {
      return bot.sendMessage(chatId, "❌ Bu kod allaqachon ishlatilgan");
    }

    userState[chatId] = { step: "name", code };

    return bot.sendMessage(
      chatId,
      "👤 Ismingizni kiriting:",
      {
        reply_markup: {
          keyboard: [["⏭ Ismsiz davom etish"]],
          resize_keyboard: true
        }
      }
    );
  }

  if (state?.step === "name") {
    state.name = text === "⏭ Ismsiz davom etish" ? "" : text;
    state.step = "phone";

    return bot.sendMessage(
      chatId,
      "📞 Telefon raqam kiriting\n\nMasalan: 884715959",
      {
        reply_markup: {
          keyboard: [
            [{ text: "📱 Kontakt yuborish", request_contact: true }]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  if (state?.step === "phone") {
    let phone = text;

    if (msg.contact) {
      phone = msg.contact.phone_number;
    }

    if (!phone || !phone.match(/^[0-9+]{7,15}$/)) {
      return bot.sendMessage(chatId, "❌ Telefon noto‘g‘ri formatda");
    }

    state.phone = phone;
    state.step = "telegram";

    return bot.sendMessage(
      chatId,
      "💬 Telegram username kiriting\n\nMasalan: @username",
      {
        reply_markup: {
          keyboard: [["⏭ O‘tkazib yuborish"]],
          resize_keyboard: true
        }
      }
    );
  }

  if (state?.step === "telegram") {
    if (text !== "⏭ O‘tkazib yuborish") {
      if (!text.startsWith("@")) {
        return bot.sendMessage(chatId, "❌ Username @ bilan boshlanishi kerak");
      }
      state.telegram = text.replace("@", "");
    } else {
      state.telegram = "";
    }

    state.step = "instagram";

    return bot.sendMessage(
      chatId,
      "📸 Instagram username kiriting\n\nMasalan: dior__132",
      {
        reply_markup: {
          keyboard: [["⏭ O‘tkazib yuborish"]],
          resize_keyboard: true
        }
      }
    );
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

    return bot.sendMessage(
      chatId,
      `✅ Tayyor!\n\n🔗 ${DOMAIN}/${state.code}`,
      {
        reply_markup: {
          keyboard: [["🆕 Aktivatsiya"], ["✏️ Tahrirlash"]],
          resize_keyboard: true
        }
      }
    );
  }

  // ===== EDIT =====

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
