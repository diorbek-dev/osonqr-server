const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");

const app = express();

// ===== MIDDLEWARE =====
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// ===== MONGODB CONNECT =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB ulandi"))
  .catch(err => console.log("❌ MongoDB xato:", err));

// ===== MODEL =====
const UserSchema = new mongoose.Schema({
  code: String,
  name: String,
  phone: String,
  telegram: String,
  instagram: String
});

const User = mongoose.model("User", UserSchema);

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// ===== LOGIN PAGE =====
app.get("/login", (req, res) => {
  res.send(`
    <h2>🔐 Admin Login</h2>
    <form method="POST">
      <input name="username" placeholder="Login"/><br><br>
      <input name="password" type="password" placeholder="Parol"/><br><br>
      <button>Kirish</button>
    </form>
  `);
});

// ===== LOGIN =====
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "12345") {
    req.session.auth = true;
    return res.redirect("/admin");
  }

  res.send("❌ Noto‘g‘ri login yoki parol");
});

// ===== LOGOUT =====
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

// ===== ADMIN PANEL =====
app.get("/admin", async (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = await User.find();

  let html = `
    <h2>📊 Admin Panel</h2>
    <a href="/logout">🚪 Chiqish</a><br><br>

    <form method="POST" action="/add">
      <input name="code" placeholder="Code (A001)"/><br>
      <input name="name" placeholder="Ism"/><br>
      <input name="phone" placeholder="Telefon"/><br>
      <input name="telegram" placeholder="Telegram"/><br>
      <input name="instagram" placeholder="Instagram"/><br>
      <button>➕ Qo‘shish</button>
    </form>

    <hr>

    <table border="1" cellpadding="5">
      <tr>
        <th>Kod</th>
        <th>Ism</th>
        <th>Telefon</th>
        <th>Telegram</th>
        <th>Instagram</th>
        <th>Action</th>
      </tr>
  `;

  data.forEach(u => {
    html += `
      <tr>
        <td>${u.code}</td>
        <td>${u.name || ""}</td>
        <td>${u.phone || ""}</td>
        <td>${u.telegram || ""}</td>
        <td>${u.instagram || ""}</td>
        <td>
          <a href="/edit/${u.code}">✏️ Edit</a>
          <a href="/delete/${u.code}">❌ Delete</a>
        </td>
      </tr>
    `;
  });

  html += `</table>`;

  res.send(html);
});

// ===== ADD =====
app.post("/add", async (req, res) => {
  await User.create(req.body);
  res.redirect("/admin");
});

// ===== EDIT PAGE =====
app.get("/edit/:code", async (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const user = await User.findOne({ code: req.params.code });

  if (!user) return res.send("❌ Topilmadi");

  res.send(`
    <h2>Edit ${user.code}</h2>
    <form method="POST">
      <input name="name" value="${user.name || ""}"/><br>
      <input name="phone" value="${user.phone || ""}"/><br>
      <input name="telegram" value="${user.telegram || ""}"/><br>
      <input name="instagram" value="${user.instagram || ""}"/><br>
      <button>Saqlash</button>
    </form>
  `);
});

// ===== EDIT =====
app.post("/edit/:code", async (req, res) => {
  await User.findOneAndUpdate(
    { code: req.params.code },
    req.body
  );
  res.redirect("/admin");
});

// ===== DELETE =====
app.get("/delete/:code", async (req, res) => {
  await User.findOneAndDelete({ code: req.params.code });
  res.redirect("/admin");
});

// ===== USER PAGE =====
app.get("/:code", async (req, res) => {
  const user = await User.findOne({ code: req.params.code });

  if (!user) return res.send("❌ Topilmadi");

  res.send(`
    <h2>${user.name}</h2>
    <p>${user.phone}</p>
    ${user.telegram ? `<a href="https://t.me/${user.telegram}">Telegram</a><br>` : ""}
    ${user.instagram ? `<a href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}
  `);
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server ishladi:", PORT));
