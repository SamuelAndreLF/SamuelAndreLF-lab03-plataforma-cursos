// Popula o banco com dados de exemplo, para a apresentação não começar vazia.
//
// É idempotente: se já existir admin, não faz nada. Rodar duas vezes por
// engano no meio da demo não duplica curso nem cria cobrança repetida.

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../src/db');

const jaTem = db.prepare("SELECT COUNT(*) AS n FROM usuarios").get().n > 0;
if (jaTem) {
  console.log('Banco já tem usuários; nada a fazer. Apague cursos.db para recomeçar do zero.');
  process.exit(0);
}

const semear = db.transaction(() => {
  const senha = bcrypt.hashSync('senha123', 10);

  const admin = db.prepare(
    "INSERT INTO usuarios (nome_completo, email, senha_hash, papel) VALUES (?, ?, ?, 'admin')",
  ).run('Samuel André', 'admin@puc.br', senha).lastInsertRowid;

  db.prepare(
    "INSERT INTO usuarios (nome_completo, email, senha_hash, papel) VALUES (?, ?, ?, 'aluno')",
  ).run('Maria Aluna', 'aluno@puc.br', senha);

  const prog = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)')
    .run('Programação', 'Cursos de desenvolvimento de software').lastInsertRowid;
  db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)')
    .run('Dados', 'Análise e ciência de dados');

  const curso = db.prepare(`
    INSERT INTO cursos (titulo, descricao, id_instrutor, id_categoria, nivel)
    VALUES (?, ?, ?, ?, 'Iniciante')
  `).run('JavaScript do zero', 'Lógica, DOM e consumo de API', admin, prog).lastInsertRowid;

  const modulo = db.prepare('INSERT INTO modulos (id_curso, titulo, ordem) VALUES (?, ?, 1)')
    .run(curso, 'Fundamentos').lastInsertRowid;

  const aulas = [
    ['Variáveis e tipos', 'Vídeo', 18],
    ['Condicionais', 'Vídeo', 22],
    ['Quiz do módulo', 'Quiz', 10],
  ];
  aulas.forEach(([titulo, tipo, minutos], i) => {
    db.prepare(`
      INSERT INTO aulas (id_modulo, titulo, tipo_conteudo, duracao_minutos, ordem)
      VALUES (?, ?, ?, ?, ?)
    `).run(modulo, titulo, tipo, minutos, i + 1);
  });

  // Mesma conta que o servidor faz ao criar aula pela API.
  db.prepare(`
    UPDATE cursos SET total_aulas = ?, total_horas = ? WHERE id = ?
  `).run(aulas.length, aulas.reduce((s, a) => s + a[2], 0) / 60, curso);

  db.prepare('INSERT INTO planos (nome, descricao, preco, duracao_meses) VALUES (?, ?, ?, ?)')
    .run('Mensal', 'Acesso a todos os cursos por 1 mês', 49.9, 1);
  db.prepare('INSERT INTO planos (nome, descricao, preco, duracao_meses) VALUES (?, ?, ?, ?)')
    .run('Anual', 'Acesso a todos os cursos por 12 meses', 399.0, 12);
});

semear();

console.log('Banco populado.');
console.log('  admin@puc.br / senha123   (administrador)');
console.log('  aluno@puc.br / senha123   (aluno)');
