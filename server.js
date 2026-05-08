require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { createClient } = require('@libsql/client');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const port = process.env.PORT || process.env.Port || 3001;

const cleanEnv = (v) => (typeof v === 'string' ? v.trim() : v);
const ADMIN_PASSWORD = cleanEnv(process.env.ADMIN_PASSWORD) || 'bigdooh2026';
const IMGS_OUTDOOR_DIR = path.join(__dirname, 'imgs-outdoor');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(IMGS_OUTDOOR_DIR));

const uploadPhoto = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadXlsx = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const requireAdmin = (req, res, next) => {
    const supplied = req.get('x-admin-pass') || req.body?.adminPass || req.query?.adminPass;
    if (!supplied || supplied !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha de admin inválida' });
    }
    next();
};

const outdoorDbUrl = cleanEnv(process.env.TURSO_DATABASE_URL) || `file:${path.join(__dirname, 'backend/database/banco.db')}`;
const isRemoteOutdoors = outdoorDbUrl.startsWith('libsql:') || outdoorDbUrl.startsWith('https:');

const outdoorDb = createClient({
    url: outdoorDbUrl,
    authToken: isRemoteOutdoors ? cleanEnv(process.env.TURSO_AUTH_TOKEN) : undefined,
});

const bigsemanasDb = createClient({
    url: cleanEnv(process.env.BIGSEMANAS_DATABASE_URL) || `file:${path.join(__dirname, 'backend/database/semanasbanco.db')}`,
});

async function ensureOutdoorsSchema() {
    await outdoorDb.execute(`CREATE TABLE IF NOT EXISTS outdoorsinfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        NUM_PLACA TEXT,
        TIPO TEXT,
        ENDERECO TEXT,
        SENTIDO TEXT,
        LATITUDE TEXT,
        LONGITUDE TEXT,
        LINK TEXT,
        GABARITO TEXT,
        FOTO_URL TEXT
    )`);
    if (!isRemoteOutdoors) return;
    const r = await outdoorDb.execute('SELECT COUNT(*) AS c FROM outdoorsinfo');
    const count = Number(r.rows[0].c);
    if (count > 0) {
        console.log(`Turso já tem ${count} placas — pulando seed.`);
        return;
    }
    const localPath = path.join(__dirname, 'backend/database/banco.db');
    if (!fs.existsSync(localPath)) {
        console.log('Turso vazio mas não achei banco local pra semear.');
        return;
    }
    console.log('Turso vazio — semeando a partir de backend/database/banco.db…');
    const local = createClient({ url: `file:${localPath}` });
    const all = await local.execute('SELECT NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL FROM outdoorsinfo');
    for (const row of all.rows) {
        await outdoorDb.execute({
            sql: `INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [row.NUM_PLACA, row.TIPO, row.ENDERECO, row.SENTIDO, row.LATITUDE, row.LONGITUDE, row.LINK, row.GABARITO, row.FOTO_URL],
        });
    }
    console.log(`Semeadas ${all.rows.length} placas no Turso.`);
    local.close();
}

ensureOutdoorsSchema()
    .then(() => console.log('Banco outdoors pronto.'))
    .catch((e) => console.error('Erro init outdoors:', e));

// === Public outdoors API ===
app.get('/api/outdoors', async (req, res) => {
    try {
        const r = await outdoorDb.execute('SELECT * FROM outdoorsinfo');
        res.json(r.rows);
    } catch (e) {
        console.error('Erro ao buscar outdoors:', e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/outdoors/:id', async (req, res) => {
    try {
        const r = await outdoorDb.execute({ sql: 'SELECT * FROM outdoorsinfo WHERE id = ?', args: [req.params.id] });
        if (!r.rows[0]) return res.status(404).json({ error: 'Outdoor não encontrado' });
        res.json(r.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/bigsemanas', async (req, res) => {
    try {
        const r = await bigsemanasDb.execute('SELECT * FROM bigsemanas');
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// === Admin (placas) ===
app.post('/api/admin/login', (req, res) => {
    if ((req.body || {}).password === ADMIN_PASSWORD) return res.json({ ok: true });
    res.status(401).json({ error: 'Senha incorreta' });
});

app.get('/api/admin/outdoors', requireAdmin, async (req, res) => {
    try {
        const r = await outdoorDb.execute('SELECT * FROM outdoorsinfo ORDER BY CAST(NUM_PLACA AS INTEGER), NUM_PLACA');
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

const FIELDS = ['NUM_PLACA', 'TIPO', 'ENDERECO', 'SENTIDO', 'LATITUDE', 'LONGITUDE', 'LINK', 'GABARITO', 'FOTO_URL'];
const pick = (body) => FIELDS.reduce((acc, f) => { acc[f] = body[f] != null ? String(body[f]) : ''; return acc; }, {});

app.post('/api/admin/outdoors', requireAdmin, async (req, res) => {
    const data = pick(req.body || {});
    if (!data.NUM_PLACA) return res.status(400).json({ error: 'NUM_PLACA é obrigatório' });
    if (!data.TIPO) return res.status(400).json({ error: 'TIPO é obrigatório' });
    try {
        const existing = await outdoorDb.execute({ sql: 'SELECT id FROM outdoorsinfo WHERE NUM_PLACA = ?', args: [data.NUM_PLACA] });
        if (existing.rows[0]) {
            const id = existing.rows[0].id;
            await outdoorDb.execute({
                sql: `UPDATE outdoorsinfo SET TIPO=?, ENDERECO=?, SENTIDO=?, LATITUDE=?, LONGITUDE=?, LINK=?, GABARITO=?, FOTO_URL=? WHERE id=?`,
                args: [data.TIPO, data.ENDERECO, data.SENTIDO, data.LATITUDE, data.LONGITUDE, data.LINK, data.GABARITO, data.FOTO_URL, id],
            });
            return res.json({ ok: true, id: Number(id), action: 'updated' });
        }
        const ins = await outdoorDb.execute({
            sql: `INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: FIELDS.map((f) => data[f]),
        });
        res.json({ ok: true, id: Number(ins.lastInsertRowid), action: 'created' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/admin/outdoors/:id', requireAdmin, async (req, res) => {
    try {
        const r = await outdoorDb.execute({ sql: 'DELETE FROM outdoorsinfo WHERE id = ?', args: [req.params.id] });
        res.json({ ok: true, deleted: r.rowsAffected });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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
    outdoorDb.execute({ sql: 'UPDATE outdoorsinfo SET FOTO_URL = ? WHERE NUM_PLACA = ?', args: [filename, numPlaca] })
        .then((r) => res.json({ ok: true, foto_url: filename, updated: r.rowsAffected, ephemeral: isRemoteOutdoors }))
        .catch((e) => res.status(500).json({ error: e.message }));
});

app.post('/api/admin/photo-url', requireAdmin, async (req, res) => {
    const numPlaca = String((req.body || {}).num_placa || '').trim();
    const fotoUrl = String((req.body || {}).foto_url || '').trim();
    if (!numPlaca) return res.status(400).json({ error: 'num_placa é obrigatório' });
    if (!fotoUrl) return res.status(400).json({ error: 'foto_url é obrigatório' });
    if (!/^https?:\/\//i.test(fotoUrl)) return res.status(400).json({ error: 'foto_url deve ser uma URL https' });
    try {
        const r = await outdoorDb.execute({
            sql: 'UPDATE outdoorsinfo SET FOTO_URL = ? WHERE NUM_PLACA = ?',
            args: [fotoUrl, numPlaca],
        });
        res.json({ ok: true, foto_url: fotoUrl, updated: r.rowsAffected });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/import-xlsx', requireAdmin, uploadXlsx.single('xlsx'), async (req, res) => {
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

    try {
        const existingRes = await outdoorDb.execute('SELECT id, NUM_PLACA, FOTO_URL, LINK, GABARITO FROM outdoorsinfo');
        const existing = new Map(existingRes.rows.map((r) => [r.NUM_PLACA, r]));
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

        let added = 0, updated = 0, removed = 0;
        const batch = [];
        for (const [num, rec] of records) {
            const ex = existing.get(num);
            if (ex) {
                const foto = ex.FOTO_URL || findPhoto(num, rec.TIPO);
                const link = rec.LINK || ex.LINK || '';
                const gabarito = rec.GABARITO || ex.GABARITO || '';
                batch.push({
                    sql: `UPDATE outdoorsinfo SET TIPO=?, ENDERECO=?, SENTIDO=?, LATITUDE=?, LONGITUDE=?, LINK=?, GABARITO=?, FOTO_URL=? WHERE id=?`,
                    args: [rec.TIPO, rec.ENDERECO, rec.SENTIDO, rec.LATITUDE, rec.LONGITUDE, link, gabarito, foto, ex.id],
                });
                updated++;
            } else {
                const foto = findPhoto(num, rec.TIPO);
                batch.push({
                    sql: `INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    args: [rec.NUM_PLACA, rec.TIPO, rec.ENDERECO, rec.SENTIDO, rec.LATITUDE, rec.LONGITUDE, rec.LINK, rec.GABARITO, foto],
                });
                added++;
            }
        }
        for (const [num, ex] of existing) {
            if (!newKeys.has(num)) {
                batch.push({ sql: 'DELETE FROM outdoorsinfo WHERE id = ?', args: [ex.id] });
                removed++;
            }
        }
        await outdoorDb.batch(batch, 'write');
        res.json({ ok: true, added, updated, removed, total: records.size });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/export-xlsx', requireAdmin, async (req, res) => {
    try {
        const r = await outdoorDb.execute('SELECT NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO, FOTO_URL FROM outdoorsinfo ORDER BY CAST(NUM_PLACA AS INTEGER), NUM_PLACA');
        const rows = r.rows;
        const groups = { 'PADRÃO': [], 'FRONT': [], 'LEDS': [], 'RODOVIARIO': [] };
        for (const row of rows) {
            const t = String(row.TIPO || '').toUpperCase();
            if (t === 'PADRÃO' || t === 'PADRAO') groups['PADRÃO'].push(row);
            else if (t.includes('LED')) groups['LEDS'].push(row);
            else if (t.includes('RODOVIARIO') || t.includes('RODOVIÁRIO')) groups['RODOVIARIO'].push(row);
            else groups['FRONT'].push(row);
        }
        const wb = XLSX.utils.book_new();
        for (const [name, list] of Object.entries(groups)) {
            const header = ['Nº PLACA', 'TIPO', 'ENDEREÇO', 'SENTIDO', 'LONGITUDE', 'LATITUDE', 'LINK', 'GABARITO', 'FOTO_URL'];
            const data = [header, ...list.map((row) => [row.NUM_PLACA, row.TIPO, row.ENDERECO, row.SENTIDO, row.LATITUDE, row.LONGITUDE, row.LINK, row.GABARITO, row.FOTO_URL])];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), name);
        }
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="placas-bigdooh.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/status', requireAdmin, (req, res) => {
    const cloudName = cleanEnv(process.env.CLOUDINARY_CLOUD_NAME);
    const preset = cleanEnv(process.env.CLOUDINARY_UPLOAD_PRESET);
    const hasCloudinary = !!(cloudName && preset);
    res.json({
        outdoorsBackend: isRemoteOutdoors ? 'turso' : 'local-file',
        photoStorage: hasCloudinary ? 'cloudinary' : 'local-disk',
        photoPersistent: hasCloudinary || process.env.NODE_ENV === 'development',
        cloudinary: hasCloudinary ? { cloud_name: cloudName, upload_preset: preset } : null,
    });
});

// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'localizacoes.html'));
});

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Outdoors backend: ${isRemoteOutdoors ? 'Turso (remote)' : 'arquivo local'}`);
});
