console.log("🤖 Bot ishga tushdi");
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");

const TOKEN = process.env.BOT_TOKEN; // Railway variable
const DOMAIN = process.env.DOMAIN;   // https://your-app.up.railway.app

const bot = new TelegramBot(TOKEN, { polling: true });

const userState = {};

// DB functions
function getData() {
  try {
    return JSON.parse(fs.readFileSync("db.json"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// 🎛 MAIN MENU
function mainMenu(chatId) {
  return bot.sendMessage(chatId, "📲 OSON QR BOT", {
    reply_markup: {
      keyboard: [
        ["🆕 Aktivatsiya"],
        ["✏️ Tahrirlash"],
        ["ℹ️ Yordam"]
      ],
      resize_keyboard: true
    }
  });
}

// START
bot.onText(/\/start/, (msg) => {
  mainMenu(msg.chat.id);
});

// MESSAGE HANDLER
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = userState[chatId];

  // MENU
  if (text === "🆕 Aktivatsiya") {
    userState[chatId] = { step: "code" };
    return bot.sendMessage(chatId, "🔑 Kod kiriting (masalan: A001)");
  }

  if (text === "✏️ Tahrirlash") {
    userState[chatId] = { step: "edit_code" };
    return bot.sendMessage(chatId, "✏️ Kodni kiriting:");
  }

  if (text === "ℹ️ Yordam") {
    return bot.sendMessage(chatId,
      "📌 Qanday ishlaydi:\n\n" +
      "1. Kod sotib olasiz\n" +
      "2. Botga kiritasiz\n" +
      "3. Ma'lumot qo‘shasiz\n" +
      "4. QR orqali boshqalar ko‘radi"
    );
  }

  // =======================
  // 🔥 AKTIVATSIYA FLOW
  // =======================

  if (state?.step === "code") {
    const code = text.toUpperCase();
    const data = getData();

    if (data[code]) {
      return bot.sendMessage(chatId, "❌ Bu kod band!");
    }

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
    const data = getData();
    const code = state.code;

    data[code] = {
      name: state.name,
      phone: state.phone,
      telegram: state.telegram,
      instagram: text,
      owner: chatId
    };

    saveData(data);
    delete userState[chatId];

    const link = `${DOMAIN}/${code}`;

    return bot.sendMessage(chatId,
      `✅ Aktivlashtirildi!\n\n🔗 Link:\n${link}`
    );
  }

  // =======================
  // ✏️ EDIT FLOW
  // =======================

  if (state?.step === "edit_code") {
    const code = text.toUpperCase();
    const data = getData();

    if (!data[code]) {
      return bot.sendMessage(chatId, "❌ Kod topilmadi");
    }

    if (data[code].owner !== chatId) {
      return bot.sendMessage(chatId, "❌ Bu sizniki emas");
    }

    userState[chatId] = { step: "edit_name", code };
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
    const data = getData();
    const code = state.code;

    data[code] = {
      ...data[code],
      name: state.name,
      phone: state.phone,
      instagram: text
    };

    saveData(data);
    delete userState[chatId];

    return bot.sendMessage(chatId, "✅ Yangilandi!");
  }
});
