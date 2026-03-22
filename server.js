const express = require("express");
const fs = require("fs");
const session = require("express-session");

const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

// BODY PARSE
app.use(express.urlencoded({ extended: true }));

// ===== DB (file fallback) =====
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

// ===== HOME =====
app.get("/", (req, res) => {
  res.send("🚀 Server ishlayapti");
});

// ===== USER PAGE =====
app.get("/:id", (req, res) => {
  const data = getData();
  const user = data[req.params.id];

  if (!user) {
    return res.send("❌ Topilmadi");
  }

  res.send(`
    <html>
    <head>
      <style>
        body {
          background:#0f172a;
          color:white;
          font-family:sans-serif;
          display:flex;
          justify-content:center;
          align-items:center;
          height:100vh;
        }
        .card {
          background:#1e293b;
          padding:20px;
          border-radius:15px;
          text-align:center;
          width:250px;
        }
        a {
          display:block;
          margin:10px 0;
          padding:10px;
          border-radius:8px;
          color:white;
          text-decoration:none;
        }
        .phone { background:green; }
        .tg { background:#3b82f6; }
        .ig { background:#e1306c; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>${user.name}</h2>
        <p>${user.phone}</p>

        ${user.phone ? `<a class="phone" href="tel:${user.phone}">📞 Qo‘ng‘iroq</a>` : ""}
        ${user.telegram ? `<a class="tg" href="https://t.me/${user.telegram}">Telegram</a>` : ""}
        ${user.instagram ? `<a class="ig" href="https://instagram.com/${user.instagram}">Instagram</a>` : ""}
      </div>
    </body>
    </html>
  `);
});

// ===== LOGIN =====
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

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "19072004") {
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
app.get("/admin", (req, res) => {
  if (!req.session.auth) {
    return res.redirect("/login");
  }

  const data = getData();

  let html = `
  <html>
  <head>
    <title>Admin Panel</title>
    <style>
      body { font-family: Arial; background:#0f172a; color:white; padding:20px; }
      table { width:100%; border-collapse: collapse; }
      td, th { padding:10px; border-bottom:1px solid #333; }
      a { color:#38bdf8; text-decoration:none; }
      .del { color:red; }
    </style>
  </head>
  <body>
    <h2>📊 Admin Panel</h2>
    <a href="/logout">🚪 Chiqish</a>
    <table>
      <tr>
        <th>Kod</th>
        <th>Ism</th>
        <th>Telefon</th>
        <th>Telegram</th>
        <th>Instagram</th>
        <th>Action</th>
      </tr>
  `;

  Object.keys(data).forEach(code => {
    const u = data[code];

    html += `
      <tr>
        <td>${code}</td>
        <td>${u.name || ""}</td>
        <td>${u.phone || ""}</td>
        <td>${u.telegram || ""}</td>
        <td>${u.instagram || ""}</td>
        <td>
          <a href="/edit/${code}">✏️ Edit</a> |
          <a href="/delete/${code}" class="del">❌ Delete</a>
        </td>
      </tr>
    `;
  });

  html += `
    </table>
  </body>
  </html>
  `;

  res.send(html);
});

// ===== EDIT =====
app.get("/edit/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();
  const user = data[req.params.id];

  if (!user) return res.send("Topilmadi");

  res.send(`
    <h2>Edit ${req.params.id}</h2>
    <form method="POST">
      <input name="name" value="${user.name}" placeholder="Ism"/><br>
      <input name="phone" value="${user.phone}" placeholder="Telefon"/><br>
      <input name="telegram" value="${user.telegram}" placeholder="Telegram"/><br>
      <input name="instagram" value="${user.instagram}" placeholder="Instagram"/><br>
      <button>Saqlash</button>
    </form>
  `);
});

app.post("/edit/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();

  data[req.params.id] = {
    ...data[req.params.id],
    ...req.body
  };

  saveData(data);
  res.redirect("/admin");
});

// ===== DELETE =====
app.get("/delete/:id", (req, res) => {
  if (!req.session.auth) return res.redirect("/login");

  const data = getData();

  delete data[req.params.id];

  saveData(data);
  res.redirect("/admin");
});

// ===== START =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server ishladi:", PORT));
