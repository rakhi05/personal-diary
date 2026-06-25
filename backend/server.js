require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for Base64 images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        // Note: It's okay if this fails initially if the database hasn't been created yet.
        return;
    }
    console.log('Successfully connected to MySQL database.');
});

// ==========================================
// AUTHENTICATION APIs
// ==========================================

// Register API
app.post('/api/auth/register', async (req, res) => {
    const { username, password, security_question, security_answer } = req.body;
    if (!username || !password || !security_question || !security_answer) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const answer = security_answer.trim().toLowerCase();

        db.query('INSERT INTO users (username, password_hash, security_question, security_answer) VALUES (?, ?, ?, ?)', 
        [username, hashedPassword, security_question, answer], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Username already exists.' });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login API
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        // Find user
        db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(400).json({ error: 'Invalid credentials.' });

            const user = results[0];

            // Compare passwords
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) return res.status(400).json({ error: 'Invalid credentials.' });

            // Generate JWT Token
            const token = jwt.sign(
                { id: user.id, username: user.username },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '24h' }
            );

            res.status(200).json({
                message: 'Login successful!',
                token,
                user: { id: user.id, username: user.username }
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Get Security Question
app.post('/api/auth/get-security-question', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required.' });

    db.query('SELECT security_question FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found.' });

        res.status(200).json({ security_question: results[0].security_question });
    });
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    const { username, security_answer, new_password } = req.body;
    if (!username || !security_answer || !new_password) return res.status(400).json({ error: 'All fields are required.' });

    db.query('SELECT id, security_answer FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'User not found.' });

        const user = results[0];
        const answerProvided = security_answer.trim().toLowerCase();

        if (user.security_answer !== answerProvided) {
            return res.status(401).json({ error: 'Incorrect security answer.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            db.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, user.id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.status(200).json({ message: 'Password reset successfully. You can now login.' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

// ==========================================
// MIDDLEWARE: JWT Verification
// ==========================================
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user; // attach user object to request
        next();
    });
}

// ==========================================
// HELPER: Base64 Image Saver
// ==========================================
function saveBase64Image(base64Str) {
    if (!base64Str || !base64Str.startsWith('data:image')) return null;
    try {
        const matches = base64Str.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches.length !== 3) return null;
        
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const imageData = Buffer.from(matches[2], 'base64');
        const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
        const filePath = path.join(__dirname, 'uploads', fileName);
        
        fs.writeFileSync(filePath, imageData);
        return `/uploads/${fileName}`;
    } catch (e) {
        console.error('Error saving image:', e);
        return null;
    }
}

// ==========================================
// DIARY ENTRIES APIs (Protected)
// ==========================================

// Get all entries for logged-in user
app.get('/api/entries', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.query('SELECT * FROM entries WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// Create new entry
app.post('/api/entries', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { date, title, content, mood, summary, imageData } = req.body;

    if (!date || !title || !content) {
        return res.status(400).json({ error: 'Date, title, and content are required.' });
    }
    
    const imagePath = imageData ? saveBase64Image(imageData) : null;

    const query = 'INSERT INTO entries (user_id, date, title, content, mood, summary, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [userId, date, title, content, mood || 'Neutral', summary || null, imagePath], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Entry created successfully!', id: result.insertId });
    });
});

// Update (Edit) existing entry
app.put('/api/entries/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const entryId = req.params.id;
    const { title, content, mood, summary, imageData } = req.body;

    // First ensure the entry belongs to the user
    db.query('SELECT * FROM entries WHERE id = ? AND user_id = ?', [entryId, userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Entry not found or unauthorized.' });
        
        // If imageData is a base64 string, save it. If it's already a URL (/uploads/...), keep it.
        let imagePath = results[0].image_path;
        if (imageData && imageData.startsWith('data:image')) {
            imagePath = saveBase64Image(imageData);
        } else if (!imageData) {
            imagePath = null;
        }

        const query = 'UPDATE entries SET title = ?, content = ?, mood = ?, summary = ?, image_path = ? WHERE id = ?';
        db.query(query, [title, content, mood || 'Neutral', summary || null, imagePath, entryId], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(200).json({ message: 'Entry updated successfully!' });
        });
    });
});

// Delete entry
app.delete('/api/entries/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const entryId = req.params.id;

    db.query('DELETE FROM entries WHERE id = ? AND user_id = ?', [entryId, userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Entry not found or unauthorized.' });
        res.status(200).json({ message: 'Entry deleted successfully!' });
    });
});

// ==========================================
// DRAFTS APIs (Protected)
// ==========================================

// Get user's active draft
app.get('/api/drafts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.query('SELECT * FROM drafts WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results[0] || null);
    });
});

// Upsert (Create/Update) draft
app.put('/api/drafts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { date, title, content, mood } = req.body;

    const query = `
        INSERT INTO drafts (user_id, date, title, content, mood) 
        VALUES (?, ?, ?, ?, ?) 
        ON DUPLICATE KEY UPDATE 
        date = VALUES(date), title = VALUES(title), content = VALUES(content), mood = VALUES(mood)
    `;
    db.query(query, [userId, date || null, title || '', content || '', mood || 'Neutral'], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Draft saved successfully!' });
    });
});

// Delete user's draft
app.delete('/api/drafts', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.query('DELETE FROM drafts WHERE user_id = ?', [userId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'Draft deleted successfully!' });
    });
});

// Server started. Frontend is served statically via middleware.

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
