const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('Starting MySQL setup...');
console.log('Host:', process.env.DB_HOST);
console.log('User:', process.env.DB_USER);
console.log('Database:', process.env.DB_NAME);

// First connect without specifying a database to create it if it doesn't exist
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL server:', err.message);
        process.exit(1);
    }
    console.log('Successfully connected to MySQL server.');

    // Create database if not exists
    connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``, (err) => {
        if (err) {
            console.error('Error creating database:', err.message);
            connection.end();
            process.exit(1);
        }
        console.log(`Database "${process.env.DB_NAME}" checked/created successfully.`);

        // Now switch to the database
        connection.query(`USE \`${process.env.DB_NAME}\``, (err) => {
            if (err) {
                console.error('Error selecting database:', err.message);
                connection.end();
                process.exit(1);
            }

            // Create users table
            const createUsersTable = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    password_hash VARCHAR(255) NOT NULL,
                    security_question VARCHAR(255) NOT NULL,
                    security_answer VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `;

            connection.query(createUsersTable, (err) => {
                if (err) {
                    console.error('Error creating users table:', err.message);
                    connection.end();
                    process.exit(1);
                }
                console.log('Users table checked/created.');

                // Create entries table with all columns
                const createEntriesTable = `
                    CREATE TABLE IF NOT EXISTS entries (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        date DATE NOT NULL,
                        title VARCHAR(255) NOT NULL,
                        content TEXT NOT NULL,
                        mood VARCHAR(50) DEFAULT 'Neutral',
                        category VARCHAR(100) DEFAULT 'General',
                        summary TEXT,
                        image_path VARCHAR(255),
                        is_archived BOOLEAN DEFAULT FALSE,
                        is_pinned BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    );
                `;

                connection.query(createEntriesTable, (err) => {
                    if (err) {
                        console.error('Error creating entries table:', err.message);
                        connection.end();
                        process.exit(1);
                    }
                    console.log('Entries table checked/created.');

                    // Create drafts table
                    const createDraftsTable = `
                        CREATE TABLE IF NOT EXISTS drafts (
                            user_id INT PRIMARY KEY,
                            date DATE,
                            title VARCHAR(255),
                            content TEXT,
                            mood VARCHAR(50) DEFAULT 'Neutral',
                            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                        );
                    `;

                    connection.query(createDraftsTable, (err) => {
                        if (err) {
                            console.error('Error creating drafts table:', err.message);
                            connection.end();
                            process.exit(1);
                        }
                        console.log('Drafts table checked/created.');

                        // Perform schema check and alter tables if columns are missing
                        // Alter users table to add security_question and security_answer if they don't exist
                        const addUsersColumns = [
                            { name: 'security_question', type: 'VARCHAR(255) NOT NULL' },
                            { name: 'security_answer', type: 'VARCHAR(255) NOT NULL' }
                        ];

                        checkAndAddColumns('users', addUsersColumns, () => {
                            // Alter entries table if columns are missing
                            const addEntriesColumns = [
                                { name: 'category', type: "VARCHAR(100) DEFAULT 'General'" },
                                { name: 'is_archived', type: 'BOOLEAN DEFAULT FALSE' },
                                { name: 'is_pinned', type: 'BOOLEAN DEFAULT FALSE' },
                                { name: 'updated_at', type: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
                            ];

                            checkAndAddColumns('entries', addEntriesColumns, () => {
                                console.log('Database setup completed successfully!');
                                connection.end();
                                process.exit(0);
                            });
                        });
                    });
                });
            });
        });
    });
});

function checkAndAddColumns(tableName, columns, callback) {
    connection.query(`SHOW COLUMNS FROM \`${tableName}\``, (err, results) => {
        if (err) {
            console.error(`Error checking columns for table ${tableName}:`, err.message);
            callback();
            return;
        }

        const existingColumns = results.map(r => r.Field.toLowerCase());
        let index = 0;

        function addNext() {
            if (index >= columns.length) {
                callback();
                return;
            }
            const col = columns[index];
            if (!existingColumns.includes(col.name.toLowerCase())) {
                console.log(`Adding missing column "${col.name}" to table "${tableName}"...`);
                connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${col.name}\` ${col.type}`, (err) => {
                    if (err) {
                        console.error(`Error adding column ${col.name}:`, err.message);
                    }
                    index++;
                    addNext();
                });
            } else {
                index++;
                addNext();
            }
        }

        addNext();
    });
}
