// Banco MySQL.
//
// O LAB03 guardava tudo em memória: as classes de js/classes.js viviam num
// objeto `dados` que sumia ao recarregar a página. O esquema abaixo é a mesma
// modelagem, agora em tabelas — por isso os nomes das colunas seguem os nomes
// dos atributos das classes originais, em snake_case.
//
// A conexão é um POOL, não uma conexão só. Com uma conexão única, dois
// pedidos simultâneos ficariam em fila; e se ela caísse, a aplicação inteira
// perderia o banco até reiniciar. O pool abre várias e repõe o que cair.

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'cursos',
  password: process.env.DB_PASSWORD || 'cursos',
  database: process.env.DB_NAME || 'plataforma_cursos',
  waitForConnections: true,
  connectionLimit: 10,
  // Sem isso o driver devolve DECIMAL como texto, e preço viraria "49.90"
  // em vez de 49.9 no JSON.
  decimalNumbers: true,
  dateStrings: true,
});

// Consulta que devolve várias linhas.
async function todos(sql, params = []) {
  const [linhas] = await pool.query(sql, params);
  return linhas;
}

// Consulta que devolve uma linha só (ou undefined).
async function um(sql, params = []) {
  const linhas = await todos(sql, params);
  return linhas[0];
}

// INSERT, UPDATE e DELETE. Devolve insertId e affectedRows.
async function executar(sql, params = []) {
  const [resultado] = await pool.query(sql, params);
  return resultado;
}

// Roda várias operações como uma transação só: ou todas valem, ou nenhuma.
// A conexão precisa ser a MESMA do começo ao fim, por isso ela é tomada do
// pool e devolvida no final — usar o pool direto aqui abriria conexões
// diferentes e o COMMIT não cobriria o que foi feito nas outras.
async function transacao(trabalho) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await trabalho(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

// Cria as tabelas se ainda não existirem.
//
// A ordem importa: uma tabela que aponta para outra precisa que a outra já
// exista. Por isso usuarios e categorias vêm antes de cursos, e cursos antes
// de modulos.
async function criarEsquema() {
  const comandos = [
    `CREATE TABLE IF NOT EXISTS usuarios (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      nome_completo VARCHAR(150) NOT NULL,
      email         VARCHAR(150) NOT NULL UNIQUE,
      senha_hash    VARCHAR(255) NOT NULL,
      papel         ENUM('admin','aluno') NOT NULL DEFAULT 'aluno',
      data_cadastro DATE NOT NULL DEFAULT (CURRENT_DATE)
    )`,

    `CREATE TABLE IF NOT EXISTS categorias (
      id        INT AUTO_INCREMENT PRIMARY KEY,
      nome      VARCHAR(100) NOT NULL UNIQUE,
      descricao TEXT
    )`,

    `CREATE TABLE IF NOT EXISTS cursos (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      titulo          VARCHAR(150) NOT NULL,
      descricao       TEXT,
      id_instrutor    INT NOT NULL,
      id_categoria    INT NOT NULL,
      nivel           ENUM('Iniciante','Intermediário','Avançado') NOT NULL,
      data_publicacao DATE NOT NULL DEFAULT (CURRENT_DATE),
      total_aulas     INT NOT NULL DEFAULT 0,
      total_horas     DECIMAL(6,2) NOT NULL DEFAULT 0,
      FOREIGN KEY (id_instrutor) REFERENCES usuarios(id),
      FOREIGN KEY (id_categoria) REFERENCES categorias(id)
    )`,

    `CREATE TABLE IF NOT EXISTS modulos (
      id       INT AUTO_INCREMENT PRIMARY KEY,
      id_curso INT NOT NULL,
      titulo   VARCHAR(150) NOT NULL,
      ordem    INT NOT NULL DEFAULT 1,
      FOREIGN KEY (id_curso) REFERENCES cursos(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS aulas (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      id_modulo       INT NOT NULL,
      titulo          VARCHAR(150) NOT NULL,
      tipo_conteudo   ENUM('Vídeo','Texto','Quiz') NOT NULL,
      url_conteudo    VARCHAR(255),
      duracao_minutos INT NOT NULL DEFAULT 0,
      ordem           INT NOT NULL DEFAULT 1,
      FOREIGN KEY (id_modulo) REFERENCES modulos(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS matriculas (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario     INT NOT NULL,
      id_curso       INT NOT NULL,
      data_matricula DATE NOT NULL DEFAULT (CURRENT_DATE),
      data_conclusao DATE NULL,
      UNIQUE KEY uq_matricula (id_usuario, id_curso),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (id_curso)   REFERENCES cursos(id)   ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS progresso_aulas (
      id_usuario     INT NOT NULL,
      id_aula        INT NOT NULL,
      status         ENUM('Não iniciado','Em andamento','Concluído') NOT NULL,
      data_conclusao DATE NULL,
      PRIMARY KEY (id_usuario, id_aula),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (id_aula)    REFERENCES aulas(id)    ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS avaliacoes (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario     INT NOT NULL,
      id_curso       INT NOT NULL,
      nota           DECIMAL(2,1) NOT NULL CHECK (nota >= 0 AND nota <= 5),
      comentario     TEXT,
      data_avaliacao DATE NOT NULL DEFAULT (CURRENT_DATE),
      UNIQUE KEY uq_avaliacao (id_usuario, id_curso),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (id_curso)   REFERENCES cursos(id)   ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS trilhas (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      titulo       VARCHAR(150) NOT NULL,
      descricao    TEXT,
      id_categoria INT NOT NULL,
      FOREIGN KEY (id_categoria) REFERENCES categorias(id)
    )`,

    `CREATE TABLE IF NOT EXISTS trilhas_cursos (
      id_trilha INT NOT NULL,
      id_curso  INT NOT NULL,
      ordem     INT NOT NULL DEFAULT 1,
      PRIMARY KEY (id_trilha, id_curso),
      FOREIGN KEY (id_trilha) REFERENCES trilhas(id) ON DELETE CASCADE,
      FOREIGN KEY (id_curso)  REFERENCES cursos(id)  ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS planos (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      nome          VARCHAR(100) NOT NULL UNIQUE,
      descricao     TEXT,
      preco         DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
      duracao_meses INT NOT NULL CHECK (duracao_meses > 0)
    )`,

    `CREATE TABLE IF NOT EXISTS assinaturas (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario  INT NOT NULL,
      id_plano    INT NOT NULL,
      data_inicio DATE NOT NULL,
      data_fim    DATE NOT NULL,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (id_plano)   REFERENCES planos(id)
    )`,

    `CREATE TABLE IF NOT EXISTS pagamentos (
      id                   INT AUTO_INCREMENT PRIMARY KEY,
      id_assinatura        INT NOT NULL,
      valor_pago           DECIMAL(10,2) NOT NULL CHECK (valor_pago >= 0),
      data_pagamento       DATE NOT NULL DEFAULT (CURRENT_DATE),
      metodo_pagamento     VARCHAR(60) NOT NULL,
      id_transacao_gateway VARCHAR(40) NOT NULL,
      FOREIGN KEY (id_assinatura) REFERENCES assinaturas(id) ON DELETE CASCADE
    )`,

    `CREATE TABLE IF NOT EXISTS certificados (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario         INT NOT NULL,
      id_curso           INT NOT NULL,
      id_trilha          INT NULL,
      codigo_verificacao VARCHAR(20) NOT NULL UNIQUE,
      data_emissao       DATE NOT NULL DEFAULT (CURRENT_DATE),
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
      FOREIGN KEY (id_curso)   REFERENCES cursos(id)   ON DELETE CASCADE,
      FOREIGN KEY (id_trilha)  REFERENCES trilhas(id)
    )`,
  ];

  for (const comando of comandos) await pool.query(comando);
}

// O MySQL num contêiner demora alguns segundos a aceitar conexão depois que
// o Docker diz que o contêiner subiu. Sem esta espera, a API morreria na
// primeira tentativa e seria preciso reiniciar à mão.
async function esperarBanco(tentativas = 30) {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (erro) {
      if (i === tentativas) throw erro;
      console.log(`  aguardando o MySQL... (${i}/${tentativas})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

module.exports = { pool, todos, um, executar, transacao, criarEsquema, esperarBanco };
