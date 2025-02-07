from pathlib import Path
import sqlite3

# Define o caminho do arquivo CSV
path_file = Path(__file__).parent / 'data' / 'data.csv'

# Verifica se o arquivo existe
if not path_file.is_file():
    print(f"ERROR: O arquivo {path_file} não foi encontrado.")
    exit(1)

# Conecta ao banco de dados
with sqlite3.connect(Path(__file__).parent / 'database' / 'banco.db') as conn:
    cursor = conn.cursor()

    # Exclui a tabela se existir
    cursor.execute("DROP TABLE IF EXISTS outdoorsinfo")
    
    # Cria a tabela
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS outdoorsinfo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        NUM_PLACA TEXT,
        TIPO TEXT,
        ENDERECO TEXT,
        SENTIDO TEXT,
        LATITUDE TEXT,
        LONGITUDE TEXT,
        LINK TEXT,
        GABARITO TEXT
    )
    ''')
    
    conn.commit()

    # Abre o arquivo CSV
    with open(path_file, "r", encoding='utf-8') as file:
        next(file)  # Ignora a linha do cabeçalho
        
        expected_columns = 8  # Número esperado de colunas

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
                INSERT INTO outdoorsinfo (NUM_PLACA, TIPO, ENDERECO, SENTIDO, LATITUDE, LONGITUDE, LINK, GABARITO)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                '''

                cursor.execute(sql, data)  # Insere os dados na tabela

        except Exception as e:
            print(f"ERROR: {e}")

    # Finaliza a transação
    conn.commit()
    cursor.close()