// Catálogo: categorias, cursos, módulos e aulas.
//
// Regra de papel: ler é livre para qualquer usuário logado; criar, editar e
// apagar é só de admin. É a separação que o LAB03 não tinha — lá qualquer um
// mexia em tudo, porque não existia login.

const express = require('express');
const { todos, um, executar } = require('../db');
const { exigirLogin, exigirAdmin } = require('../middleware/auth');

const router = express.Router();
const soAdmin = [exigirLogin, exigirAdmin];

// Recalcula total_aulas e total_horas do curso a partir das aulas cadastradas.
// Esses dois campos existiam no LAB03 como texto digitado à mão, e viviam
// desatualizados. Aqui eles são derivados: ninguém informa, o banco soma.
async function recontarCurso(idCurso) {
  await executar(`
    UPDATE cursos c SET
      c.total_aulas = (
        SELECT COUNT(*) FROM aulas a JOIN modulos m ON m.id = a.id_modulo WHERE m.id_curso = c.id
      ),
      c.total_horas = (
        SELECT COALESCE(SUM(a.duracao_minutos), 0) / 60 FROM aulas a
        JOIN modulos m ON m.id = a.id_modulo WHERE m.id_curso = c.id
      )
    WHERE c.id = ?
  `, [idCurso]);
}

async function cursoDoModulo(idModulo) {
  const linha = await um('SELECT id_curso FROM modulos WHERE id = ?', [idModulo]);
  return linha ? linha.id_curso : null;
}

// ── Categorias ────────────────────────────────────────────────────────────

router.get('/categorias', exigirLogin, async (_req, res) => {
  res.json(await todos('SELECT * FROM categorias ORDER BY nome'));
});

router.post('/categorias', soAdmin, async (req, res) => {
  const { nome, descricao } = req.body || {};
  if (!nome) return res.status(400).json({ error: 'nome é obrigatório' });

  try {
    const r = await executar('INSERT INTO categorias (nome, descricao) VALUES (?, ?)', [nome, descricao || null]);
    res.status(201).json(await um('SELECT * FROM categorias WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Já existe categoria com esse nome' });
    throw e;
  }
});

router.put('/categorias/:id', soAdmin, async (req, res) => {
  const atual = await um('SELECT * FROM categorias WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ error: 'Categoria não encontrada' });

  const { nome, descricao } = req.body || {};
  await executar('UPDATE categorias SET nome = ?, descricao = ? WHERE id = ?',
    [nome ?? atual.nome, descricao ?? atual.descricao, req.params.id]);

  res.json(await um('SELECT * FROM categorias WHERE id = ?', [req.params.id]));
});

router.delete('/categorias/:id', soAdmin, async (req, res) => {
  const { n } = await um('SELECT COUNT(*) AS n FROM cursos WHERE id_categoria = ?', [req.params.id]);
  if (n) return res.status(409).json({ error: 'Categoria tem cursos ligados a ela' });

  const r = await executar('DELETE FROM categorias WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Categoria não encontrada' });
  res.status(204).end();
});

// ── Cursos ────────────────────────────────────────────────────────────────

router.get('/cursos', exigirLogin, async (req, res) => {
  const { categoria, nivel } = req.query;

  const filtros = [];
  const valores = [];
  if (categoria) { filtros.push('c.id_categoria = ?'); valores.push(categoria); }
  if (nivel) { filtros.push('c.nivel = ?'); valores.push(nivel); }
  const onde = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

  res.json(await todos(`
    SELECT c.*, cat.nome AS categoria, u.nome_completo AS instrutor,
           (SELECT ROUND(AVG(nota), 2) FROM avaliacoes WHERE id_curso = c.id) AS nota_media
    FROM cursos c
    JOIN categorias cat ON cat.id = c.id_categoria
    JOIN usuarios   u   ON u.id   = c.id_instrutor
    ${onde}
    ORDER BY c.titulo
  `, valores));
});

router.get('/cursos/:id', exigirLogin, async (req, res) => {
  const curso = await um(`
    SELECT c.*, cat.nome AS categoria, u.nome_completo AS instrutor
    FROM cursos c
    JOIN categorias cat ON cat.id = c.id_categoria
    JOIN usuarios   u   ON u.id   = c.id_instrutor
    WHERE c.id = ?
  `, [req.params.id]);

  if (!curso) return res.status(404).json({ error: 'Curso não encontrado' });

  // O curso vem com a árvore inteira: é o que a tela de aula precisa, e pedir
  // módulos e aulas em requisições separadas só multiplicaria idas ao servidor
  // para montar a mesma coisa.
  curso.modulos = await todos('SELECT * FROM modulos WHERE id_curso = ? ORDER BY ordem', [curso.id]);
  for (const modulo of curso.modulos) {
    modulo.aulas = await todos('SELECT * FROM aulas WHERE id_modulo = ? ORDER BY ordem', [modulo.id]);
  }

  res.json(curso);
});

router.post('/cursos', soAdmin, async (req, res) => {
  const { titulo, descricao, idInstrutor, idCategoria, nivel, dataPublicacao } = req.body || {};

  if (!titulo || !idCategoria || !nivel) {
    return res.status(400).json({ error: 'titulo, idCategoria e nivel são obrigatórios' });
  }

  // Sem instrutor informado, o admin que está criando assume o curso.
  const instrutor = idInstrutor || req.usuario.id;

  try {
    const r = await executar(`
      INSERT INTO cursos (titulo, descricao, id_instrutor, id_categoria, nivel, data_publicacao)
      VALUES (?, ?, ?, ?, ?, COALESCE(?, CURRENT_DATE))
    `, [titulo, descricao || null, instrutor, idCategoria, nivel, dataPublicacao || null]);

    res.status(201).json(await um('SELECT * FROM cursos WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'idInstrutor ou idCategoria não existe' });
    if (e.code === 'WARN_DATA_TRUNCATED' || e.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'nivel deve ser Iniciante, Intermediário ou Avançado' });
    }
    throw e;
  }
});

router.put('/cursos/:id', soAdmin, async (req, res) => {
  const atual = await um('SELECT * FROM cursos WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ error: 'Curso não encontrado' });

  const { titulo, descricao, idInstrutor, idCategoria, nivel } = req.body || {};

  await executar(`
    UPDATE cursos SET titulo = ?, descricao = ?, id_instrutor = ?, id_categoria = ?, nivel = ? WHERE id = ?
  `, [
    titulo ?? atual.titulo,
    descricao ?? atual.descricao,
    idInstrutor ?? atual.id_instrutor,
    idCategoria ?? atual.id_categoria,
    nivel ?? atual.nivel,
    req.params.id,
  ]);

  res.json(await um('SELECT * FROM cursos WHERE id = ?', [req.params.id]));
});

router.delete('/cursos/:id', soAdmin, async (req, res) => {
  const r = await executar('DELETE FROM cursos WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Curso não encontrado' });
  res.status(204).end();
});

// ── Módulos ───────────────────────────────────────────────────────────────

router.get('/cursos/:id/modulos', exigirLogin, async (req, res) => {
  res.json(await todos('SELECT * FROM modulos WHERE id_curso = ? ORDER BY ordem', [req.params.id]));
});

router.post('/modulos', soAdmin, async (req, res) => {
  const { idCurso, titulo, ordem } = req.body || {};
  if (!idCurso || !titulo) return res.status(400).json({ error: 'idCurso e titulo são obrigatórios' });

  try {
    const r = await executar('INSERT INTO modulos (id_curso, titulo, ordem) VALUES (?, ?, ?)',
      [idCurso, titulo, ordem || 1]);
    res.status(201).json(await um('SELECT * FROM modulos WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'idCurso não existe' });
    throw e;
  }
});

router.delete('/modulos/:id', soAdmin, async (req, res) => {
  const idCurso = await cursoDoModulo(req.params.id);
  const r = await executar('DELETE FROM modulos WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Módulo não encontrado' });
  if (idCurso) await recontarCurso(idCurso);
  res.status(204).end();
});

// ── Aulas ─────────────────────────────────────────────────────────────────

router.get('/modulos/:id/aulas', exigirLogin, async (req, res) => {
  res.json(await todos('SELECT * FROM aulas WHERE id_modulo = ? ORDER BY ordem', [req.params.id]));
});

router.post('/aulas', soAdmin, async (req, res) => {
  const { idModulo, titulo, tipoConteudo, urlConteudo, duracaoMinutos, ordem } = req.body || {};

  if (!idModulo || !titulo || !tipoConteudo) {
    return res.status(400).json({ error: 'idModulo, titulo e tipoConteudo são obrigatórios' });
  }

  try {
    const r = await executar(`
      INSERT INTO aulas (id_modulo, titulo, tipo_conteudo, url_conteudo, duracao_minutos, ordem)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [idModulo, titulo, tipoConteudo, urlConteudo || null, duracaoMinutos || 0, ordem || 1]);

    const idCurso = await cursoDoModulo(idModulo);
    if (idCurso) await recontarCurso(idCurso);

    res.status(201).json(await um('SELECT * FROM aulas WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'idModulo não existe' });
    if (e.code === 'WARN_DATA_TRUNCATED' || e.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'tipoConteudo deve ser Vídeo, Texto ou Quiz' });
    }
    throw e;
  }
});

router.delete('/aulas/:id', soAdmin, async (req, res) => {
  const aula = await um('SELECT id_modulo FROM aulas WHERE id = ?', [req.params.id]);
  if (!aula) return res.status(404).json({ error: 'Aula não encontrada' });

  await executar('DELETE FROM aulas WHERE id = ?', [req.params.id]);
  const idCurso = await cursoDoModulo(aula.id_modulo);
  if (idCurso) await recontarCurso(idCurso);

  res.status(204).end();
});

module.exports = router;
