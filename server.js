import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

// Setup Session
app.use(session({
    secret: 'my-secret-key-123',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Error opening database:", err.message);
});

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // Habits table
    db.run(`CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        streak INTEGER DEFAULT 0,
        last_completed TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Goals table
    db.run(`CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        target INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // NEW: User-specific notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT,
        text TEXT,
        time TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // NEW: User-specific friend activity table
    db.run(`CREATE TABLE IF NOT EXISTS friend_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        friend_name TEXT,
        action TEXT,
        time TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

// Motivation Messages List
const motivationList = [
    "You’re doing great — keep building your streak!",
    "Small progress is still progress — keep going!",
    "Don’t worry about yesterday, focus on today.",
    "You’re only one step away from getting back on track!"
];

// Friend Activity Templates
const friendTemplates = [
    { name: "Alex", action: "started a new habit: Running" },
    { name: "Jordan", action: "reached a 7-day streak on Reading" },
    { name: "Taylor", action: "hit a 10-day streak on Meditation" },
    { name: "Sam", action: "completed their workout early today!" }
];

// --- ROUTES ---

// 1. Register
app.post('/register', (req, res) => {
    const { username, password, confirmPassword } = req.body;
    
    if (!username || !password) return res.status(400).json({ error: "All fields required" });
    if (password !== confirmPassword) return res.status(400).json({ error: "Passwords do not match" });

    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    stmt.run(username, hashedPassword, function(err) {
        if (err) return res.status(400).json({ error: "Username taken" });
        
        const userId = this.lastID;
        
        // Initialize user-specific fake data
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Add initial friend activity
        friendTemplates.forEach(t => {
            db.run("INSERT INTO friend_activity (user_id, friend_name, action, time) VALUES (?, ?, ?, ?)", 
                [userId, t.name, t.action, now]);
        });

        // Add initial notification
        db.run("INSERT INTO notifications (user_id, type, text, time) VALUES (?, ?, ?, ?)",
            [userId, "Motivation", "Welcome to Habit Flow! Start your first habit today.", now]);

        res.json({ message: "Success" });
    });
    stmt.finalize();
});

// 2. Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) return res.status(400).json({ error: "User not found" });
        if (bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.json({ message: "Success" });
        } else {
            res.status(400).json({ error: "Invalid password" });
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// 3. Get all app data
app.get('/api/data', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    const userId = req.session.userId;

    // Get habits
    db.all("SELECT * FROM habits WHERE user_id = ?", [userId], (err, habits) => {
        if (err) return res.status(500).json({ error: "DB Error" });

        // Get notifications (stored in DB)
        db.all("SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC", [userId], (err, notifications) => {
            
            // Get friend activity
            db.all("SELECT * FROM friend_activity WHERE user_id = ? ORDER BY id DESC", [userId], (err, friends) => {
                
                // Get goals
                db.all("SELECT * FROM goals WHERE user_id = ?", [userId], (err, goals) => {
                    
                    // Add periodic motivation check
                    if (habits.length > 0) {
                        habits.forEach(h => {
                           if (h.last_completed) {
                               const lastDate = new Date(h.last_completed);
                               const diffDays = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
                               if (diffDays >= 2) {
                                   const msg = motivationList[Math.floor(Math.random() * motivationList.length)];
                                   const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                   // Simple check to avoid duplicates in the same session
                                   if (!notifications.some(n => n.text === msg)) {
                                       db.run("INSERT INTO notifications (user_id, type, text, time) VALUES (?, ?, ?, ?)", [userId, "Motivation", msg, now]);
                                   }
                               }
                           }
                        });
                    }

                    res.json({
                        username: req.session.username,
                        habits: habits,
                        friends: friends,
                        notifications: notifications,
                        goals: goals || []
                    });
                });
            });
        });
    });
});

app.post('/api/habits', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    const { title } = req.body;
    db.run("INSERT INTO habits (user_id, title) VALUES (?, ?)", [req.session.userId, title], function(err) {
        if (err) return res.status(500).json({ error: "Error" });
        res.json({ id: this.lastID });
    });
});

app.post('/api/habits/:id/complete', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    const today = new Date().toISOString().split('T')[0];
    db.run("UPDATE habits SET streak = streak + 1, last_completed = ? WHERE id = ? AND user_id = ?", [today, req.params.id, req.session.userId], () => {
        res.json({ message: "Done" });
    });
});

app.post('/api/goals', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    const { name, target } = req.body;
    db.run("INSERT INTO goals (user_id, name, target) VALUES (?, ?, ?)", [req.session.userId, name, target], function(err) {
        res.json({ id: this.lastID });
    });
});

app.delete('/api/goals/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });
    db.run("DELETE FROM goals WHERE id = ? AND user_id = ?", [req.params.id, req.session.userId], () => {
        res.json({ message: "Deleted" });
    });
});

app.listen(port, () => console.log(`Serving on http://0.0.0.0:${port}`));
