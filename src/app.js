// Monta o Express: frontend estático, API e Swagger no mesmo servidor.
//
// Servir o front pelo próprio backend evita CORS na apresentação e deixa tudo
// numa porta só — um comando, um endereço.

const path = require('node:path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./swagger');
const authRoutes = require('./routes/auth');
const catalogoRoutes = require('./routes/catalogo');
const aprendizadoRoutes = require('./routes/aprendizado');
const assinaturaRoutes = require('./routes/assinaturas');
const bancoRoutes = require('./routes/banco');

const app = express();

app.use(cors());
app.use(express.json());

// Página do Swagger. `persistAuthorization` mantém o token depois de recarregar
// a página — sem isso é preciso refazer o Authorize a cada F5 no meio da demo.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Plataforma de Cursos — API',
  swaggerOptions: { persistAuthorization: true, docExpansion: 'none', tagsSorter: 'alpha' },
}));

app.get('/openapi.json', (_req, res) => res.json(swaggerSpec));

app.use('/auth', authRoutes);
app.use('/', catalogoRoutes);
app.use('/', aprendizadoRoutes);
app.use('/', assinaturaRoutes);
app.use('/', bancoRoutes);

// O LAB03 original continua servido como estava, na raiz.
app.use(express.static(path.join(__dirname, '..')));

app.use((req, res) => {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

// Tratador de erro no fim da pilha. Sem ele, uma exceção numa rota derruba a
// requisição com HTML de stack trace do Express, e quem está consumindo a API
// recebe algo que não é JSON.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

module.exports = app;
