// Banco SQLite em arquivo único.
//
// O LAB03 guardava tudo em memória: as classes de js/classes.js viviam num
// objeto `dados` que sumia ao recarregar a página. O esquema abaixo é a mesma
// modelagem, agora em tabelas — por isso os nomes das colunas seguem os nomes
// dos atributos das classes originais, em snake_case.
//
// As chaves estrangeiras ficam LIGADAS de propósito. O SQLite as ignora por
// padrão, e sem isso daria para matricular um aluno num curso inexistente —
// justamente o tipo de inconsistência que a versão em localStorage permitia.

const path = require('node:path');
const Database = require('better-sqlite3');

const arquivo = process.env.DB_FILE || path.join(__dirname, '..', 'cursos.db');
const db = new Database(arquivo);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_completo TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    senha_hash    TEXT    NOT NULL,
    papel         TEXT    NOT NULL DEFAULT 'aluno' CHECK (papel IN ('admin', 'aluno')),
    data_cadastro TEXT    NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS categorias (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL UNIQUE,
    descricao TEXT
  );

  CREATE TABLE IF NOT EXISTS cursos (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo           TEXT    NOT NULL,
    descricao        TEXT,
    id_instrutor     INTEGER NOT NULL REFERENCES usuarios(id),
    id_categoria     INTEGER NOT NULL REFERENCES categorias(id),
    nivel            TEXT    NOT NULL CHECK (nivel IN ('Iniciante', 'Intermediário', 'Avançado')),
    data_publicacao  TEXT    NOT NULL DEFAULT (date('now')),
    total_aulas      INTEGER NOT NULL DEFAULT 0,
    total_horas      REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS modulos (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    id_curso INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    titulo   TEXT    NOT NULL,
    ordem    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS aulas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    id_modulo        INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    titulo           TEXT    NOT NULL,
    tipo_conteudo    TEXT    NOT NULL CHECK (tipo_conteudo IN ('Vídeo', 'Texto', 'Quiz')),
    url_conteudo     TEXT,
    duracao_minutos  INTEGER NOT NULL DEFAULT 0,
    ordem            INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS matriculas (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_curso        INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    data_matricula  TEXT    NOT NULL DEFAULT (date('now')),
    data_conclusao  TEXT,
    UNIQUE (id_usuario, id_curso)
  );

  CREATE TABLE IF NOT EXISTS progresso_aulas (
    id_usuario      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_aula         INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    status          TEXT    NOT NULL CHECK (status IN ('Não iniciado', 'Em andamento', 'Concluído')),
    data_conclusao  TEXT,
    PRIMARY KEY (id_usuario, id_aula)
  );

  CREATE TABLE IF NOT EXISTS avaliacoes (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario      INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_curso        INTEGER NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    nota            REAL    NOT NULL CHECK (nota >= 0 AND nota <= 5),
    comentario      TEXT,
    data_avaliacao  TEXT    NOT NULL DEFAULT (date('now')),
    UNIQUE (id_usuario, id_curso)
  );

  CREATE TABLE IF NOT EXISTS trilhas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo       TEXT    NOT NULL,
    descricao    TEXT,
    id_categoria INTEGER NOT NULL REFERENCES categorias(id)
  );

  CREATE TABLE IF NOT EXISTS trilhas_cursos (
    id_trilha INTEGER NOT NULL REFERENCES trilhas(id) ON DELETE CASCADE,
    id_curso  INTEGER NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
    ordem     INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (id_trilha, id_curso)
  );

  CREATE TABLE IF NOT EXISTS planos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nome           TEXT    NOT NULL UNIQUE,
    descricao      TEXT,
    preco          REAL    NOT NULL CHECK (preco >= 0),
    duracao_meses  INTEGER NOT NULL CHECK (duracao_meses > 0)
  );

  CREATE TABLE IF NOT EXISTS assinaturas (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_plano    INTEGER NOT NULL REFERENCES planos(id),
    data_inicio TEXT    NOT NULL,
    data_fim    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pagamentos (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    id_assinatura          INTEGER NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
    valor_pago             REAL    NOT NULL CHECK (valor_pago >= 0),
    data_pagamento         TEXT    NOT NULL DEFAULT (date('now')),
    metodo_pagamento       TEXT    NOT NULL,
    id_transacao_gateway   TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS certificados (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario           INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_curso             INTEGER NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
    id_trilha            INTEGER          REFERENCES trilhas(id),
    codigo_verificacao   TEXT    NOT NULL UNIQUE,
    data_emissao         TEXT    NOT NULL DEFAULT (date('now'))
  );
`);

module.exports = db;
