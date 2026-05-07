require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const port = process.env.Port || 3001;

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bigdooh2026';
const IMGS_OUTDOOR_DIR = path.join(__dirname, 'imgs-outdoor');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'imgs-outdoor'))); // Serve images from imgs-outdoor

const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadXlsx = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const requireAdmin = (req, res, next) => {
    const supplied = req.get('x-admin-pass') || req.body?.adminPass || req.query?.adminPass;
    if (!supplied || supplied !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha de admin inválida' });
    }
    next();
};

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

// === Admin (placas) ===
app.post('/api/admin/login', (req, res) => {
    if ((req.body || {}).password === ADMIN_PASSWORD) return res.json({ ok: true });
    res.status(401).json({ error: 'Senha incorreta' });
});

app.get('/api/admin/outdoors', requireAdmin, (req, res) => {
    outdoorDb.all('SELECT * FROM outdoorsinfo ORDER BY CAST(NUM_PLACA AS INTEGER), NUM_PLACA', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

const FIELDS = ['NUM_PLACA', 'TIPO', 'ENDERECO', 'SENTIDO', 'LATITUDE', 'LONGITUDE', 'LINK', 'GABARITO', 'FOTO_URL'];
const pick = (body) => FIELDS.reduce((acc, f) => { acc[f] = body[f] != null ? String(body[f]) : ''; return acc; }, {});

app.post('/api/admin/outdoors', requireAdmin, (req, res) => {
    const data = pick(req.body || {});
    if (!data.NUM_PLACA) return res.status(400).json({ error: 'NUM_PLACA é obrigatório' });
    if (!data.TIPO) return res.status(400).json({ error: 'TIPO é obrigatório' });
    outdoorDb.get('SELECT id FROM outdoorsinfo WHERE NUM_PLACA = ?', [data.NUM_PLACA], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            outdoorDb.run(
                `UPDATE outdoorsinfo SET TIPO=?, ENDERECO=?, SENTIDO=?, LATITUDE=?, LONGITUDE=?, LINK=?, GABARITO=?, FOTO_URL=? WHERE id=?`,
                [data.TIPO, data.ENDERECO, data.SENTIDO, data.LATITUDE, data.LONGITUDE, data.LINK, data.GABARITO, data.FOTO_URL, row.id],
                function (e) {
                    if (e) return res.status(500).json({ error: e.message });
                    res.json({ ok: true, id: row.id, action: 'updated' });
                }
            );
        } else {
            outdoorDb.run(
                `INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                FIELDS.map((f) => data[f]),
                function (e) {
                    if (e) return res.status(500).json({ error: e.message });
                    res.json({ ok: true, id: this.lastID, action: 'created' });
                }
            );
        }
    });
});

app.delete('/api/admin/outdoors/:id', requireAdmin, (req, res) => {
    outdoorDb.run('DELETE FROM outdoorsinfo WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, deleted: this.changes });
    });
});

app.post('/api/admin/photo', requireAdmin, uploadPhoto.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });
    const numPlaca = String(req.body.num_placa || '').trim();
    if (!numPlaca) return res.status(400).json({ error: 'num_placa é obrigatório' });
    const safe = numPlaca.replace(/[^0-9A-Za-z_-]/g, '');
    if (!safe) return res.status(400).json({ error: 'num_placa inválido' });
    const ext = (path.extname(req.file.originalname) || '.jpg').toLowerCase();
    const filename = `${safe}${ext}`;
    try {
        fs.writeFileSync(path.join(IMGS_OUTDOOR_DIR, filename), req.file.buffer);
    } catch (e) {
        return res.status(500).json({ error: 'Erro ao salvar imagem: ' + e.message });
    }
    outdoorDb.run('UPDATE outdoorsinfo SET FOTO_URL = ? WHERE NUM_PLACA = ?', [filename, numPlaca], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ok: true, foto_url: filename, updated: this.changes });
    });
});

app.post('/api/admin/import-xlsx', requireAdmin, uploadXlsx.single('xlsx'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Arquivo xlsx não enviado' });
    let wb;
    try { wb = XLSX.read(req.file.buffer, { type: 'buffer' }); }
    catch (e) { return res.status(400).json({ error: 'Não consegui ler o arquivo: ' + e.message }); }

    const records = new Map();
    const ledSheet = 'LEDS';
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows.length) continue;
        const hasRef = sheetName.toUpperCase() === ledSheet;
        for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            if (!r) continue;
            let numPlaca = r[0];
            if (typeof numPlaca === 'number') numPlaca = String(Math.trunc(numPlaca));
            else numPlaca = String(numPlaca || '').trim();
            const tipo = String(r[1] || '').trim();
            if (!numPlaca || !tipo) continue;
            const endereco = String(r[2] || '').trim();
            let sentido, lat, lng, link, gabarito;
            if (hasRef) {
                const ref = String(r[3] || '').trim();
                const sRaw = String(r[4] || '').trim();
                sentido = ref && sRaw ? `${ref} - ${sRaw}` : (ref || sRaw);
                lat = String(r[5] || '').trim().replace(/,/g, '.');
                lng = String(r[6] || '').trim().replace(/,/g, '.');
                link = String(r[7] || '').trim();
                gabarito = String(r[8] || '').trim();
            } else {
                sentido = String(r[3] || '').trim();
                lat = String(r[4] || '').trim().replace(/,/g, '.');
                lng = String(r[5] || '').trim().replace(/,/g, '.');
                link = String(r[6] || '').trim();
                gabarito = String(r[7] || '').trim();
            }
            records.set(numPlaca, { NUM_PLACA: numPlaca, TIPO: tipo, ENDERECO: endereco, SENTIDO: sentido, LATITUDE: lat, LONGITUDE: lng, LINK: link, GABARITO: gabarito });
        }
    }

    outdoorDb.all('SELECT id, NUM_PLACA, FOTO_URL, LINK, GABARITO FROM outdoorsinfo', [], (err, existingRows) => {
        if (err) return res.status(500).json({ error: err.message });
        const existing = new Map(existingRows.map((r) => [r.NUM_PLACA, r]));
        const newKeys = new Set(records.keys());
        const photoFiles = (() => { try { return new Set(fs.readdirSync(IMGS_OUTDOOR_DIR)); } catch { return new Set(); } })();
        const findPhoto = (num, tipo) => {
            const cands = [`${num}.jpg`, `${num}-scaled.jpg`, `${num}.png`];
            if (tipo === 'PAINEL LED') {
                const n = parseInt(num, 10);
                if (!Number.isNaN(n)) cands.push(`led${String(n).padStart(3, '0')}.jpg`, `led${String(n).padStart(3, '0')}-scaled.jpg`);
            }
            return cands.find((c) => photoFiles.has(c)) || null;
        };

        outdoorDb.serialize(() => {
            outdoorDb.run('BEGIN');
            const stmtUpd = outdoorDb.prepare(`UPDATE outdoorsinfo SET TIPO=?, ENDERECO=?, SENTIDO=?, LATITUDE=?, LONGITUDE=?, LINK=?, GABARITO=?, FOTO_URL=? WHERE id=?`);
            const stmtIns = outdoorDb.prepare(`INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            const stmtDel = outdoorDb.prepare('DELETE FROM outdoorsinfo WHERE id = ?');
            let added = 0, updated = 0, removed = 0;
            for (const [num, rec] of records) {
                const ex = existing.get(num);
                if (ex) {
                    const foto = ex.FOTO_URL || findPhoto(num, rec.TIPO);
                    const link = rec.LINK || ex.LINK || '';
                    const gabarito = rec.GABARITO || ex.GABARITO || '';
                    stmtUpd.run([rec.TIPO, rec.ENDERECO, rec.SENTIDO, rec.LATITUDE, rec.LONGITUDE, link, gabarito, foto, ex.id]);
                    updated++;
                } else {
                    const foto = findPhoto(num, rec.TIPO);
                    stmtIns.run([rec.NUM_PLACA, rec.TIPO, rec.ENDERECO, rec.SENTIDO, rec.LATITUDE, rec.LONGITUDE, rec.LINK, rec.GABARITO, foto]);
                    added++;
                }
            }
            for (const [num, ex] of existing) {
                if (!newKeys.has(num)) { stmtDel.run([ex.id]); removed++; }
            }
            stmtUpd.finalize();
            stmtIns.finalize();
            stmtDel.finalize();
            outdoorDb.run('COMMIT', (e) => {
                if (e) return res.status(500).json({ error: e.message });
                res.json({ ok: true, added, updated, removed, total: records.size });
            });
        });
    });
});

app.get('/api/admin/export-xlsx', requireAdmin, (req, res) => {
    outdoorDb.all('SELECT NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL FROM outdoorsinfo ORDER BY CAST(NUM_PLACA AS INTEGER), NUM_PLACA', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const groups = { 'PADRÃO': [], 'FRONT': [], 'LEDS': [], 'RODOVIARIO': [] };
        for (const r of rows) {
            const t = (r.TIPO || '').toUpperCase();
            if (t === 'PADRÃO' || t === 'PADRAO') groups['PADRÃO'].push(r);
            else if (t.includes('LED')) groups['LEDS'].push(r);
            else if (t.includes('RODOVIARIO') || t.includes('RODOVIÁRIO')) groups['RODOVIARIO'].push(r);
            else groups['FRONT'].push(r);
        }
        const wb = XLSX.utils.book_new();
        for (const [name, list] of Object.entries(groups)) {
            const header = ['Nº PLACA', 'TIPO', 'ENDEREÇO', 'SENTIDO', 'LONGITUDE', 'LATITUDE', 'LINK', 'GABARITO', 'FOTO_URL'];
            const data = [header, ...list.map((r) => [r.NUM_PLACA, r.TIPO, r.ENDERECO, r.SENTIDO, r.LATITUDE, r.LONGITUDE, r.LINK, r.GABARITO, r.FOTO_URL])];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name);
        }
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="placas-bigdooh.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
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
