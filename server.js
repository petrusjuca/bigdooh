require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const port = process.env.Port || 3001;

// Middleware to enable CORS
app.use(cors());

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'imgs-outdoor'))); // Serve images from imgs-outdoor

// Connect to the outdoor database using a relative path
const outdoorDbPath = process.env.OUTDOOR_DB_PATH || './backend/database/banco.db';
const bigsemanasDbPath = process.env.BIGSEMANAS_DB_PATH || './backend/database/semanasbanco.db';

const outdoorDb = new sqlite3.Database(outdoorDbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados outdoors:', err.message);
    } else {
        console.log('Conectado ao banco de dados outdoors');
    }
});

const bigsemanasDb = new sqlite3.Database(bigsemanasDbPath, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados semanasbanco:', err.message);
    } else {
        console.log('Conectado ao banco de dados semanasbanco');
    }
});

// Routes for outdoors
app.get('/api/outdoors', (req, res) => {
    outdoorDb.all('SELECT * FROM outdoorsinfo', [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar outdoors:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/outdoors/:id', (req, res) => {
    const id = req.params.id;
    outdoorDb.get('SELECT * FROM outdoorsinfo WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar outdoor:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Outdoor não encontrado' });
        }
        res.json(row);
    });
});

// Routes for bigsemanas
app.get('/api/bigsemanas', (req, res) => {
    bigsemanasDb.all('SELECT * FROM bigsemanas', [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar bigsemanas:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'localizacoes.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
});
