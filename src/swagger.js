// Documentação OpenAPI 3, exibida em /api-docs.
//
// O roteiro de demonstração está escrito na descrição de propósito: quem abre
// a página precisa saber que sem criar usuário, fazer login e clicar em
// Authorize, quase tudo responde 401.

const erro = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
});

const json = (schema) => ({ 'application/json': { schema } });
const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` });
const lista = (nome) => ({ type: 'array', items: ref(nome) });

const paramId = (nome = 'id', descricao = 'Identificador') => ({
  name: nome, in: 'path', required: true, schema: { type: 'integer' }, description: descricao, example: 1,
});

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Plataforma de Cursos Online — API',
    version: '1.0.0',
    description: [
      '**Como testar, na ordem:**',
      '',
      '1. `POST /auth/register` — o **primeiro** usuário cadastrado vira **admin** automaticamente.',
      '2. `POST /auth/login` — copie o `token` da resposta.',
      '3. Clique em **Authorize** (cadeado, no topo) e cole o token.',
      '4. Como admin: crie categoria → curso → módulo → aula → plano.',
      '5. Cadastre um segundo usuário (vem como **aluno**), faça login com ele e repita o Authorize.',
      '6. Como aluno: `POST /checkout` para assinar, `POST /matriculas`, marque as aulas em',
      '   `PUT /progresso/{idAula}` e, com o curso concluído, `POST /certificados`.',
      '',
      'Sem o Authorize quase tudo responde **401**. O que é de admin responde **403** para aluno.',
    ].join('\n'),
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro e login. As únicas rotas abertas.' },
    { name: 'Catálogo', description: 'Categorias, cursos, módulos e aulas. Leitura para logados, escrita só para admin.' },
    { name: 'Assinaturas', description: 'Planos, checkout, assinaturas e pagamentos.' },
    { name: 'Aprendizado', description: 'Matrícula, progresso, avaliação e certificado. É o lado do aluno.' },
    { name: 'Trilhas', description: 'Agrupamento de cursos em sequência.' },
    { name: 'Administração', description: 'Gestão de usuários e papéis. Só admin.' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Erro: {
        type: 'object',
        properties: { error: { type: 'string', example: 'Mensagem explicando o que deu errado' } },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome_completo: { type: 'string', example: 'Samuel André' },
          email: { type: 'string', example: 'samuel@puc.br' },
          papel: { type: 'string', enum: ['admin', 'aluno'], example: 'admin' },
          data_cadastro: { type: 'string', format: 'date', example: '2026-09-30' },
        },
      },
      RespostaLogin: {
        type: 'object',
        properties: {
          usuario: ref('Usuario'),
          token: { type: 'string', description: 'Cole em Authorize', example: 'eyJhbGciOiJIUzI1NiIs...' },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Programação' },
          descricao: { type: 'string', example: 'Cursos de desenvolvimento de software' },
        },
      },
      Curso: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          titulo: { type: 'string', example: 'JavaScript do zero' },
          descricao: { type: 'string', example: 'Lógica, DOM e consumo de API' },
          id_instrutor: { type: 'integer', example: 1 },
          id_categoria: { type: 'integer', example: 1 },
          nivel: { type: 'string', enum: ['Iniciante', 'Intermediário', 'Avançado'], example: 'Iniciante' },
          data_publicacao: { type: 'string', format: 'date', example: '2026-09-30' },
          total_aulas: { type: 'integer', description: 'Calculado pelo servidor a partir das aulas', example: 12 },
          total_horas: { type: 'number', description: 'Calculado pelo servidor', example: 4.5 },
          nota_media: { type: 'number', nullable: true, example: 4.7 },
        },
      },
      Modulo: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_curso: { type: 'integer', example: 1 },
          titulo: { type: 'string', example: 'Fundamentos' },
          ordem: { type: 'integer', example: 1 },
        },
      },
      Aula: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_modulo: { type: 'integer', example: 1 },
          titulo: { type: 'string', example: 'Variáveis e tipos' },
          tipo_conteudo: { type: 'string', enum: ['Vídeo', 'Texto', 'Quiz'], example: 'Vídeo' },
          url_conteudo: { type: 'string', nullable: true, example: 'https://exemplo.com/aula1' },
          duracao_minutos: { type: 'integer', example: 18 },
          ordem: { type: 'integer', example: 1 },
        },
      },
      Plano: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Mensal' },
          descricao: { type: 'string', example: 'Acesso a todos os cursos por 1 mês' },
          preco: { type: 'number', example: 49.9 },
          duracao_meses: { type: 'integer', example: 1 },
        },
      },
      Assinatura: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 2 },
          id_plano: { type: 'integer', example: 1 },
          data_inicio: { type: 'string', format: 'date', example: '2026-09-30' },
          data_fim: { type: 'string', format: 'date', example: '2026-10-30' },
          ativa: { type: 'integer', enum: [0, 1], example: 1 },
        },
      },
      Pagamento: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_assinatura: { type: 'integer', example: 1 },
          valor_pago: { type: 'number', example: 49.9 },
          data_pagamento: { type: 'string', format: 'date', example: '2026-09-30' },
          metodo_pagamento: { type: 'string', example: 'Cartão de crédito' },
          id_transacao_gateway: { type: 'string', example: 'TXN-8FJ2K1QP' },
        },
      },
      Matricula: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 2 },
          id_curso: { type: 'integer', example: 1 },
          data_matricula: { type: 'string', format: 'date', example: '2026-09-30' },
          data_conclusao: { type: 'string', format: 'date', nullable: true, example: null },
        },
      },
      Progresso: {
        type: 'object',
        properties: {
          id_usuario: { type: 'integer', example: 2 },
          id_aula: { type: 'integer', example: 1 },
          status: { type: 'string', enum: ['Não iniciado', 'Em andamento', 'Concluído'], example: 'Concluído' },
          data_conclusao: { type: 'string', format: 'date', nullable: true, example: '2026-09-30' },
          aulas_pendentes_no_curso: { type: 'integer', example: 0 },
        },
      },
      Avaliacao: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 2 },
          id_curso: { type: 'integer', example: 1 },
          nota: { type: 'number', minimum: 0, maximum: 5, example: 5 },
          comentario: { type: 'string', nullable: true, example: 'Curso muito bem explicado' },
          data_avaliacao: { type: 'string', format: 'date', example: '2026-09-30' },
        },
      },
      Certificado: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          id_usuario: { type: 'integer', example: 2 },
          id_curso: { type: 'integer', example: 1 },
          id_trilha: { type: 'integer', nullable: true, example: null },
          codigo_verificacao: { type: 'string', example: 'CERT-A9K2P' },
          data_emissao: { type: 'string', format: 'date', example: '2026-09-30' },
        },
      },
      Trilha: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          titulo: { type: 'string', example: 'Desenvolvedor Web' },
          descricao: { type: 'string', example: 'Do HTML ao back-end' },
          id_categoria: { type: 'integer', example: 1 },
          cursos: { type: 'array', items: { type: 'object' } },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Autenticação'], security: [], summary: 'Cadastrar usuário',
        description: 'O primeiro usuário do banco vira admin. Os seguintes viram aluno — o papel não pode ser escolhido de fora.',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['nomeCompleto', 'email', 'senha'],
            properties: {
              nomeCompleto: { type: 'string', example: 'Samuel André' },
              email: { type: 'string', example: 'samuel@puc.br' },
              senha: { type: 'string', minLength: 6, example: 'senha123' },
            },
          }),
        },
        responses: {
          201: { description: 'Usuário criado', content: json(ref('RespostaLogin')) },
          400: erro('Campo faltando, e-mail inválido ou senha curta'),
          409: erro('E-mail já cadastrado'),
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Autenticação'], security: [], summary: 'Entrar e receber o token',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['email', 'senha'],
            properties: {
              email: { type: 'string', example: 'samuel@puc.br' },
              senha: { type: 'string', example: 'senha123' },
            },
          }),
        },
        responses: {
          200: { description: 'Token gerado', content: json(ref('RespostaLogin')) },
          401: erro('E-mail ou senha incorretos'),
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticação'], summary: 'Quem sou eu',
        description: 'Serve para conferir se o Authorize funcionou e qual o seu papel.',
        responses: { 200: { description: 'Dados do usuário logado', content: json(ref('Usuario')) }, 401: erro('Sem token') },
      },
    },

    '/categorias': {
      get: {
        tags: ['Catálogo'], summary: 'Listar categorias',
        responses: { 200: { description: 'Lista', content: json(lista('Categoria')) }, 401: erro('Sem token') },
      },
      post: {
        tags: ['Catálogo'], summary: 'Criar categoria (admin)',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['nome'],
            properties: { nome: { type: 'string', example: 'Programação' }, descricao: { type: 'string', example: 'Cursos de software' } },
          }),
        },
        responses: { 201: { description: 'Criada', content: json(ref('Categoria')) }, 403: erro('Só admin'), 409: erro('Nome repetido') },
      },
    },
    '/categorias/{id}': {
      put: {
        tags: ['Catálogo'], summary: 'Editar categoria (admin)', parameters: [paramId()],
        requestBody: { content: json(ref('Categoria')) },
        responses: { 200: { description: 'Atualizada', content: json(ref('Categoria')) }, 403: erro('Só admin'), 404: erro('Não encontrada') },
      },
      delete: {
        tags: ['Catálogo'], summary: 'Excluir categoria (admin)', parameters: [paramId()],
        responses: { 204: { description: 'Excluída' }, 403: erro('Só admin'), 409: erro('Tem cursos ligados') },
      },
    },

    '/cursos': {
      get: {
        tags: ['Catálogo'], summary: 'Listar cursos',
        parameters: [
          { name: 'categoria', in: 'query', schema: { type: 'integer' }, description: 'Filtrar por id da categoria' },
          { name: 'nivel', in: 'query', schema: { type: 'string', enum: ['Iniciante', 'Intermediário', 'Avançado'] } },
        ],
        responses: { 200: { description: 'Lista com nota média', content: json(lista('Curso')) }, 401: erro('Sem token') },
      },
      post: {
        tags: ['Catálogo'], summary: 'Criar curso (admin)',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['titulo', 'idCategoria', 'nivel'],
            properties: {
              titulo: { type: 'string', example: 'JavaScript do zero' },
              descricao: { type: 'string', example: 'Lógica, DOM e consumo de API' },
              idCategoria: { type: 'integer', example: 1 },
              idInstrutor: { type: 'integer', description: 'Se omitido, assume o admin logado', example: 1 },
              nivel: { type: 'string', enum: ['Iniciante', 'Intermediário', 'Avançado'], example: 'Iniciante' },
            },
          }),
        },
        responses: { 201: { description: 'Criado', content: json(ref('Curso')) }, 400: erro('Dados inválidos'), 403: erro('Só admin') },
      },
    },
    '/cursos/{id}': {
      get: {
        tags: ['Catálogo'], summary: 'Curso com módulos e aulas', parameters: [paramId()],
        responses: { 200: { description: 'Curso completo', content: json(ref('Curso')) }, 404: erro('Não encontrado') },
      },
      put: {
        tags: ['Catálogo'], summary: 'Editar curso (admin)', parameters: [paramId()],
        requestBody: { content: json(ref('Curso')) },
        responses: { 200: { description: 'Atualizado', content: json(ref('Curso')) }, 403: erro('Só admin'), 404: erro('Não encontrado') },
      },
      delete: {
        tags: ['Catálogo'], summary: 'Excluir curso (admin)', parameters: [paramId()],
        responses: { 204: { description: 'Excluído' }, 403: erro('Só admin'), 404: erro('Não encontrado') },
      },
    },
    '/cursos/{id}/modulos': {
      get: {
        tags: ['Catálogo'], summary: 'Módulos do curso', parameters: [paramId()],
        responses: { 200: { description: 'Lista', content: json(lista('Modulo')) } },
      },
    },
    '/cursos/{id}/avaliacoes': {
      get: {
        tags: ['Aprendizado'], summary: 'Avaliações do curso', parameters: [paramId()],
        responses: { 200: { description: 'Lista', content: json(lista('Avaliacao')) } },
      },
    },

    '/modulos': {
      post: {
        tags: ['Catálogo'], summary: 'Criar módulo (admin)',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idCurso', 'titulo'],
            properties: {
              idCurso: { type: 'integer', example: 1 },
              titulo: { type: 'string', example: 'Fundamentos' },
              ordem: { type: 'integer', example: 1 },
            },
          }),
        },
        responses: { 201: { description: 'Criado', content: json(ref('Modulo')) }, 403: erro('Só admin') },
      },
    },
    '/modulos/{id}': {
      delete: {
        tags: ['Catálogo'], summary: 'Excluir módulo (admin)', parameters: [paramId()],
        responses: { 204: { description: 'Excluído' }, 403: erro('Só admin'), 404: erro('Não encontrado') },
      },
    },
    '/modulos/{id}/aulas': {
      get: {
        tags: ['Catálogo'], summary: 'Aulas do módulo', parameters: [paramId()],
        responses: { 200: { description: 'Lista', content: json(lista('Aula')) } },
      },
    },

    '/aulas': {
      post: {
        tags: ['Catálogo'], summary: 'Criar aula (admin)',
        description: 'Criar ou excluir aula recalcula total_aulas e total_horas do curso.',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idModulo', 'titulo', 'tipoConteudo'],
            properties: {
              idModulo: { type: 'integer', example: 1 },
              titulo: { type: 'string', example: 'Variáveis e tipos' },
              tipoConteudo: { type: 'string', enum: ['Vídeo', 'Texto', 'Quiz'], example: 'Vídeo' },
              urlConteudo: { type: 'string', example: 'https://exemplo.com/aula1' },
              duracaoMinutos: { type: 'integer', example: 18 },
              ordem: { type: 'integer', example: 1 },
            },
          }),
        },
        responses: { 201: { description: 'Criada', content: json(ref('Aula')) }, 403: erro('Só admin') },
      },
    },
    '/aulas/{id}': {
      delete: {
        tags: ['Catálogo'], summary: 'Excluir aula (admin)', parameters: [paramId()],
        responses: { 204: { description: 'Excluída' }, 403: erro('Só admin'), 404: erro('Não encontrada') },
      },
    },

    '/planos': {
      get: {
        tags: ['Assinaturas'], summary: 'Listar planos',
        responses: { 200: { description: 'Lista', content: json(lista('Plano')) } },
      },
      post: {
        tags: ['Assinaturas'], summary: 'Criar plano (admin)',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['nome', 'preco', 'duracaoMeses'],
            properties: {
              nome: { type: 'string', example: 'Mensal' },
              descricao: { type: 'string', example: 'Acesso a todos os cursos por 1 mês' },
              preco: { type: 'number', example: 49.9 },
              duracaoMeses: { type: 'integer', example: 1 },
            },
          }),
        },
        responses: { 201: { description: 'Criado', content: json(ref('Plano')) }, 403: erro('Só admin') },
      },
    },
    '/planos/{id}': {
      delete: {
        tags: ['Assinaturas'], summary: 'Excluir plano (admin)', parameters: [paramId()],
        responses: { 204: { description: 'Excluído' }, 409: erro('Plano tem assinaturas') },
      },
    },
    '/checkout': {
      post: {
        tags: ['Assinaturas'], summary: 'Assinar um plano',
        description: 'Cria assinatura e pagamento na mesma transação. Se já houver assinatura vigente, a nova começa no dia em que a atual termina.',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idPlano', 'metodoPagamento'],
            properties: {
              idPlano: { type: 'integer', example: 1 },
              metodoPagamento: { type: 'string', example: 'Cartão de crédito' },
            },
          }),
        },
        responses: {
          201: {
            description: 'Assinatura e pagamento criados',
            content: json({ type: 'object', properties: { assinatura: ref('Assinatura'), pagamento: ref('Pagamento') } }),
          },
          404: erro('Plano não encontrado'),
        },
      },
    },
    '/assinaturas': {
      get: {
        tags: ['Assinaturas'], summary: 'Minhas assinaturas (admin vê todas)',
        responses: { 200: { description: 'Lista', content: json(lista('Assinatura')) } },
      },
    },
    '/pagamentos': {
      get: {
        tags: ['Assinaturas'], summary: 'Meus pagamentos (admin vê todos)',
        responses: { 200: { description: 'Lista', content: json(lista('Pagamento')) } },
      },
    },

    '/matriculas': {
      get: {
        tags: ['Aprendizado'], summary: 'Minhas matrículas (admin vê todas)',
        responses: { 200: { description: 'Lista', content: json(lista('Matricula')) } },
      },
      post: {
        tags: ['Aprendizado'], summary: 'Matricular-se num curso',
        description: 'Exige assinatura ativa. O aluno é sempre o dono do token.',
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['idCurso'], properties: { idCurso: { type: 'integer', example: 1 } } }),
        },
        responses: {
          201: { description: 'Matriculado', content: json(ref('Matricula')) },
          402: erro('Sem assinatura ativa'),
          409: erro('Já matriculado'),
        },
      },
    },
    '/progresso': {
      get: {
        tags: ['Aprendizado'], summary: 'Meu progresso',
        responses: { 200: { description: 'Lista', content: json(lista('Progresso')) } },
      },
    },
    '/progresso/{idAula}': {
      put: {
        tags: ['Aprendizado'], summary: 'Marcar andamento de uma aula',
        description: 'Ao concluir a última aula pendente, a matrícula é fechada automaticamente e o certificado fica liberado.',
        parameters: [paramId('idAula', 'Id da aula')],
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['status'],
            properties: { status: { type: 'string', enum: ['Não iniciado', 'Em andamento', 'Concluído'], example: 'Concluído' } },
          }),
        },
        responses: {
          200: { description: 'Progresso salvo', content: json(ref('Progresso')) },
          403: erro('Não está matriculado no curso da aula'),
          404: erro('Aula não encontrada'),
        },
      },
    },
    '/avaliacoes': {
      post: {
        tags: ['Aprendizado'], summary: 'Avaliar um curso',
        description: 'Só quem está matriculado avalia, e só uma vez por curso.',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idCurso', 'nota'],
            properties: {
              idCurso: { type: 'integer', example: 1 },
              nota: { type: 'number', minimum: 0, maximum: 5, example: 5 },
              comentario: { type: 'string', example: 'Curso muito bem explicado' },
            },
          }),
        },
        responses: { 201: { description: 'Avaliação criada', content: json(ref('Avaliacao')) }, 403: erro('Não matriculado'), 409: erro('Já avaliou') },
      },
    },
    '/certificados': {
      get: {
        tags: ['Aprendizado'], summary: 'Meus certificados',
        responses: { 200: { description: 'Lista', content: json(lista('Certificado')) } },
      },
      post: {
        tags: ['Aprendizado'], summary: 'Emitir certificado',
        description: 'Só sai com todas as aulas do curso concluídas.',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idCurso'],
            properties: { idCurso: { type: 'integer', example: 1 }, idTrilha: { type: 'integer', nullable: true } },
          }),
        },
        responses: {
          201: { description: 'Emitido', content: json(ref('Certificado')) },
          403: erro('Não matriculado'),
          409: erro('Curso não concluído ou certificado já emitido'),
        },
      },
    },
    '/certificados/verificar/{codigo}': {
      get: {
        tags: ['Aprendizado'], security: [], summary: 'Validar certificado pelo código (rota aberta)',
        parameters: [{ name: 'codigo', in: 'path', required: true, schema: { type: 'string' }, example: 'CERT-A9K2P' }],
        responses: {
          200: { description: 'Certificado válido', content: json({ type: 'object', properties: { valido: { type: 'boolean' }, aluno: { type: 'string' }, curso: { type: 'string' } } }) },
          404: erro('Certificado não encontrado'),
        },
      },
    },

    '/trilhas': {
      get: {
        tags: ['Trilhas'], summary: 'Listar trilhas com seus cursos',
        responses: { 200: { description: 'Lista', content: json(lista('Trilha')) } },
      },
      post: {
        tags: ['Trilhas'], summary: 'Criar trilha (admin)',
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['titulo', 'idCategoria'],
            properties: {
              titulo: { type: 'string', example: 'Desenvolvedor Web' },
              descricao: { type: 'string', example: 'Do HTML ao back-end' },
              idCategoria: { type: 'integer', example: 1 },
            },
          }),
        },
        responses: { 201: { description: 'Criada', content: json(ref('Trilha')) }, 403: erro('Só admin') },
      },
    },
    '/trilhas/{id}/cursos': {
      post: {
        tags: ['Trilhas'], summary: 'Adicionar curso à trilha (admin)', parameters: [paramId()],
        requestBody: {
          required: true,
          content: json({
            type: 'object', required: ['idCurso'],
            properties: { idCurso: { type: 'integer', example: 1 }, ordem: { type: 'integer', example: 1 } },
          }),
        },
        responses: { 201: { description: 'Adicionado' }, 409: erro('Curso já está na trilha') },
      },
    },
    '/trilhas/{idTrilha}/cursos/{idCurso}': {
      delete: {
        tags: ['Trilhas'], summary: 'Tirar curso da trilha (admin)',
        parameters: [paramId('idTrilha', 'Id da trilha'), paramId('idCurso', 'Id do curso')],
        responses: { 204: { description: 'Removido' }, 404: erro('Curso não está na trilha') },
      },
    },

    '/usuarios': {
      get: {
        tags: ['Administração'], summary: 'Listar usuários (admin)',
        responses: { 200: { description: 'Lista', content: json(lista('Usuario')) }, 403: erro('Só admin') },
      },
    },
    '/usuarios/{id}/papel': {
      put: {
        tags: ['Administração'], summary: 'Promover ou rebaixar usuário (admin)',
        description: 'Não deixa rebaixar o último administrador.',
        parameters: [paramId()],
        requestBody: {
          required: true,
          content: json({ type: 'object', required: ['papel'], properties: { papel: { type: 'string', enum: ['admin', 'aluno'], example: 'admin' } } }),
        },
        responses: { 200: { description: 'Papel alterado', content: json(ref('Usuario')) }, 403: erro('Só admin'), 409: erro('É o último admin') },
      },
    },
  },
};
