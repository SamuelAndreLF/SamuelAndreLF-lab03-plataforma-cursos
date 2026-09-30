// Catálogo: categorias, cursos, módulos e aulas.
//
// Regra de papel: ler é livre para qualquer usuário logado; criar, editar e
// apagar é só de admin. É a separação que o LAB03 não tinha — lá qualquer um
// mexia em tudo, porque não existia login.

const express = require('express');
const db = require('../db');
const { exigirLogin, exigirAdmin } = require('../middleware/auth');

const router = express.Router();
const soAdmin = [exigirLogin, exigirAdmin];

// Recalcula total_aulas e total_horas do curso a partir das aulas cadastradas.
// Esses dois campos existiam no LAB03 como texto digitado à mão, e viviam
// desatualizados. Aqui eles são derivados: ninguém informa, o banco soma.
function recontarCurso(idCurso) {
  db.prepare(`
    UPDATE cursos SET
      total_aulas = (
        SELECT COUNT(*) FROM aulas a
        JOIN modulos m ON m.id = a.id_modulo
        WHERE m.id_curso = ?
      ),
      total_horas = (
        SELECT COALESCE(SUM(a.duracao_minutos), 0) / 60.0 FROM aulas a
        JOIN modulos m ON m.id = a.id_modulo
        WHERE m.id_curso = ?
      )
    WHERE id = ?
  `).run(idCurso, idCurso, idCurso);
}

function cursoDoModulo(idModulo) {
  const linha = db.prepare('SELECT id_curso FROM modulos WHERE id = ?').get(idModulo);
  return linha ? linha.id_curso : null;
}

// ── Categorias ────────────────────────────────────────────────────────────

router.get('/categorias', exigirLogin, (_req, res) => {
  res.json(db.prepare('SELECT * FROM categorias ORDER BY nome').all());
});

router.post('/categorias', soAdmin, (req, res) => {
  const { nome, descricao } = req.body || {};
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  try {
    const info = db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)').run(nome, descricao || null);
    res.status(201).json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Já existe categoria com esse nome' });
    throw e;
  }
});

router.put('/categorias/:id', soAdmin, (req, res) => {
  const { nome, descricao } = req.body || {};
  const atual = db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id);
  if (!atual) return res.status(404).json({ error: 'Categoria não encontrada' });

  db.prepare('UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?')
    .run(nome ?? atual.nome, descricao ?? atual.descricao, req.params.id);

  res.json(db.prepare('SELECT * FROM categorias WHERE id = ?').get(req.params.id));
});

router.delete('/categorias/:id', soAdmin, (req, res) => {
  const emUso = db.prepare('SELECT COUNT(*) AS n FROM cursos WHERE id_categoria = ?').get(req.params.id).n;
  if (emUso) return res.status(409).json({ error: 'Categoria tem cursos ligados a ela' });

  const info = db.prepare('DELETE FROM categorias WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.status(204).end();
});

// ── Cursos ────────────────────────────────────────────────────────────────

router.get('/cursos', exigirLogin, (req, res) => {
  const { categoria, nivel } = req.query;

  const filtros = [];
  const valores = [];
  if (categoria) { filtros.push('c.id_categoria = ?'); valores.push(categoria); }
  if (nivel) { filtros.push('c.nivel = ?'); valores.push(nivel); }
  const onde = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  res.json(db.prepare(`
    SELECT c.*, cat.nome AS categoria, u.nome_completo AS instrutor,
           (SELECT ROUND(AVG(nota), 2) FROM avaliacoes WHERE id_curso = c.id) AS nota_media
    FROM cursos c
    JOIN categorias cat ON cat.id = c.id_categoria
    JOIN usuarios   u   ON u.id   = c.id_instrutor
    ${onde}
    ORDER BY c.titulo
  `).all(...valores));
});

router.get('/cursos/:id', exigirLogin, (req, res) => {
  const curso = db.prepare(`
    SELECT c.*, cat.nome AS categoria, u.nome_completo AS instrutor
    FROM cursos c
    JOIN categorias cat ON cat.id = c.id_categoria
    JOIN usuarios   u   ON u.id   = c.id_instrutor
    WHERE c.id = ?
  `).get(req.params.id);

  if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });

  // O curso vem com a árvore inteira: é o que a tela de aula precisa, e
  // pedir módulos e aulas em requisições separadas só multiplicaria idas ao
  // servidor para montar a mesma coisa.
  curso.modulos = db.prepare('SELECT * FROM modulos WHERE id_curso = ? ORDER BY ordem').all(curso.id);
  for (const modulo of curso.modulos) {
    modulo.aulas = db.prepare('SELECT * FROM aulas WHERE id_modulo = ? ORDER BY ordem').all(modulo.id);
  }

  res.json(curso);
});

router.post('/cursos', soAdmin, (req, res) => {
  const { titulo, descricao, idInstrutor, idCategoria, nivel, dataPublicacao } = req.body || {};

  if (!titulo || !idCategoria || !nivel) {
    return res.status(400).json({ error: 'titulo, idCategoria e nivel são obrigatórios' });
  }

  // Sem instrutor informado, o admin que está criando assume o curso.
  const instrutor = idInstrutor || req.usuario.id;

  try {
    const info = db.prepare(`
      INSERT INTO cursos (titulo, descricao, id_instrutor, id_categoria, nivel, data_publicacao)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, date('now')))
    `).run(titulo, descricao || null, instrutor, idCategoria, nivel, dataPublicacao || null);

    res.status(201).json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('FOREIGN KEY')) {
      return res.status(400).json({ error: 'idInstrutor ou idCategoria não existe' });
    }
    if (String(e.message).includes('CHECK')) {
      return res.status(400).json({ error: 'nivel deve ser Iniciante, Intermediário ou Avançado' });
    }
    throw e;
  }
});

router.put('/cursos/:id', soAdmin, (req, res) => {
  const atual = db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id);
  if (!atual) return res.status(404).json({ error: 'Curso não encontrado' });

  const { titulo, descricao, idInstrutor, idCategoria, nivel } = req.body || {};

  db.prepare(`
    UPDATE cursos SET titulo = ?, descricao = ?, id_instrutor = ?, id_categoria = ?, nivel = ?
    WHERE id = ?
  `).run(
    titulo ?? atual.titulo,
    descricao ?? atual.descricao,
    idInstrutor ?? atual.id_instrutor,
    idCategoria ?? atual.id_categoria,
    nivel ?? atual.nivel,
    req.params.id,
  );

  res.json(db.prepare('SELECT * FROM cursos WHERE id = ?').get(req.params.id));
});

router.delete('/cursos/:id', soAdmin, (req, res) => {
  const info = db.prepare('DELETE FROM cursos WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Curso não encontrado' });
  res.status(204).end();
});

// ── Módulos ───────────────────────────────────────────────────────────────

router.get('/cursos/:id/modulos', exigirLogin, (req, res) => {
  res.json(db.prepare('SELECT * FROM modulos WHERE id_curso = ? ORDER BY ordem').all(req.params.id));
});

router.post('/modulos', soAdmin, (req, res) => {
  const { idCurso, titulo, ordem } = req.body || {};
  if (!idCurso || !titulo) return res.status(400).json({ error: 'idCurso e titulo são obrigatórios' });

  try {
    const info = db.prepare('INSERT INTO modulos (id_curso, titulo, ordem) VALUES (?, ?, ?)')
      .run(idCurso, titulo, ordem || 1);
    res.status(201).json(db.prepare('SELECT * FROM modulos WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('FOREIGN KEY')) return res.status(400).json({ error: 'idCurso não existe' });
    throw e;
  }
});

router.delete('/modulos/:id', soAdmin, (req, res) => {
  const idCurso = cursoDoModulo(req.params.id);
  const info = db.prepare('DELETE FROM modulos WHERE id = ?').run(req.params.id);
  if (!info.changes) return res.status(404).json({ error: 'Módulo não encontrado' });
  if (idCurso) recontarCurso(idCurso);
  res.status(204).end();
});

// ── Aulas ─────────────────────────────────────────────────────────────────

router.get('/modulos/:id/aulas', exigirLogin, (req, res) => {
  res.json(db.prepare('SELECT * FROM aulas WHERE id_modulo = ? ORDER BY ordem').all(req.params.id));
});

router.post('/aulas', soAdmin, (req, res) => {
  const { idModulo, titulo, tipoConteudo, urlConteudo, duracaoMinutos, ordem } = req.body || {};

  if (!idModulo || !titulo || !tipoConteudo) {
    return res.status(400).json({ error: 'idModulo, titulo e tipoConteudo são obrigatórios' });
  }

  try {
    const info = db.prepare(`
      INSERT INTO aulas (id_modulo, titulo, tipo_conteudo, url_conteudo, duracao_minutos, ordem)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(idModulo, titulo, tipoConteudo, urlConteudo || null, duracaoMinutos || 0, ordem || 1);

    const idCurso = cursoDoModulo(idModulo);
    if (idCurso) recontarCurso(idCurso);

    res.status(201).json(db.prepare('SELECT * FROM aulas WHERE id = ?').get(info.lastInsertRowid));
  } catch (e) {
    if (String(e.message).includes('FOREIGN KEY')) return res.status(400).json({ error: 'idModulo não existe' });
    if (String(e.message).includes('CHECK')) return res.status(400).json({ error: 'tipoConteudo deve ser Vídeo, Texto ou Quiz' });
    throw e;
  }
});

router.delete('/aulas/:id', soAdmin, (req, res) => {
  const aula = db.prepare('SELECT id_modulo FROM aulas WHERE id = ?').get(req.params.id);
  if (!aula) return res.status(404).json({ error: 'Aula não encontrada' });

  db.prepare('DELETE FROM aulas WHERE id = ?').run(req.params.id);
  const idCurso = cursoDoModulo(aula.id_modulo);
  if (idCurso) recontarCurso(idCurso);

  res.status(204).end();
});

module.exports = router;
