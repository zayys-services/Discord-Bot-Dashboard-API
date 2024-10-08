const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();

// Create a new Express application
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// SQLite database setup
const db = new sqlite3.Database(path.join(__dirname, 'data.db'), (err) => {
    if (err) {
        console.error('Could not connect to database:', err);
    } else {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discordId TEXT UNIQUE,
            accessToken TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            totalUsers INTEGER,
            totalServers INTEGER,
            latency INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// OAuth2 setup (replace with your own values)
const clientId = 'CHANGE ME'; // Your Discord client ID
const clientSecret = 'CHANGE ME'; // Your Discord client secret
const redirectUri = 'https://CHANGE ME.pro/auth/callback'; // Your redirect URI

// Route to redirect to Discord for authentication
app.get('/auth/discord', (req, res) => {
    const authUrl = `https://discord.com/api/oauth2/authorize?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=identify%20guilds`;
    res.redirect(authUrl);
});

// Callback route for Discord to redirect after authentication
app.get('/auth/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();

        // Get user info from Discord API
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        const userData = await userResponse.json();

        // Check if user exists in DB
        db.get(`SELECT * FROM users WHERE discordId = ?`, [userData.id], (err, user) => {
            if (err) {
                console.error("Error fetching user:", err);
                return res.status(500).send("Internal Server Error");
            }

            if (!user) {
                // If user doesn't exist, create a new entry
                db.run(`INSERT INTO users (discordId, accessToken) VALUES (?, ?)`, [userData.id, tokenData.access_token]);
            } else {
                // Update access token if the user already exists
                db.run(`UPDATE users SET accessToken = ? WHERE discordId = ?`, [tokenData.access_token, userData.id]);
            }
        });

        // Set the access token in a cookie
        res.cookie('access_token', tokenData.access_token, {
            httpOnly: true, // Prevents client-side access to the cookie
            secure: true,   // Set to true if using HTTPS
            maxAge: 3600000 // Cookie expiration time (1 hour)
        });

        // Redirect to dashboard after successful login with access token
        res.redirect(`http://dashboard-botname.CHANGE ME.pro/dashboard.html?access_token=${tokenData.access_token}`);
    } catch (error) {
        console.error("Error during authentication:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Function to insert stats into the SQLite database
const insertStats = (totalUsers, totalServers, latency) => {
    const sql = `INSERT INTO stats (totalUsers, totalServers, latency) VALUES (?, ?, ?)`;
    db.run(sql, [totalUsers, totalServers, latency], function(err) {
        if (err) {
            console.error('Could not insert stats:', err);
        } else {
            console.log(`Inserted stats with ID: ${this.lastID}`);
        }
    });
};

// Function to fetch bot statistics (replace with actual logic)
const fetchBotStats = () => {
    // Replace these values with the actual logic to get user count, server count, and latency
    const totalUsers = 100; // Replace with actual user count
    const totalServers = 10; // Replace with actual server count
    const latency = Math.floor(Math.random() * 100); // Mock latency value

    // Insert stats into the database
    insertStats(totalUsers, totalServers, latency);
};

// Set interval to post stats every 6 hours
setInterval(fetchBotStats, 21600000); // 6 hours in milliseconds

// API route to get bot stats
app.get('/api/stats', (req, res) => {
    const sql = `SELECT totalUsers, totalServers, latency FROM stats ORDER BY timestamp DESC LIMIT 1`;
    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.status(200).json(row || { totalUsers: 0, totalServers: 0, latency: 0 });
    });
});

// API route to post bot stats
app.post('/api/stats', (req, res) => {
    const { totalUsers, totalServers, latency } = req.body;

    if (totalUsers === undefined || totalServers === undefined || latency === undefined) {
        return res.status(400).send('Invalid data');
    }

    // Insert the received stats into the database
    insertStats(totalUsers, totalServers, latency);
    res.status(200).json({ message: 'Stats received successfully' });
});

// Start server
const PORT = 18483; // Set to 18483
app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
});
