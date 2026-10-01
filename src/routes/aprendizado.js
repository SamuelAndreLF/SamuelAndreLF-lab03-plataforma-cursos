// O lado do aluno: matrícula, progresso, avaliação e certificado.
//
// Aqui vale uma regra que o LAB03 não tinha: o aluno só mexe no que é dele. O
// id do usuário sai SEMPRE do token, nunca do corpo da requisição — senão
// bastaria trocar um número no JSON para se matricular no lugar de outro.
// Admin é a exceção: pode consultar tudo.

const express = require('express');
const { todos, um, executar } = require('../db');
const { exigirLogin, exigirAdmin } = require('../middleware/auth');

const router = express.Router();

function codigoCertificado() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = 'CERT-';
  for (let i = 0; i < 5; i += 1) codigo += letras[Math.floor(Math.random() * letras.length)];
  return codigo;
}

// ── Matrículas ────────────────────────────────────────────────────────────

router.get('/matriculas', exigirLogin, async (req, res) => {
  const ehAdmin = req.usuario.papel === 'admin';

  res.json(await todos(`
    SELECT m.*, c.titulo AS curso, u.nome_completo AS aluno
    FROM matriculas m
    JOIN cursos   c ON c.id = m.id_curso
    JOIN usuarios u ON u.id = m.id_usuario
    ${ehAdmin ? '' : 'WHERE m.id_usuario = ?'}
    ORDER BY m.data_matricula DESC
  `, ehAdmin ? [] : [req.usuario.id]));
});

router.post('/matriculas', exigirLogin, async (req, res) => {
  const { idCurso } = req.body || {};
  if (!idCurso) return res.status(400).json({ error: 'idCurso é obrigatório' });

  // Matrícula exige assinatura em dia. É a ligação entre o lado do dinheiro e
  // o lado do estudo — sem ela, o plano seria só um registro decorativo.
  const assinatura = await um(`
    SELECT id FROM assinaturas
    WHERE id_usuario = ? AND CURRENT_DATE BETWEEN data_inicio AND data_fim
  `, [req.usuario.id]);

  if (!assinatura) {
    return res.status(402).json({ error: 'Você precisa de uma assinatura ativa para se matricular' });
  }

  try {
    const r = await executar('INSERT INTO matriculas (id_usuario, id_curso) VALUES (?, ?)',
      [req.usuario.id, idCurso]);
    res.status(201).json(await um('SELECT * FROM matriculas WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Você já está matriculado neste curso' });
    if (e.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'idCurso não existe' });
    throw e;
  }
});

// ── Progresso ─────────────────────────────────────────────────────────────

router.get('/progresso', exigirLogin, async (req, res) => {
  res.json(await todos(`
    SELECT p.*, a.titulo AS aula, m.titulo AS modulo, c.titulo AS curso
    FROM progresso_aulas p
    JOIN aulas   a ON a.id = p.id_aula
    JOIN modulos m ON m.id = a.id_modulo
    JOIN cursos  c ON c.id = m.id_curso
    WHERE p.id_usuario = ?
  `, [req.usuario.id]));
});

router.put('/progresso/:idAula', exigirLogin, async (req, res) => {
  const { status } = req.body || {};
  if (!status) return res.status(400).json({ error: 'status é obrigatório' });

  const aula = await um(`
    SELECT a.id, m.id_curso FROM aulas a JOIN modulos m ON m.id = a.id_modulo WHERE a.id = ?
  `, [req.params.idAula]);
  if (!aula) return res.status(404).json({ error: 'Aula não encontrada' });

  const matriculado = await um('SELECT id FROM matriculas WHERE id_usuario = ? AND id_curso = ?',
    [req.usuario.id, aula.id_curso]);
  if (!matriculado) return res.status(403).json({ error: 'Você não está matriculado no curso desta aula' });

  const conclusao = status === 'Concluído' ? new Date().toISOString().slice(0, 10) : null;

  try {
    await executar(`
      INSERT INTO progresso_aulas (id_usuario, id_aula, status, data_conclusao)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status = VALUES(status), data_conclusao = VALUES(data_conclusao)
    `, [req.usuario.id, aula.id, status, conclusao]);
  } catch (e) {
    if (e.code === 'WARN_DATA_TRUNCATED' || e.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
      return res.status(400).json({ error: 'status deve ser Não iniciado, Em andamento ou Concluído' });
    }
    throw e;
  }

  // Concluiu a última aula do curso? A matrícula fecha sozinha. É o gatilho
  // que libera o certificado — no LAB03 alguém tinha que clicar em "Concluir".
  const { n: pendentes } = await um(`
    SELECT COUNT(*) AS n FROM aulas a
    JOIN modulos m ON m.id = a.id_modulo
    LEFT JOIN progresso_aulas p ON p.id_aula = a.id AND p.id_usuario = ?
    WHERE m.id_curso = ? AND (p.status IS NULL OR p.status <> 'Concluído')
  `, [req.usuario.id, aula.id_curso]);

  if (pendentes === 0) {
    await executar(`
      UPDATE matriculas SET data_conclusao = CURRENT_DATE
      WHERE id_usuario = ? AND id_curso = ? AND data_conclusao IS NULL
    `, [req.usuario.id, aula.id_curso]);
  }

  const salvo = await um('SELECT * FROM progresso_aulas WHERE id_usuario = ? AND id_aula = ?',
    [req.usuario.id, aula.id]);

  res.json({ ...salvo, aulas_pendentes_no_curso: pendentes });
});

// ── Avaliações ────────────────────────────────────────────────────────────

router.get('/cursos/:id/avaliacoes', exigirLogin, async (req, res) => {
  res.json(await todos(`
    SELECT av.*, u.nome_completo AS aluno
    FROM avaliacoes av JOIN usuarios u ON u.id = av.id_usuario
    WHERE av.id_curso = ? ORDER BY av.data_avaliacao DESC
  `, [req.params.id]));
});

router.post('/avaliacoes', exigirLogin, async (req, res) => {
  const { idCurso, nota, comentario } = req.body || {};
  if (!idCurso || nota === undefined) return res.status(400).json({ error: 'idCurso e nota são obrigatórios' });

  const matriculado = await um('SELECT id FROM matriculas WHERE id_usuario = ? AND id_curso = ?',
    [req.usuario.id, idCurso]);
  if (!matriculado) return res.status(403).json({ error: 'Só quem está matriculado pode avaliar o curso' });

  try {
    const r = await executar('INSERT INTO avaliacoes (id_usuario, id_curso, nota, comentario) VALUES (?, ?, ?, ?)',
      [req.usuario.id, idCurso, nota, comentario || null]);
    res.status(201).json(await um('SELECT * FROM avaliacoes WHERE id = ?', [r.insertId]));
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Você já avaliou este curso' });
    if (e.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return res.status(400).json({ error: 'nota deve estar entre 0 e 5' });
    throw e;
  }
});

// ── Certificados ──────────────────────────────────────────────────────────

router.get('/certificados', exigirLogin, async (req, res) => {
  res.json(await todos(`
    SELECT ce.*, c.titulo AS curso, u.nome_completo AS aluno
    FROM certificados ce
    JOIN cursos   c ON c.id = ce.id_curso
    JOIN usuarios u ON u.id = ce.id_usuario
    WHERE ce.id_usuario = ?
  `, [req.usuario.id]));
});

router.post('/certificados', exigirLogin, async (req, res) => {
  const { idCurso, idTrilha } = req.body || {};
  if (!idCurso) return res.status(400).json({ error: 'idCurso é obrigatório' });

  // Certificado só sai com o curso concluído de verdade. No LAB03 bastava
  // escolher aluno e curso num formulário, sem checar nada.
  const matricula = await um('SELECT data_conclusao FROM matriculas WHERE id_usuario = ? AND id_curso = ?',
    [req.usuario.id, idCurso]);

  if (!matricula) return res.status(403).json({ error: 'Você não está matriculado neste curso' });
  if (!matricula.data_conclusao) return res.status(409).json({ error: 'Conclua todas as aulas do curso antes de emitir o certificado' });

  const jaTem = await um('SELECT * FROM certificados WHERE id_usuario = ? AND id_curso = ?',
    [req.usuario.id, idCurso]);
  if (jaTem) return res.status(409).json({ error: 'Certificado já emitido', certificado: jaTem });

  const r = await executar(`
    INSERT INTO certificados (id_usuario, id_curso, id_trilha, codigo_verificacao) VALUES (?, ?, ?, ?)
  `, [req.usuario.id, idCurso, idTrilha || null, codigoCertificado()]);

  res.status(201).json(await um('SELECT * FROM certificados WHERE id = ?', [r.insertId]));
});

// Validação pública de certificado pelo código: é o que um empregador usaria.
// Fica sem login de propósito, e por isso devolve só nome, curso e data.
router.get('/certificados/verificar/:codigo', async (req, res) => {
  const cert = await um(`
    SELECT ce.codigo_verificacao, ce.data_emissao, c.titulo AS curso, u.nome_completo AS aluno
    FROM certificados ce
    JOIN cursos   c ON c.id = ce.id_curso
    JOIN usuarios u ON u.id = ce.id_usuario
    WHERE ce.codigo_verificacao = ?
  `, [req.params.codigo]);

  if (!cert) return res.status(404).json({ error: 'Certificado não encontrado', valido: false });
  res.json({ valido: true, ...cert });
});

// ── Usuários (só admin) ───────────────────────────────────────────────────

router.get('/usuarios', exigirLogin, exigirAdmin, async (_req, res) => {
  res.json(await todos('SELECT id, nome_completo, email, papel, data_cadastro FROM usuarios ORDER BY id'));
});

router.put('/usuarios/:id/papel', exigirLogin, exigirAdmin, async (req, res) => {
  const { papel } = req.body || {};
  if (!['admin', 'aluno'].includes(papel)) return res.status(400).json({ error: "papel deve ser 'admin' ou 'aluno'" });

  // Rebaixar o último admin deixaria o sistema sem quem cadastre curso, e sem
  // saída pela própria API.
  if (papel === 'aluno') {
    const { n } = await um("SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'admin'");
    const alvo = await um('SELECT papel FROM usuarios WHERE id = ?', [req.params.id]);
    if (alvo && alvo.papel === 'admin' && n <= 1) {
      return res.status(409).json({ error: 'Este é o último administrador; promova outro antes de rebaixá-lo' });
    }
  }

  const r = await executar('UPDATE usuarios SET papel = ? WHERE id = ?', [papel, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json(await um('SELECT id, nome_completo, email, papel FROM usuarios WHERE id = ?', [req.params.id]));
});

module.exports = router;
