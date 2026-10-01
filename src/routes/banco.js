// Tela de inspeção do banco, em /banco.
//
// Existe para a apresentação: o professor pede "prova que está gravando", e
// em vez de abrir o MySQL Workbench abre-se uma aba do navegador. A página
// relê os dados sozinha a cada dois segundos, então dá para deixá-la ao lado
// do Swagger e ver as linhas aparecendo enquanto a API é usada.
//
// Fica sem login de propósito — na hora da demonstração ninguém quer colar
// token numa segunda aba. Em troca, nenhum campo de senha sai daqui, nem em
// hash: a tela costuma estar projetada na parede.

const express = require('express');
const { todos } = require('../db');

const router = express.Router();

const CAMPOS_OCULTOS = ['senha_hash'];
const BANCO = process.env.DB_NAME || 'plataforma_cursos';

router.get('/banco/dados', async (_req, res) => {
  const nomes = (await todos(
    'SELECT table_name AS nome FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [BANCO],
  )).map((t) => t.nome);

  const tabelas = [];
  for (const nome of nomes) {
    const linhas = (await todos(`SELECT * FROM \`${nome}\``)).map((linha) => {
      const copia = { ...linha };
      for (const campo of CAMPOS_OCULTOS) if (campo in copia) copia[campo] = '••••••';
      return copia;
    });

    const colunas = linhas.length
      ? Object.keys(linhas[0])
      : (await todos(
          'SELECT column_name AS nome FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
          [BANCO, nome],
        )).map((c) => c.nome);

    tabelas.push({ nome, total: linhas.length, colunas, linhas });
  }

  res.json({ banco: `MySQL · ${BANCO}`, tabelas });
});

router.get('/banco', (_req, res) => {
  res.type('html').send(PAGINA);
});

const PAGINA = `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Banco de dados — Plataforma de Cursos</title>
<style>
  :root { color-scheme: light dark; --linha: #e3e6ea; --fundo: #fff; --suave: #f6f7f9; --texto: #1b1f24; --fraco: #6b7280; --azul: #2563eb; --novo: #d1fae5; }
  @media (prefers-color-scheme: dark) {
    :root { --linha: #2a2f36; --fundo: #14171a; --suave: #1b1f23; --texto: #e8eaed; --fraco: #9aa3ae; --azul: #60a5fa; --novo: #14532d; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--fundo); color: var(--texto); }
  header { padding: 14px 20px; border-bottom: 1px solid var(--linha); display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  h1 { font-size: 16px; margin: 0; }
  .arquivo { color: var(--fraco); font-size: 12.5px; font-family: ui-monospace, Menlo, monospace; }
  label { margin-left: auto; display: flex; align-items: center; gap: 7px; color: var(--fraco); font-size: 13px; }
  main { display: flex; min-height: calc(100vh - 56px); }
  nav { width: 230px; border-right: 1px solid var(--linha); padding: 10px 0; overflow-y: auto; }
  nav button { display: flex; justify-content: space-between; width: 100%; padding: 8px 20px; background: none; border: 0;
               color: var(--texto); font: inherit; cursor: pointer; text-align: left; }
  nav button:hover { background: var(--suave); }
  nav button[aria-current="true"] { background: var(--suave); box-shadow: inset 3px 0 0 var(--azul); font-weight: 600; }
  nav .n { color: var(--fraco); font-variant-numeric: tabular-nums; }
  section { flex: 1; padding: 18px 20px; overflow: auto; }
  h2 { font-size: 15px; margin: 0 0 12px; font-family: ui-monospace, Menlo, monospace; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid var(--linha); padding: 6px 10px; text-align: left; white-space: nowrap; }
  th { background: var(--suave); font-weight: 600; position: sticky; top: 0; }
  td.nulo { color: var(--fraco); font-style: italic; }
  tr.nova td { background: var(--novo); transition: background 1.6s; }
  .vazia { color: var(--fraco); padding: 10px 0; }
</style>
</head>
<body>
<header>
  <h1>Banco de dados</h1>
  <span class="arquivo" id="arquivo"></span>
  <label><input type="checkbox" id="auto" checked /> atualizar sozinho (2s)</label>
</header>
<main>
  <nav id="menu"></nav>
  <section>
    <h2 id="titulo"></h2>
    <div id="conteudo"></div>
  </section>
</main>
<script>
  let atual = null;
  let anteriores = {};   // nome da tabela -> quantidade na leitura passada

  const menu = document.getElementById('menu');
  const titulo = document.getElementById('titulo');
  const conteudo = document.getElementById('conteudo');

  async function carregar() {
    const dados = await fetch('/banco/dados').then((r) => r.json());
    document.getElementById('arquivo').textContent = dados.banco;

    if (!atual) atual = dados.tabelas[0] && dados.tabelas[0].nome;

    menu.innerHTML = '';
    for (const t of dados.tabelas) {
      const b = document.createElement('button');
      b.innerHTML = '<span>' + t.nome + '</span><span class="n">' + t.total + '</span>';
      b.setAttribute('aria-current', t.nome === atual);
      b.onclick = () => { atual = t.nome; desenhar(dados); };
      menu.appendChild(b);
    }

    desenhar(dados);
    for (const t of dados.tabelas) anteriores[t.nome] = t.total;
  }

  function desenhar(dados) {
    const t = dados.tabelas.find((x) => x.nome === atual);
    if (!t) return;

    titulo.textContent = t.nome + '  (' + t.total + (t.total === 1 ? ' linha)' : ' linhas)');

    if (!t.linhas.length) { conteudo.innerHTML = '<p class="vazia">Tabela vazia.</p>'; return; }

    // Linhas que apareceram desde a última leitura ficam destacadas em verde,
    // que é o que torna visível a gravação acontecendo ao vivo.
    const antes = anteriores[t.nome] ?? t.total;
    const novas = Math.max(0, t.total - antes);

    const cabecalho = t.colunas.map((c) => '<th>' + c + '</th>').join('');
    const corpo = t.linhas.map((linha, i) => {
      const nova = i >= t.linhas.length - novas ? ' class="nova"' : '';
      const celulas = t.colunas.map((c) => {
        const v = linha[c];
        return v === null || v === undefined
          ? '<td class="nulo">null</td>'
          : '<td>' + String(v).replace(/[<&]/g, (s) => (s === '<' ? '&lt;' : '&amp;')) + '</td>';
      }).join('');
      return '<tr' + nova + '>' + celulas + '</tr>';
    }).join('');

    conteudo.innerHTML = '<table><thead><tr>' + cabecalho + '</tr></thead><tbody>' + corpo + '</tbody></table>';
  }

  carregar();
  setInterval(() => { if (document.getElementById('auto').checked) carregar(); }, 2000);
</script>
</body>
</html>`;

module.exports = router;
