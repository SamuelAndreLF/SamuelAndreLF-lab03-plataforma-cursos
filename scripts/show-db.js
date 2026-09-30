// Mostra o conteúdo do banco no terminal.
//
// Existe para a hora em que o professor pede "prova que está gravando": em vez
// de abrir um programa de SQLite, roda-se `npm run banco` e aparecem as
// tabelas com as linhas reais.

require('dotenv').config();

const db = require('../src/db');

const tabelas = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all()
  .map((t) => t.name);

for (const tabela of tabelas) {
  const linhas = db.prepare(`SELECT * FROM ${tabela}`).all();
  console.log(`\n=== ${tabela} (${linhas.length}) ===`);

  if (linhas.length === 0) {
    console.log('  vazia');
    continue;
  }

  // A senha nunca aparece, nem em hash: o terminal costuma ficar projetado na
  // parede durante a apresentação.
  const limpas = linhas.map((linha) => {
    const copia = { ...linha };
    if ('senha_hash' in copia) copia.senha_hash = '***';
    return copia;
  });

  console.table(limpas);
}

console.log('');
