// Mostra o conteúdo do banco no terminal.
//
// Existe para a hora em que o professor pede "prova que está gravando", caso
// se prefira o terminal à tela de /banco no navegador.

require('dotenv').config();

const { pool, todos, esperarBanco } = require('../src/db');

const BANCO = process.env.DB_NAME || 'plataforma_cursos';

async function mostrar() {
  await esperarBanco();

  const tabelas = (await todos(
    'SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [BANCO],
  )).map((t) => t.nome);

  for (const tabela of tabelas) {
    const linhas = await todos(`SELECT * FROM \`${tabela}\``);
    console.log(`\n=== ${tabela} (${linhas.length}) ===`);

    if (linhas.length === 0) {
      console.log('  vazia');
      continue;
    }

    // A senha nunca aparece, nem em hash: o terminal costuma ficar projetado
    // na parede durante a apresentação.
    console.table(linhas.map((linha) => {
      const copia = { ...linha };
      if ('senha_hash' in copia) copia.senha_hash = '***';
      return copia;
    }));
  }

  console.log('');
}

mostrar()
  .catch((erro) => {
    console.error('Falhou:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
