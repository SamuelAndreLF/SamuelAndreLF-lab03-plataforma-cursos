// Cadastro e login. São as duas únicas rotas abertas da API.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { gerarToken, exigirLogin } = require('../middleware/auth');

const router = express.Router();

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', (req, res) => {
  const { nomeCompleto, email, senha, papel } = req.body || {};

  if (!nomeCompleto || !email || !senha) {
    return res.status(400).json({ error: 'nomeCompleto, email e senha são obrigatórios' });
  }
  if (!EMAIL_VALIDO.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ error: 'A senha precisa de pelo menos 6 caracteres' });
  }

  // O primeiro usuário cadastrado vira admin. Sem isso o banco nasceria sem
  // ninguém capaz de criar curso, e não haveria como sair desse impasse pela
  // própria API. Depois do primeiro, quem escolhe o papel é um admin — a
  // pedido vindo de fora é sempre 'aluno'.
  const vazio = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total === 0;
  const papelFinal = vazio ? 'admin' : (papel === 'admin' ? 'aluno' : (papel || 'aluno'));

  const hash = bcrypt.hashSync(String(senha), 10);

  try {
    const info = db
      .prepare('INSERT INTO usuarios (nome_completo, email, senha_hash, papel) VALUES (?, ?, ?, ?)')
      .run(nomeCompleto, email, hash, papelFinal);

    const usuario = db
      .prepare('SELECT id, nome_completo, email, papel, data_cadastro FROM usuarios WHERE id = ?')
      .get(info.lastInsertRowid);

    return res.status(201).json({ usuario, token: gerarToken({ ...usuario, papel: papelFinal }) });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Já existe usuário com esse e-mail' });
    }
    throw e;
  }
});

router.post('/login', (req, res) => {
  const { email, senha } = req.body || {};

  if (!email || !senha) {
    return res.status(400).json({ error: 'email e senha são obrigatórios' });
  }

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);

  // Mesma mensagem para e-mail inexistente e senha errada: responder coisas
  // diferentes entrega quais e-mails existem na base.
  if (!usuario || !bcrypt.compareSync(String(senha), usuario.senha_hash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  return res.json({
    usuario: {
      id: usuario.id,
      nome_completo: usuario.nome_completo,
      email: usuario.email,
      papel: usuario.papel,
      data_cadastro: usuario.data_cadastro,
    },
    token: gerarToken(usuario),
  });
});

router.get('/me', exigirLogin, (req, res) => {
  const usuario = db
    .prepare('SELECT id, nome_completo, email, papel, data_cadastro FROM usuarios WHERE id = ?')
    .get(req.usuario.id);

  if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(usuario);
});

module.exports = router;
