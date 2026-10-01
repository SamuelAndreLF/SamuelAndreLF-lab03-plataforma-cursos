# Plataforma de Cursos Online

Projeto do LAB03 com um backend. A interface original (HTML, CSS e JavaScript) continua aqui e é servida pelo próprio servidor; o que mudou é que os dados agora vivem num banco **MySQL**, atrás de uma API REST com login por JWT, papéis de administrador e aluno, e documentação Swagger.

## O que existe

- **API REST** em Node.js + Express, com 30 rotas documentadas.
- **Banco MySQL 8** com as 14 tabelas da modelagem do LAB03 e chaves estrangeiras ligadas.
- **Login JWT** com dois papéis: `admin` cadastra catálogo e planos, `aluno` assina, se matricula e estuda.
- **Swagger** em `/api-docs`, com botão *Authorize* para testar tudo pelo navegador.
- **Tela do banco** em `/banco`: mostra as tabelas e se atualiza sozinha a cada 2 s.
- **Docker Compose** sobe banco e API juntos. **HTTPS** opcional.

## Como rodar

Precisa do [Node.js](https://nodejs.org) 18 ou mais novo.

O jeito mais curto, com tudo em contêiner:

```bash
docker compose up --build
```

Rodando o Node na máquina e só o banco em contêiner:

```bash
docker compose up -d banco     # sobe o MySQL
npm install
cp .env.example .env           # no Windows: copy .env.example .env
npm run seed                   # popula com dados de exemplo
npm start
```

- Swagger: <http://localhost:3000/api-docs>
- Banco: <http://localhost:3000/banco>
- Frontend do LAB03: <http://localhost:3000>

O MySQL precisa estar no ar. Se o `npm start` reclamar de conexão, confira se o Docker Desktop está aberto e rode `docker compose up -d banco`.

O `npm run seed` cria dois usuários para a demonstração:

- `admin@puc.br` / `senha123` — administrador
- `aluno@puc.br` / `senha123` — aluno

## Como testar no Swagger

1. `POST /auth/register` — **o primeiro usuário cadastrado vira admin**. Se você rodou o seed, pule e faça login com `admin@puc.br`.
2. `POST /auth/login` e copie o `token`.
3. Clique em **Authorize**, no topo, e cole o token.
4. Como admin: crie categoria → curso → módulo → aula → plano.
5. Faça login com o aluno, repita o Authorize.
6. Como aluno: `POST /checkout`, `POST /matriculas`, marque as aulas em `PUT /progresso/{idAula}` e, com o curso concluído, `POST /certificados`.

Sem o Authorize quase tudo responde **401**. O que é de admin responde **403** para aluno.

## Ver o banco

Abra <http://localhost:3000/banco>. A página lista as 14 tabelas com a contagem de linhas e relê os dados a cada 2 segundos — dá para deixá-la ao lado do Swagger e ver as linhas aparecendo enquanto a API é usada. Linhas novas ficam destacadas em verde por alguns segundos.

Pelo terminal, o mesmo conteúdo:

```bash
npm run banco
```

Nos dois casos o hash da senha aparece mascarado.

## Regras que o backend garante

Estas regras não existiam na versão em memória, onde qualquer formulário gravava qualquer coisa:

- Matrícula exige **assinatura ativa**, e a data de fim é calculada a partir da duração do plano.
- Assinatura nova começa quando a atual termina, em vez de jogar fora os dias pagos.
- Checkout grava assinatura e pagamento na **mesma transação**: ou os dois, ou nenhum.
- Só quem está matriculado avalia o curso, e só uma vez.
- `total_aulas` e `total_horas` do curso são **calculados** a partir das aulas, não digitados.
- Concluir a última aula fecha a matrícula sozinha, e é isso que libera o certificado.
- Certificado exige curso concluído e tem código único, validável sem login em `GET /certificados/verificar/{codigo}`.
- O último administrador não pode ser rebaixado — senão ninguém mais cadastraria curso.

## Docker

```bash
docker compose up --build
```

Sobe dois contêineres: o MySQL e a API. O `depends_on` com `condition: service_healthy` faz a API esperar o banco aceitar conexão — sem isso ela subiria antes e morreria na primeira consulta.

Os dados ficam num volume, então parar e recriar os contêineres não apaga nada. Para zerar de propósito:

```bash
docker compose down -v
```

## HTTPS

```bash
npm run cert
npm start
```

Gera um certificado autoassinado em `certs/` e o servidor sobe em HTTPS. O navegador vai mostrar aviso de site não confiável: isso é esperado. Certificado reconhecido por autoridade exige domínio público, que este projeto não tem — o que o autoassinado entrega, e é o que interessa aqui, é o tráfego cifrado.

Sem os arquivos em `certs/`, o servidor sobe em HTTP normalmente.

## Estrutura

```
index.html, css/, js/     interface do LAB03, servida como estática
src/db.js                 conexão (pool), esquema e transações
src/swagger.js            documentação OpenAPI
src/middleware/auth.js    JWT e checagem de papel
src/routes/auth.js        cadastro e login
src/routes/catalogo.js    categorias, cursos, módulos, aulas
src/routes/assinaturas.js planos, checkout, pagamentos, trilhas
src/routes/aprendizado.js matrícula, progresso, avaliação, certificado
src/routes/banco.js       tela de inspeção do banco
scripts/seed.js           dados de exemplo
scripts/show-db.js        imprime as tabelas
```
