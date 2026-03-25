const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};
const userMessages = {}; // 🧹 xabarlarni o‘chirish uchun

const ADMIN_ID = 1773342331;

// 🧹 Xabarni saqlash
function saveMessage(chatId, messageId) {
  if (!userMessages[chatId]) userMessages[chatId] = [];
  userMessages[chatId].push(messageId);
}

// 🧹 Xabarlarni tozalash
async function clearMessages(chatId) {
  if (!userMessages[chatId]) return;

  for (const msgId of userMessages[chatId]) {
    try {
      await bot.deleteMessage(chatId, msgId);
    } catch (e) {}
  }

  userMessages[chatId] = [];
}

// ===== START WITH CODE =====
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1];

  await clearMessages(chatId);

  const user = await User.findOne({ code });

  if (!user) {
    const m = await bot.sendMessage(chatId, "❌ Kod topilmadi");
    return saveMessage(chatId, m.message_id);
  }

  if (user.activated) {
    const m = await bot.sendMessage(chatId, "❌ Bu kod ishlatilgan");
    return saveMessage(chatId, m.message_id);
  }

  userState[chatId] = { step: "name", code };

  const m = await bot.sendMessage(chatId, "👤 Ismingizni kiriting:", {
    reply_markup: {
      keyboard: [["⏭ Ismsiz davom etish"]],
      resize_keyboard: true
    }
  });

  saveMessage(chatId, m.message_id);
});

// ===== MENU =====
bot.onText(/^\/start$/, async (msg) => {
  const chatId = msg.chat.id;

  const m = await bot.sendMessage(chatId, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["➕ Yangi aktivatsiya"],
        ["✏️ Tahrirlash"],
        ["📞 Qo‘llab-quvvatlash"]
      ],
      resize_keyboard: true
    }
  });

  saveMessage(chatId, m.message_id);
});

// ===== MESSAGE =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text) return;

  const state = userState[chatId];

  // ➕ YANGI AKTIVATSIYA
  if (text === "➕ Yangi aktivatsiya") {
    userState[chatId] = { step: "new_code" };
    const m = await bot.sendMessage(chatId, "🔑 Kod kiriting:");
    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "new_code") {
    const user = await User.findOne({ code: text });

    if (!user) {
      const m = await bot.sendMessage(chatId, "❌ Kod topilmadi");
      return saveMessage(chatId, m.message_id);
    }

    if (user.activated) {
      const m = await bot.sendMessage(chatId, "❌ Bu kod ishlatilgan");
      return saveMessage(chatId, m.message_id);
    }

    userState[chatId] = { step: "name", code: text };

    const m = await bot.sendMessage(chatId, "👤 Ismingizni kiriting:");
    return saveMessage(chatId, m.message_id);
  }

  // SUPPORT
  if (text === "📞 Qo‘llab-quvvatlash") {
    const m = await bot.sendMessage(
      chatId,
      "📞 Aloqa:\n\n📱 +998884715959\n💬 @Shixnazarov"
    );
    return saveMessage(chatId, m.message_id);
  }

  // ===== AKTIVATSIYA =====

  if (state?.step === "name") {
    state.name = text === "⏭ Ismsiz davom etish" ? "" : text;
    state.step = "phone";

    const m = await bot.sendMessage(chatId, "📞 Telefon:", {
      reply_markup: {
        keyboard: [[{ text: "📱 Kontakt yuborish", request_contact: true }]],
        resize_keyboard: true
      }
    });

    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "phone") {
    let phone = text;

    if (msg.contact) phone = msg.contact.phone_number;

    if (!phone.match(/^[0-9+]{7,15}$/)) {
      const m = await bot.sendMessage(chatId, "❌ Telefon xato");
      return saveMessage(chatId, m.message_id);
    }

    state.phone = phone;
    state.step = "telegram";

    const m = await bot.sendMessage(chatId, "💬 Telegram:", {
      reply_markup: {
        keyboard: [["⏭ O‘tkazib yuborish"]],
        resize_keyboard: true
      }
    });

    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "telegram") {
    state.telegram =
      text === "⏭ O‘tkazib yuborish" ? "" : text.replace("@", "");

    state.step = "instagram";

    const m = await bot.sendMessage(chatId, "📸 Instagram:");
    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "instagram") {
    await User.findOneAndUpdate(
      { code: state.code },
      {
        name: state.name,
        phone: state.phone,
        telegram: state.telegram,
        instagram: text,
        owner: chatId,
        activated: true
      }
    );

    delete userState[chatId];

    // ADMIN GA
    bot.sendMessage(
      ADMIN_ID,
      `🔔 Yangi aktivatsiya!

📌 Kod: ${state.code}
👤 ${state.name}
📞 ${state.phone}

🔗 ${DOMAIN}/${state.code}`
    );

    await clearMessages(chatId);

    const m = await bot.sendMessage(
      chatId,
      `✅ ${state.code} faollashtirildi`,
      {
        reply_markup: {
          keyboard: [
            ["➕ Yangi aktivatsiya"],
            ["✏️ Tahrirlash"],
            ["📞 Qo‘llab-quvvatlash"]
          ],
          resize_keyboard: true
        }
      }
    );

    return saveMessage(chatId, m.message_id);
  }

  // ===== EDIT =====

  if (text === "✏️ Tahrirlash") {
    userState[chatId] = { step: "edit_code" };
    const m = await bot.sendMessage(chatId, "✏️ Kod:");
    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "edit_code") {
    const user = await User.findOne({ code: text.toUpperCase() });

    if (!user) return bot.sendMessage(chatId, "❌ Topilmadi");
    if (user.owner !== chatId)
      return bot.sendMessage(chatId, "❌ Sizniki emas");

    userState[chatId] = { step: "edit_name", code: user.code };

    const m = await bot.sendMessage(chatId, "👤 Yangi ism:");
    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "edit_name") {
    state.name = text;
    state.step = "edit_phone";
    const m = await bot.sendMessage(chatId, "📞 Telefon:");
    return saveMessage(chatId, m.message_id);
  }

  if (state?.step === "edit_phone") {
    state.phone = text;
    state.step = "edit_instagram";
    const m = await bot.sendMessage(chatId, "📸 Instagram:");
    return saveMessage(chatId, m.message_id);
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

    await clearMessages(chatId);

    const m = await bot.sendMessage(chatId, "✅ Yangilandi!");
    return saveMessage(chatId, m.message_id);
  }
});

module.exports = bot;
