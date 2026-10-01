// Sobe o servidor. HTTPS quando existir certificado em certs/, HTTP caso
// contrário.
//
// O certificado é autoassinado (gerado por `npm run cert`), então o navegador
// mostra aviso de "não confiável" — isso é esperado. Certificado reconhecido
// por autoridade exige domínio público, e não há domínio aqui. O que importa
// para a disciplina é o tráfego ir cifrado, e isso o autoassinado já faz.

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

const app = require('./app');
const { esperarBanco, criarEsquema } = require('./db');

const PORTA = Number(process.env.PORT) || 3000;
const pastaCerts = path.join(__dirname, '..', 'certs');
const chave = path.join(pastaCerts, 'key.pem');
const cert = path.join(pastaCerts, 'cert.pem');

const temCertificado = fs.existsSync(chave) && fs.existsSync(cert);

async function iniciar() {
  // Só abre a porta depois que o banco responde e as tabelas existem. Se
  // abrisse antes, os primeiros pedidos morreriam com erro de conexão
  // enquanto o MySQL ainda estivesse subindo.
  await esperarBanco();
  await criarEsquema();

  const servidor = temCertificado
    ? https.createServer({ key: fs.readFileSync(chave), cert: fs.readFileSync(cert) }, app)
    : http.createServer(app);

  const esquema = temCertificado ? 'https' : 'http';

  servidor.listen(PORTA, () => {
    console.log(`\n  Plataforma de Cursos no ar em ${esquema}://localhost:${PORTA}`);
    console.log(`  Swagger:  ${esquema}://localhost:${PORTA}/api-docs`);
    console.log(`  Banco:    ${esquema}://localhost:${PORTA}/banco`);
    console.log(`  Frontend: ${esquema}://localhost:${PORTA}/\n`);
    if (!temCertificado) {
      console.log('  Rodando em HTTP. Para subir em HTTPS: npm run cert\n');
    }
  });
}

iniciar().catch((erro) => {
  console.error('\n  Não foi possível subir o servidor:', erro.message);
  console.error('  O MySQL está rodando? Tente: docker compose up -d banco\n');
  process.exit(1);
});
