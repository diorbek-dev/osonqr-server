const express = require("express");
const fs = require("fs");
const QRCode = require("qrcode");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
app.use(express.json());

// 🔐 TOKEN (o‘zingnikini qo‘y)
const bot = new TelegramBot("8778983271:AAH7c_9HZvqv-GA1jpnsjATkz5qICwwLTZ4", { polling: true });

// 📦 DB
function getData() {
  try {
    return JSON.parse(fs.readFileSync("db.json", "utf-8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync("db.json", JSON.stringify(data, null, 2));
}

// =======================
// 🤖 TELEGRAM BOT
// =======================

let userState = {};

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔑 Kod kiriting (masalan: A001)");
});

// message handler
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) return;

  const data = getData();

  // 1️⃣ Kod kiritish
  if (!userState[chatId]) {
    const code = text.toUpperCase();

    if (data[code]) {
      return bot.sendMessage(chatId, "❌ Bu kod band!");
    }

    userState[chatId] = { step: "name", code };

    return bot.sendMessage(chatId, "👤 Ismingiz:");
  }

  const state = userState[chatId];

  // 2️⃣ Ism
  if (state.step === "name") {
    state.name = text;
    state.step = "phone";
    return bot.sendMessage(chatId, "📞 Telefon:");
  }

  // 3️⃣ Telefon
  if (state.step === "phone") {
    state.phone = text;
    state.step = "telegram";
    return bot.sendMessage(chatId, "📱 Telegram username:");
  }

  // 4️⃣ Telegram
  if (state.step === "telegram") {
    state.telegram = text;
    state.step = "instagram";
    return bot.sendMessage(chatId, "📸 Instagram:");
  }

  // 5️⃣ Instagram
  if (state.step === "instagram") {
    const code = state.code;

    data[code] = {
      name: state.name,
      phone: state.phone,
      telegram: state.telegram,
      instagram: text,
      owner: chatId,
      active: true,
      show_phone: true,
      show_telegram: true,
      show_instagram: true
    };

    saveData(data);

    delete userState[chatId];

    return bot.sendMessage(
  chatId,
  `✅ Aktivlashtirildi!\n\n🌐 Link:\nhttps://osonqr-server-production.up.railway.app/${code}`
);
  }
});

// =======================
// 🌐 ROUTES
// =======================

// HOME
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// QR PAGE
app.get("/qr/:id", async (req, res) => {
  const id = req.params.id;

  const url = `${req.protocol}://${req.get("host")}/${id}`;

  try {
    const qr = await QRCode.toDataURL(url);

    res.send(`
    <html>
    <body style="text-align:center;font-family:sans-serif;">
      <h2>QR Code</h2>
      <img src="${qr}" />
      <p>${url}</p>
    </body>
    </html>
    `);
  } catch {
    res.send("Xatolik ❌");
  }
});

// USER PROFILE
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user || !user.active) {
    return res.send("❌ Topilmadi");
  }

  res.send(`
  <html>
  <body style="
    margin:0;
    background:#0f172a;
    font-family:sans-serif;
    color:white;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
  ">

  <div style="
    width:300px;
    background:#1e293b;
    border-radius:20px;
    padding:20px;
    text-align:center;
  ">

    <img src="https://i.pravatar.cc/150" style="
      width:100px;
      border-radius:50%;
      margin-bottom:10px;
    ">

    <h2>${user.name}</h2>

    ${user.show_phone ? `<p>${user.phone}</p>` : ""}

    <br>

    ${user.show_phone ? `
    <a href="tel:${user.phone}">
      <button style="width:100%;padding:10px;margin:5px;background:#22c55e;border:none;border-radius:10px;color:white;">
        📞 Qo‘ng‘iroq
      </button>
    </a>` : ""}

    ${user.show_telegram ? `
    <a href="https://t.me/${user.telegram}">
      <button style="width:100%;padding:10px;margin:5px;background:#3b82f6;border:none;border-radius:10px;color:white;">
        Telegram
      </button>
    </a>` : ""}

    ${user.show_instagram ? `
    <a href="https://instagram.com/${user.instagram}">
      <button style="width:100%;padding:10px;margin:5px;background:#e1306c;border:none;border-radius:10px;color:white;">
        Instagram
      </button>
    </a>` : ""}

  </div>
  </body>
  </html>
  `);
});

// =======================
// 🚀 START
// =======================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server ishlayapti: " + PORT);
});
