import sqlite3

# Conecta ao banco de dados SQLite
conn = sqlite3.connect('backend/database/banco.db')  # Ajuste o caminho conforme necessário
cursor = conn.cursor()

# Adiciona a coluna FOTO_URL se não existir
cursor.execute('''
    ALTER TABLE outdoorsinfo
    ADD COLUMN FOTO_URL TEXT
''')

# Salva as alterações e fecha a conexão
conn.commit()
conn.close()

print("Coluna FOTO_URL adicionada com sucesso!")
