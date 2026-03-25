const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};
const userMessages = {};

const ADMIN_ID = 1773342331;

// ===== SAVE =====
function saveMessage(chatId, messageId) {
  if (!userMessages[chatId]) userMessages[chatId] = [];
  userMessages[chatId].push(messageId);
}

// ===== CLEAR =====
async function clearMessages(chatId) {
  if (!userMessages[chatId]) return;

  for (const msgId of userMessages[chatId]) {
    try {
      await bot.deleteMessage(chatId, msgId);
    } catch {}
  }

  userMessages[chatId] = [];
}

// ===== START QR =====
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1];

  await clearMessages(chatId);

  const user = await User.findOne({ code });

  if (!user) return bot.sendMessage(chatId, "❌ Kod topilmadi");
  if (user.activated) return bot.sendMessage(chatId, "❌ Band");

  userState[chatId] = { step: "name", code };

  bot.sendMessage(chatId, "👤 Ism:", {
    reply_markup: {
      keyboard: [["⏭ Ismsiz"]],
      resize_keyboard: true
    }
  });
});

// ===== MENU =====
bot.onText(/^\/start$/, async (msg) => {
  bot.sendMessage(msg.chat.id, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["📷 QR orqali aktivatsiya"],
        ["📦 Mening QRlarim"],
        ["📞 Qo‘llab-quvvatlash"]
      ],
      resize_keyboard: true
    }
  });
});

// ===== MAIN =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text && !msg.contact) return;

  const state = userState[chatId];

  // ===== MY QRS =====
  if (text === "📦 Mening QRlarim") {
    const list = await User.find({ owner: chatId });

    if (!list.length) {
      return bot.sendMessage(chatId, "❌ Sizda QR yo‘q");
    }

    let msgText = `📦 Sizda ${list.length} ta QR bor:\n\n`;

    list.forEach((q, i) => {
      msgText += `${i + 1}. ${q.code} ${q.activated ? "✅" : "❌"}\n`;
    });

    userState[chatId] = { step: "select_qr" };

    return bot.sendMessage(chatId, msgText + "\n✏️ Kodni kiriting:");
  }

  // ===== SELECT QR =====
  if (state?.step === "select_qr") {
    const user = await User.findOne({ code: text });

    if (!user) return bot.sendMessage(chatId, "❌ Topilmadi");

    userState[chatId] = { step: "qr_action", code: user.code };

    return bot.sendMessage(chatId, `⚙️ ${user.code}`, {
      reply_markup: {
        keyboard: [
          ["✏️ Tahrirlash", "❌ O‘chirish"],
          ["🔄 Tozalash"],
          ["⬅️ Orqaga"]
        ],
        resize_keyboard: true
      }
    });
  }

  // ===== QR ACTION =====
  if (state?.step === "qr_action") {
    if (text === "❌ O‘chirish") {
      await User.deleteOne({ code: state.code });
      delete userState[chatId];
      return bot.sendMessage(chatId, "🗑 O‘chirildi");
    }

    if (text === "🔄 Tozalash") {
      await User.updateOne(
        { code: state.code },
        {
          name: "",
          phone: "",
          telegram: "",
          instagram: "",
          activated: false
        }
      );
      delete userState[chatId];
      return bot.sendMessage(chatId, "♻️ Tozalandi");
    }

    if (text === "✏️ Tahrirlash") {
      userState[chatId] = { step: "edit_name", code: state.code };
      return bot.sendMessage(chatId, "👤 Yangi ism:");
    }

    if (text === "⬅️ Orqaga") {
      delete userState[chatId];
      return bot.sendMessage(chatId, "🔙 Menu");
    }
  }

  // ===== EDIT FLOW =====
  if (state?.step === "edit_name") {
    state.name = text;
    state.step = "edit_phone";
    return bot.sendMessage(chatId, "📞 Telefon:");
  }

  if (state?.step === "edit_phone") {
    state.phone = text;
    state.step = "edit_instagram";
    return bot.sendMessage(chatId, "📸 Instagram:");
  }

  if (state?.step === "edit_instagram") {
    await User.updateOne(
      { code: state.code },
      {
        name: state.name,
        phone: state.phone,
        instagram: text
      }
    );

    delete userState[chatId];
    return bot.sendMessage(chatId, "✅ Yangilandi");
  }

  // ===== SUPPORT =====
  if (text === "📞 Qo‘llab-quvvatlash") {
    return bot.sendMessage(
      chatId,
      "📞 +998884715959\n💬 @Shixnazarov"
    );
  }
});

module.exports = bot;
