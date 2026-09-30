// Autenticação por JWT e separação de papéis.
//
// O token guarda só id, email e papel. O papel também é relido do banco a cada
// requisição em `exigirAdmin`, porque um token continua válido depois de o
// papel mudar — sem essa releitura, rebaixar um admin não teria efeito até o
// token expirar.

const jwt = require('jsonwebtoken');
const db = require('../db');

const SEGREDO = process.env.JWT_SECRET || 'troque-este-segredo-no-env';
const VALIDADE = process.env.JWT_EXPIRES || '8h';

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, papel: usuario.papel },
    SEGREDO,
    { expiresIn: VALIDADE },
  );
}

// Exige token válido. Popula req.usuario.
function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Envie o token no cabeçalho Authorization: Bearer <token>' });
  }

  try {
    req.usuario = jwt.verify(token, SEGREDO);
    return next();
  } catch (e) {
    const expirou = e.name === 'TokenExpiredError';
    return res.status(401).json({ error: expirou ? 'Token expirado, faça login de novo' : 'Token inválido' });
  }
}

// Exige que o usuário logado seja admin. Usar sempre DEPOIS de exigirLogin.
function exigirAdmin(req, res, next) {
  const atual = db.prepare('SELECT papel FROM usuarios WHERE id = ?').get(req.usuario.id);

  if (!atual) {
    return res.status(401).json({ error: 'Usuário do token não existe mais' });
  }
  if (atual.papel !== 'admin') {
    return res.status(403).json({ error: 'Só administradores podem fazer isso' });
  }
  return next();
}

module.exports = { gerarToken, exigirLogin, exigirAdmin, SEGREDO };
