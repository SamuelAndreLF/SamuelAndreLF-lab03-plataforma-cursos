// Popula o banco com dados de exemplo, para a apresentação não começar vazia.
//
// É idempotente: se já existir usuário, não faz nada. Rodar duas vezes por
// engano no meio da demo não duplica curso nem cria cobrança repetida.

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { pool, um, executar, esperarBanco, criarEsquema } = require('../src/db');

async function semear() {
  await esperarBanco();
  await criarEsquema();

  const { n } = await um('SELECT COUNT(*) AS n FROM usuarios');
  if (n > 0) {
    console.log('Banco já tem usuários; nada a fazer.');
    console.log('Para recomeçar do zero: docker compose down -v && docker compose up -d banco');
    return;
  }

  const senha = bcrypt.hashSync('senha123', 10);

  const admin = (await executar(
    "INSERT INTO usuarios (nome_completo, email, senha_hash, papel) VALUES (?, ?, ?, 'admin')",
    ['Samuel André', 'admin@puc.br', senha],
  )).insertId;

  await executar(
    "INSERT INTO usuarios (nome_completo, email, senha_hash, papel) VALUES (?, ?, ?, 'aluno')",
    ['Maria Aluna', 'aluno@puc.br', senha],
  );

  const prog = (await executar('INSERT INTO categorias (nome, descricao) VALUES (?, ?)',
    ['Programação', 'Cursos de desenvolvimento de software'])).insertId;
  await executar('INSERT INTO categorias (nome, descricao) VALUES (?, ?)',
    ['Dados', 'Análise e ciência de dados']);

  const curso = (await executar(
    `INSERT INTO cursos (titulo, descricao, id_instrutor, id_categoria, nivel)
     VALUES (?, ?, ?, ?, 'Iniciante')`,
    ['JavaScript do zero', 'Lógica, DOM e consumo de API', admin, prog],
  )).insertId;

  const modulo = (await executar('INSERT INTO modulos (id_curso, titulo, ordem) VALUES (?, ?, 1)',
    [curso, 'Fundamentos'])).insertId;

  const aulas = [
    ['Variáveis e tipos', 'Vídeo', 18],
    ['Condicionais', 'Vídeo', 22],
    ['Quiz do módulo', 'Quiz', 10],
  ];
  for (let i = 0; i < aulas.length; i += 1) {
    const [titulo, tipo, minutos] = aulas[i];
    await executar(
      `INSERT INTO aulas (id_modulo, titulo, tipo_conteudo, duracao_minutos, ordem)
       VALUES (?, ?, ?, ?, ?)`,
      [modulo, titulo, tipo, minutos, i + 1],
    );
  }

  // Mesma conta que o servidor faz ao criar aula pela API.
  await executar('UPDATE cursos SET total_aulas = ?, total_horas = ? WHERE id = ?',
    [aulas.length, aulas.reduce((s, a) => s + a[2], 0) / 60, curso]);

  await executar('INSERT INTO planos (nome, descricao, preco, duracao_meses) VALUES (?, ?, ?, ?)',
    ['Mensal', 'Acesso a todos os cursos por 1 mês', 49.9, 1]);
  await executar('INSERT INTO planos (nome, descricao, preco, duracao_meses) VALUES (?, ?, ?, ?)',
    ['Anual', 'Acesso a todos os cursos por 12 meses', 399.0, 12]);

  console.log('Banco populado.');
  console.log('  admin@puc.br / senha123   (administrador)');
  console.log('  aluno@puc.br / senha123   (aluno)');
}

semear()
  .catch((erro) => {
    console.error('Falhou:', erro.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
