/*

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const router = express.Router();

// Função para conectar ao banco de dados
const connectToDatabase = () => {
    return new sqlite3.Database('D:\\PROTOTIPO SITE BIGDOOH\\backend\\database\\banco.db', (err) => {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err.message);
        } else {
            console.log('Conectado ao banco de dados');
        }
    });
};

// Rota para obter todos os outdoors
router.get('/outdoors', (req, res) => {
    const db = connectToDatabase();

    db.all('SELECT * FROM outdoorsinfo', [], (err, rows) => {
        if (err) {
            console.error('Erro ao buscar outdoors:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });

    db.close();
});

// Rota para obter detalhes de um outdoor específico
router.get('/:id', (req, res) => {
    const db = connectToDatabase();
    const id = req.params.id;

    db.get('SELECT * FROM outdoorsinfo WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('Erro ao buscar outdoor:', err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Outdoor não encontrado' });
        }
        res.json(row);
    });

    db.close();
});

// Nova rota para verificar a conexão com o banco de dados e listar as tabelas
router.get('/check-db', (req, res) => {
    const db = connectToDatabase();
    db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
        if (err) {
            console.error('Erro ao listar tabelas:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(tables);
    });
    db.close();
});

module.exports = router;

*/