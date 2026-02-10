import os
import sqlite3
from pathlib import Path

# Define o caminho da pasta onde as fotos estão armazenadas
foto_pasta = './imgs-outdoor/'

# Conecta ao banco de dados SQLite
conn = sqlite3.connect(Path(__file__).parent / 'database' / 'banco.db')  # Ajuste o caminho conforme necessário
cursor = conn.cursor()

# Função para associar a foto
def obter_foto_para_outdoor(num_placa):
    foto_nome = f"{num_placa}.jpg"  # Nome da foto com base no NUM_PLACA
    foto_caminho = os.path.join(foto_pasta, foto_nome)
    
    if os.path.exists(foto_caminho):
        return foto_nome  # Retorna o nome da foto se ela existir
    else:
        return None  # Caso a foto não exista, retorna None

# Atualiza a tabela com as fotos
cursor.execute("SELECT NUM_PLACA FROM outdoorsinfo")  # Ajuste conforme necessário
outdoors = cursor.fetchall()

for outdoor in outdoors:
    num_placa = outdoor[0]  # Obtém o NUM_PLACA
    foto_url = obter_foto_para_outdoor(num_placa)  # Obtém a foto correspondente
    
    if foto_url:
        # Atualiza o banco de dados com a foto
        cursor.execute("UPDATE outdoorsinfo SET FOTO_URL = ? WHERE NUM_PLACA = ?", (foto_url, num_placa))
        print(f"Foto do outdoor {num_placa} atualizada para {foto_url}")
    else:
        print(f"Foto do outdoor {num_placa} não encontrada!")

# Finaliza a transação
conn.commit()
conn.close()
