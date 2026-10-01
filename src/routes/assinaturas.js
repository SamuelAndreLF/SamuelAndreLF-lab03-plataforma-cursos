// O lado do dinheiro: planos, assinaturas, pagamentos e trilhas.
//
// O checkout é uma transação só: cria a assinatura e o pagamento juntos ou
// não cria nenhum dos dois. No LAB03 eram dois `push` em sequência, e se o
// segundo falhasse sobrava uma assinatura sem pagamento no meio da lista.

const express = require('express');
const { todos, um, executar, transacao } = require('../db');
const { exigirLogin, exigirAdmin } = require('../middleware/auth');

const router = express.Router();
const soAdmin = [exigirLogin, exigirAdmin];

function idTransacao() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'TXN-';
  for (let i = 0; i < 8; i += 1) id += letras[Math.floor(Math.random() * letras.length)];
  return id;
}

function somarMeses(data, meses) {
  const d = new Date(data);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

// ── Planos ────────────────────────────────────────────────────────────────

router.get('/planos', exigirLogin, async (_req, res) => {
  res.json(await todos('SELECT * FROM planos ORDER BY preco'));
});

router.post('/planos', soAdmin, async (req, res) => {
  const { nome, descricao, preco, duracaoMeses } = req.body || {};
  if (!nome || preco === undefined || !duracaoMeses) {
    return res.status(400).json({ error: 'nome, preco e duracaoMeses são obrigatórios' });
  }

  try {
    const r = await executar('INSERT INTO planos (nome, descricao, preco, duracao_meses) VALUES (?, ?, ?, ?)',
      [nome, descricao || null, preco, duracaoMeses]);
    res.status(201).json(await um('SELECT * FROM planos WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Já existe plano com esse nome' });
    if (e.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
      return res.status(400).json({ error: 'preco não pode ser negativo e duracaoMeses precisa ser maior que zero' });
    }
    throw e;
  }
});

router.delete('/planos/:id', soAdmin, async (req, res) => {
  const { n } = await um('SELECT COUNT(*) AS n FROM assinaturas WHERE id_plano = ?', [req.params.id]);
  if (n) return res.status(409).json({ error: 'Plano tem assinaturas ligadas a ele' });

  const r = await executar('DELETE FROM planos WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Plano não encontrado' });
  res.status(204).end();
});

// ── Checkout ──────────────────────────────────────────────────────────────

router.post('/checkout', exigirLogin, async (req, res) => {
  const { idPlano, metodoPagamento } = req.body || {};
  if (!idPlano || !metodoPagamento) {
    return res.status(400).json({ error: 'idPlano e metodoPagamento são obrigatórios' });
  }

  const plano = await um('SELECT * FROM planos WHERE id = ?', [idPlano]);
  if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });

  const hoje = new Date().toISOString().slice(0, 10);

  // A assinatura nova começa quando a atual terminar, se ainda houver uma
  // valendo. Começar hoje jogaria fora os dias já pagos.
  const vigente = await um(`
    SELECT data_fim FROM assinaturas
    WHERE id_usuario = ? AND CURRENT_DATE BETWEEN data_inicio AND data_fim
    ORDER BY data_fim DESC LIMIT 1
  `, [req.usuario.id]);

  const inicio = vigente ? vigente.data_fim : hoje;
  const fim = somarMeses(inicio, plano.duracao_meses);

  const resultado = await transacao(async (conexao) => {
    const [ass] = await conexao.query(
      'INSERT INTO assinaturas (id_usuario, id_plano, data_inicio, data_fim) VALUES (?, ?, ?, ?)',
      [req.usuario.id, plano.id, inicio, fim],
    );
    const [pag] = await conexao.query(
      `INSERT INTO pagamentos (id_assinatura, valor_pago, metodo_pagamento, id_transacao_gateway)
       VALUES (?, ?, ?, ?)`,
      [ass.insertId, plano.preco, metodoPagamento, idTransacao()],
    );

    const [[assinatura]] = await conexao.query('SELECT * FROM assinaturas WHERE id = ?', [ass.insertId]);
    const [[pagamento]] = await conexao.query('SELECT * FROM pagamentos WHERE id = ?', [pag.insertId]);
    return { assinatura, pagamento };
  });

  res.status(201).json(resultado);
});

router.get('/assinaturas', exigirLogin, async (req, res) => {
  const ehAdmin = req.usuario.papel === 'admin';

  res.json(await todos(`
    SELECT a.*, p.nome AS plano, p.preco, u.nome_completo AS aluno,
           CASE WHEN CURRENT_DATE BETWEEN a.data_inicio AND a.data_fim THEN 1 ELSE 0 END AS ativa
    FROM assinaturas a
    JOIN planos   p ON p.id = a.id_plano
    JOIN usuarios u ON u.id = a.id_usuario
    ${ehAdmin ? '' : 'WHERE a.id_usuario = ?'}
    ORDER BY a.data_inicio DESC
  `, ehAdmin ? [] : [req.usuario.id]));
});

router.get('/pagamentos', exigirLogin, async (req, res) => {
  const ehAdmin = req.usuario.papel === 'admin';

  res.json(await todos(`
    SELECT pg.*, p.nome AS plano, u.nome_completo AS aluno
    FROM pagamentos  pg
    JOIN assinaturas a ON a.id = pg.id_assinatura
    JOIN planos      p ON p.id = a.id_plano
    JOIN usuarios    u ON u.id = a.id_usuario
    ${ehAdmin ? '' : 'WHERE a.id_usuario = ?'}
    ORDER BY pg.data_pagamento DESC
  `, ehAdmin ? [] : [req.usuario.id]));
});

// ── Trilhas ───────────────────────────────────────────────────────────────

router.get('/trilhas', exigirLogin, async (_req, res) => {
  const trilhas = await todos(`
    SELECT t.*, c.nome AS categoria FROM trilhas t JOIN categorias c ON c.id = t.id_categoria ORDER BY t.titulo
  `);

  for (const trilha of trilhas) {
    trilha.cursos = await todos(`
      SELECT c.id, c.titulo, tc.ordem FROM trilhas_cursos tc
      JOIN cursos c ON c.id = tc.id_curso
      WHERE tc.id_trilha = ? ORDER BY tc.ordem
    `, [trilha.id]);
  }

  res.json(trilhas);
});

router.post('/trilhas', soAdmin, async (req, res) => {
  const { titulo, descricao, idCategoria } = req.body || {};
  if (!titulo || !idCategoria) return res.status(400).json({ error: 'titulo e idCategoria são obrigatórios' });

  try {
    const r = await executar('INSERT INTO trilhas (titulo, descricao, id_categoria) VALUES (?, ?, ?)',
      [titulo, descricao || null, idCategoria]);
    res.status(201).json(await um('SELECT * FROM trilhas WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'idCategoria não existe' });
    throw e;
  }
});

router.post('/trilhas/:id/cursos', soAdmin, async (req, res) => {
  const { idCurso, ordem } = req.body || {};
  if (!idCurso) return res.status(400).json({ error: 'idCurso é obrigatório' });

  try {
    await executar('INSERT INTO trilhas_cursos (id_trilha, id_curso, ordem) VALUES (?, ?, ?)',
      [req.params.id, idCurso, ordem || 1]);
    res.status(201).json({ id_trilha: Number(req.params.id), id_curso: idCurso, ordem: ordem || 1 });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Curso já está nesta trilha' });
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Trilha ou curso não existe' });
    throw e;
  }
});

router.delete('/trilhas/:idTrilha/cursos/:idCurso', soAdmin, async (req, res) => {
  const r = await executar('DELETE FROM trilhas_cursos WHERE id_trilha = ? AND id_curso = ?',
    [req.params.idTrilha, req.params.idCurso]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Curso não está nesta trilha' });
  res.status(204).end();
});

module.exports = router;
