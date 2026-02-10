from pathlib import Path
import sqlite3

# Define o caminho do arquivo CSV
path_file = Path(__file__).parent / 'data' / 'bigsemanas.csv'

# Verifica se o arquivo CSV existe
if not path_file.is_file():
    print(f"ERROR: O arquivo {path_file} não foi encontrado.")
    exit(1)

# Define o caminho do banco de dados
db_path = Path(__file__).parent / 'database' / 'semanasbanco.db'

# Verifica se o banco de dados já existe
if db_path.is_file():
    print(f"Banco de dados já existe em {db_path}. Nenhuma ação necessária.")
else:
    print(f"Criando banco de dados em {db_path}...")

# Conecta ao banco de dados (cria o arquivo se não existir)
with sqlite3.connect(db_path) as conn:
    cursor = conn.cursor()

    # Cria a tabela apenas se ela não existir
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bigsemana (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        BIGSEMANA TEXT,
        INÍCIO TEXT,
        TÉRMINO TEXT    
    )
    ''')
    conn.commit()

    # Verifica se a tabela está vazia
    cursor.execute("SELECT COUNT(*) FROM bigsemana")
    count = cursor.fetchone()[0]

    if count == 0:
        print("A tabela está vazia. Inserindo dados do CSV...")
        # Abre o arquivo CSV
        with open(path_file, "r", encoding='utf-8') as file:
            next(file)  # Ignora a linha do cabeçalho
            
            expected_columns = 3  # Número esperado de colunas

            try:
                for line_number, line in enumerate(file, start=1):
                    data = line.strip().split(",")

                    # Verifica o número de colunas
                    if len(data) < expected_columns:
                        print(f"WARNING: Linha {line_number} tem menos de {expected_columns} colunas e será ignorada.")
                        continue
                    elif len(data) > expected_columns:
                        print(f"WARNING: Linha {line_number} tem mais de {expected_columns} colunas e será cortada.")
                        data = data[:expected_columns]  # Corta as colunas extras

                    # Limpa os dados
                    data = [item.strip().strip('"') for item in data]

                    print(f"Linha {line_number} dados: {data}")  # Mostra os dados

                    # Define os dados a serem inseridos
                    sql = '''
                    INSERT INTO bigsemana (BIGSEMANA, INÍCIO, TÉRMINO)
                    VALUES (?, ?, ?)
                    '''

                    cursor.execute(sql, data)  # Insere os dados na tabela

            except Exception as e:
                print(f"ERROR: {e}")
    else:
        print("A tabela já contém dados. Nenhuma ação necessária.")

    # Finaliza a transação
    conn.commit()
    cursor.close()