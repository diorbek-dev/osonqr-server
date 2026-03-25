const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

const TOKEN = process.env.BOT_TOKEN;
const DOMAIN = process.env.DOMAIN;

const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${DOMAIN}/bot${TOKEN}`);

const User = mongoose.model("User");

const userState = {};
const ADMIN_ID = 1773342331;

// ===== MENU =====
function mainMenu(chatId) {
  return bot.sendMessage(chatId, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["📷 QR orqali aktivatsiya"],
        ["📦 Mening QRlarim"],
        ["📞 Qo‘llab-quvvatlash"]
      ],
      resize_keyboard: true
    }
  });
}

// ===== START QR =====
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1];

  const user = await User.findOne({ code });

  if (!user) return bot.sendMessage(chatId, "❌ Kod topilmadi");
  if (user.activated) return bot.sendMessage(chatId, "❌ Bu kod band");

  userState[chatId] = { step: "name", code };

  return bot.sendMessage(chatId, "👤 Ismingizni kiriting:", {
    reply_markup: {
      keyboard: [["⏭ Ismsiz davom etish"]],
      resize_keyboard: true
    }
  });
});

// ===== START =====
bot.onText(/^\/start$/, async (msg) => {
  return mainMenu(msg.chat.id);
});

// ===== MAIN =====
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text && !msg.contact) return;

  // ===== GLOBAL BUTTONS =====

  if (text === "⬅️ Orqaga") {
    delete userState[chatId];
    return mainMenu(chatId);
  }

  if (text === "📷 QR orqali aktivatsiya") {
    return bot.sendMessage(
      chatId,
      "📷 QR kodni skaner qiling va link orqali kiring"
    );
  }

  if (text === "📞 Qo‘llab-quvvatlash") {
    return bot.sendMessage(
      chatId,
      "📞 +998884715959\n💬 @Shixnazarov"
    );
  }

  if (text === "📦 Mening QRlarim") {
    const list = await User.find({ owner: chatId });

    if (!list.length) {
      return bot.sendMessage(chatId, "❌ QR yo‘q");
    }

    let msgText = `📦 Sizda ${list.length} ta QR bor:\n\n`;

    list.forEach((q, i) => {
      msgText += `${i + 1}. ${q.code} ${q.activated ? "✅" : "❌"}\n`;
    });

    userState[chatId] = { step: "select_qr" };

    return bot.sendMessage(chatId, msgText + "\n\n📌 Kod kiriting:");
  }

  // ===== STATE =====
  const state = userState[chatId];

  // ===== AKTIVATSIYA =====
  if (state?.step === "name") {
    if (
      text === "⏭ Ismsiz davom etish" ||
      text === "Ismsiz" ||
      text === "⏭ Ismsiz"
    ) {
      state.name = "";
    } else {
      state.name = text;
    }

    state.step = "phone";

    return bot.sendMessage(chatId, "📞 Telefon:", {
      reply_markup: {
        keyboard: [[{ text: "📱 Kontakt yuborish", request_contact: true }]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "phone") {
    let phone = msg.contact ? msg.contact.phone_number : text;

    if (!phone.match(/^[0-9+]{7,15}$/)) {
      return bot.sendMessage(chatId, "❌ Telefon noto‘g‘ri");
    }

    state.phone = phone;
    state.step = "telegram";

    return bot.sendMessage(chatId, "💬 Telegram (@username):", {
      reply_markup: {
        keyboard: [["⏭ O‘tkazib yuborish"]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "telegram") {
    state.telegram =
      text === "⏭ O‘tkazib yuborish" ? "" : text.replace("@", "");

    state.step = "instagram";

    return bot.sendMessage(chatId, "📸 Instagram:", {
      reply_markup: {
        keyboard: [["⏭ O‘tkazib yuborish"]],
        resize_keyboard: true
      }
    });
  }

  if (state?.step === "instagram") {
    const instagram =
      text === "⏭ O‘tkazib yuborish" ? "" : text;

    await User.updateOne(
      { code: state.code },
      {
        name: state.name,
        phone: state.phone,
        telegram: state.telegram,
        instagram,
        owner: chatId,
        activated: true
      }
    );

    delete userState[chatId];

    // ADMIN GA
    bot.sendMessage(
      ADMIN_ID,
      `🔔 Yangi aktivatsiya!

📌 ${state.code}
👤 ${state.name}
📞 ${state.phone}

🔗 ${DOMAIN}/${state.code}`
    );

    return bot.sendMessage(
      chatId,
      `✅ ${state.code} faollashtirildi`,
      {
        reply_markup: {
          keyboard: [
            ["📷 QR orqali aktivatsiya"],
            ["📦 Mening QRlarim"],
            ["📞 Qo‘llab-quvvatlash"]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  // ===== QR SELECT =====
  if (state?.step === "select_qr") {
    if (!text.match(/^A[0-9]+$/)) {
      return bot.sendMessage(chatId, "❌ Masalan: A001");
    }

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
  }

  // ===== EDIT =====
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
});

module.exports = bot;
