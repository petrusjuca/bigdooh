/*
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// Conectar ao banco de dados
const db = new sqlite3.Database('backend/database/semanasbanco.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados semanasbanco.db');
    }
});

// Rota para buscar todos os dados da tabela bigsemana
router.get('/bigsemanas', (req, res) => {
    const query = 'SELECT * FROM bigsemanas'; // CertNODE ifique-se de que o nome da tabela está correto
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Envia os dados como JSON
    });
});

module.exports = router;

*/