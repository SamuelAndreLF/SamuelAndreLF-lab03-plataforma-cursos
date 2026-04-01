
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-secao]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const secao = this.getAttribute('data-secao');
            document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa'));
            document.getElementById('secao-' + secao).classList.add('ativa');

            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            this.classList.add('active');

            const navbarCollapse = document.querySelector('.navbar-collapse');
            if (navbarCollapse.classList.contains('show')) {
                new bootstrap.Collapse(navbarCollapse).hide();
            }

            atualizarSelects();
        });
    });

    setupForms();
});

function buscarNome(lista, id, campo) {
    const item = lista.find(i => i.id == id);
    return item ? (item[campo] || item.nome || item.titulo || item.nomeCompleto) : '-';
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function atualizarSelects() {
    const populaSelect = (idSelect, lista, valorCampo, textoCampo) => {
        const sel = document.getElementById(idSelect);
        if (!sel) return;
        const primeiro = sel.options[0];
        sel.innerHTML = '';
        if (primeiro) sel.appendChild(primeiro);
        lista.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valorCampo];
            opt.textContent = item[textoCampo] || item.nome || item.titulo || item.nomeCompleto;
            sel.appendChild(opt);
        });
    };

    populaSelect('curso-categoria', dados.categorias, 'id', 'nome');
    populaSelect('trilha-categoria', dados.categorias, 'id', 'nome');
    populaSelect('curso-instrutor', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('modulo-curso', dados.cursos, 'id', 'titulo');
    populaSelect('aula-modulo', dados.modulos, 'id', 'titulo');

    populaSelect('matricula-usuario', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('matricula-curso', dados.cursos, 'id', 'titulo');

    populaSelect('progresso-usuario', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('progresso-aula', dados.aulas, 'id', 'titulo');

    populaSelect('avaliacao-usuario', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('avaliacao-curso', dados.cursos, 'id', 'titulo');

    populaSelect('certificado-usuario', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('certificado-curso', dados.cursos, 'id', 'titulo');
    populaSelect('certificado-trilha', dados.trilhas, 'id', 'titulo');

    populaSelect('tc-trilha', dados.trilhas, 'id', 'titulo');
    populaSelect('tc-curso', dados.cursos, 'id', 'titulo');

    populaSelect('assinatura-usuario', dados.usuarios, 'id', 'nomeCompleto');
    populaSelect('assinatura-plano', dados.planos, 'id', 'nome');

    const selPag = document.getElementById('pagamento-assinatura');
    if (selPag) {
        const primeiro = selPag.options[0];
        selPag.innerHTML = '';
        if (primeiro) selPag.appendChild(primeiro);
        dados.assinaturas.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `Assinatura #${a.id}`;
            selPag.appendChild(opt);
        });
    }
}

function setupForms() {

    document.getElementById('form-categoria').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('categoria-id').value;
        const nome = document.getElementById('categoria-nome').value.trim();
        const descricao = document.getElementById('categoria-descricao').value.trim();

        if (!nome) { alert('Nome é obrigatório!'); return; }

        const existe = dados.categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase() && c.id != id);
        if (existe) { alert('Categoria já existe!'); return; }

        if (id) {
            const cat = dados.categorias.find(c => c.id == id);
            cat.nome = nome;
            cat.descricao = descricao;
        } else {
            contadores.categoria++;
            const cat = new Categoria(contadores.categoria, nome, descricao);
            dados.categorias.push(cat);
        }

        this.reset();
        document.getElementById('categoria-id').value = '';
        renderCategorias();
    });

    document.getElementById('form-curso').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('curso-id').value;
        const titulo = document.getElementById('curso-titulo').value.trim();
        const descricao = document.getElementById('curso-descricao').value.trim();
        const idCategoria = document.getElementById('curso-categoria').value;
        const nivel = document.getElementById('curso-nivel').value;
        const idInstrutor = document.getElementById('curso-instrutor').value;
        const dataPublicacao = document.getElementById('curso-data').value;
        const totalAulas = parseInt(document.getElementById('curso-total-aulas').value) || 0;
        const totalHoras = parseFloat(document.getElementById('curso-total-horas').value) || 0;

        if (!titulo) { alert('Título é obrigatório!'); return; }

        if (id) {
            const curso = dados.cursos.find(c => c.id == id);
            curso.titulo = titulo;
            curso.descricao = descricao;
            curso.idCategoria = parseInt(idCategoria);
            curso.nivel = nivel;
            curso.idInstrutor = parseInt(idInstrutor);
            curso.dataPublicacao = dataPublicacao;
            curso.totalAulas = totalAulas;
            curso.totalHoras = totalHoras;
        } else {
            contadores.curso++;
            const curso = new Curso(contadores.curso, titulo, descricao, parseInt(idInstrutor), parseInt(idCategoria), nivel, dataPublicacao, totalAulas, totalHoras);
            dados.cursos.push(curso);
        }

        this.reset();
        document.getElementById('curso-id').value = '';
        renderCursos();
        atualizarSelects();
    });

    document.getElementById('form-modulo').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('modulo-id').value;
        const idCurso = document.getElementById('modulo-curso').value;
        const titulo = document.getElementById('modulo-titulo').value.trim();
        const ordem = parseInt(document.getElementById('modulo-ordem').value) || 1;

        if (!titulo || !idCurso) { alert('Curso e título são obrigatórios!'); return; }

        if (id) {
            const mod = dados.modulos.find(m => m.id == id);
            mod.idCurso = parseInt(idCurso);
            mod.titulo = titulo;
            mod.ordem = ordem;
        } else {
            contadores.modulo++;
            const mod = new Modulo(contadores.modulo, parseInt(idCurso), titulo, ordem);
            dados.modulos.push(mod);
        }

        this.reset();
        document.getElementById('modulo-id').value = '';
        renderModulos();
        atualizarSelects();
    });

    document.getElementById('form-aula').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('aula-id').value;
        const idModulo = document.getElementById('aula-modulo').value;
        const titulo = document.getElementById('aula-titulo').value.trim();
        const tipo = document.getElementById('aula-tipo').value;
        const url = document.getElementById('aula-url').value.trim();
        const duracao = parseInt(document.getElementById('aula-duracao').value) || 0;
        const ordem = parseInt(document.getElementById('aula-ordem').value) || 1;

        if (!titulo || !idModulo) { alert('Módulo e título são obrigatórios!'); return; }

        if (id) {
            const aula = dados.aulas.find(a => a.id == id);
            aula.idModulo = parseInt(idModulo);
            aula.titulo = titulo;
            aula.tipoConteudo = tipo;
            aula.urlConteudo = url;
            aula.duracaoMinutos = duracao;
            aula.ordem = ordem;
        } else {
            contadores.aula++;
            const aula = new Aula(contadores.aula, parseInt(idModulo), titulo, tipo, url, duracao, ordem);
            dados.aulas.push(aula);
        }

        this.reset();
        document.getElementById('aula-id').value = '';
        renderAulas();
        atualizarSelects();
    });

    document.getElementById('form-usuario').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('usuario-id').value;
        const nome = document.getElementById('usuario-nome').value.trim();
        const email = document.getElementById('usuario-email').value.trim();
        const senha = document.getElementById('usuario-senha').value;

        if (!nome || !email || !senha) { alert('Todos os campos são obrigatórios!'); return; }
        if (!validarEmail(email)) { alert('Email inválido!'); return; }

        const emailExiste = dados.usuarios.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id != id);
        if (emailExiste) { alert('Email já cadastrado!'); return; }

        if (id) {
            const usr = dados.usuarios.find(u => u.id == id);
            usr.nomeCompleto = nome;
            usr.email = email;
            usr.senhaHash = senha;
        } else {
            contadores.usuario++;
            const usr = new Usuario(contadores.usuario, nome, email, senha);
            dados.usuarios.push(usr);
        }

        this.reset();
        document.getElementById('usuario-id').value = '';
        renderUsuarios();
        atualizarSelects();
    });

    document.getElementById('form-matricula').addEventListener('submit', function(e) {
        e.preventDefault();
        const idUsuario = document.getElementById('matricula-usuario').value;
        const idCurso = document.getElementById('matricula-curso').value;

        if (!idUsuario || !idCurso) { alert('Selecione usuário e curso!'); return; }

        const duplicada = dados.matriculas.find(m => m.idUsuario == idUsuario && m.idCurso == idCurso);
        if (duplicada) { alert('Usuário já está matriculado neste curso!'); return; }

        contadores.matricula++;
        const mat = new Matricula(contadores.matricula, parseInt(idUsuario), parseInt(idCurso));
        dados.matriculas.push(mat);

        this.reset();
        renderMatriculas();
    });

    document.getElementById('form-progresso').addEventListener('submit', function(e) {
        e.preventDefault();
        const idUsuario = document.getElementById('progresso-usuario').value;
        const idAula = document.getElementById('progresso-aula').value;
        const status = document.getElementById('progresso-status').value;

        if (!idUsuario || !idAula) { alert('Selecione usuário e aula!'); return; }

        const dataConclusao = status === 'Concluído' ? new Date().toISOString().split('T')[0] : null;
        const prog = new ProgressoAula(parseInt(idUsuario), parseInt(idAula), dataConclusao, status);
        dados.progressoAulas.push(prog);

        this.reset();
        renderProgresso();
    });

    document.getElementById('form-avaliacao').addEventListener('submit', function(e) {
        e.preventDefault();
        const idUsuario = document.getElementById('avaliacao-usuario').value;
        const idCurso = document.getElementById('avaliacao-curso').value;
        const nota = parseFloat(document.getElementById('avaliacao-nota').value);
        const comentario = document.getElementById('avaliacao-comentario').value.trim();

        if (!idUsuario || !idCurso || isNaN(nota)) { alert('Usuário, curso e nota são obrigatórios!'); return; }

        contadores.avaliacao++;
        const aval = new Avaliacao(contadores.avaliacao, parseInt(idUsuario), parseInt(idCurso), nota, comentario);
        dados.avaliacoes.push(aval);

        this.reset();
        renderAvaliacoes();
    });

    document.getElementById('form-trilha').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('trilha-id').value;
        const titulo = document.getElementById('trilha-titulo').value.trim();
        const descricao = document.getElementById('trilha-descricao').value.trim();
        const idCategoria = document.getElementById('trilha-categoria').value;

        if (!titulo) { alert('Título é obrigatório!'); return; }

        if (id) {
            const trilha = dados.trilhas.find(t => t.id == id);
            trilha.titulo = titulo;
            trilha.descricao = descricao;
            trilha.idCategoria = parseInt(idCategoria);
        } else {
            contadores.trilha++;
            const trilha = new Trilha(contadores.trilha, titulo, descricao, parseInt(idCategoria));
            dados.trilhas.push(trilha);
        }

        this.reset();
        document.getElementById('trilha-id').value = '';
        renderTrilhas();
        atualizarSelects();
    });

    document.getElementById('form-trilha-curso').addEventListener('submit', function(e) {
        e.preventDefault();
        const idTrilha = document.getElementById('tc-trilha').value;
        const idCurso = document.getElementById('tc-curso').value;
        const ordem = parseInt(document.getElementById('tc-ordem').value) || 1;

        if (!idTrilha || !idCurso) { alert('Selecione trilha e curso!'); return; }

        const tc = new TrilhaCurso(parseInt(idTrilha), parseInt(idCurso), ordem);
        dados.trilhasCursos.push(tc);

        this.reset();
        renderTrilhasCursos();
    });

    document.getElementById('form-plano').addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('plano-id').value;
        const nome = document.getElementById('plano-nome').value.trim();
        const descricao = document.getElementById('plano-descricao').value.trim();
        const preco = parseFloat(document.getElementById('plano-preco').value);
        const duracao = parseInt(document.getElementById('plano-duracao').value);

        if (!nome || isNaN(preco) || isNaN(duracao)) { alert('Nome, preço e duração são obrigatórios!'); return; }

        if (id) {
            const plano = dados.planos.find(p => p.id == id);
            plano.nome = nome;
            plano.descricao = descricao;
            plano.preco = preco;
            plano.duracaoMeses = duracao;
        } else {
            contadores.plano++;
            const plano = new Plano(contadores.plano, nome, descricao, preco, duracao);
            dados.planos.push(plano);
        }

        this.reset();
        document.getElementById('plano-id').value = '';
        renderPlanos();
        atualizarSelects();
    });

    document.getElementById('form-assinatura').addEventListener('submit', function(e) {
        e.preventDefault();
        const idUsuario = document.getElementById('assinatura-usuario').value;
        const idPlano = document.getElementById('assinatura-plano').value;
        const inicio = document.getElementById('assinatura-inicio').value;
        const fim = document.getElementById('assinatura-fim').value;

        if (!idUsuario || !idPlano || !inicio || !fim) { alert('Todos os campos são obrigatórios!'); return; }

        contadores.assinatura++;
        const ass = new Assinatura(contadores.assinatura, parseInt(idUsuario), parseInt(idPlano), inicio, fim);
        dados.assinaturas.push(ass);

        this.reset();
        renderAssinaturas();
        atualizarSelects();
    });

    document.getElementById('form-pagamento').addEventListener('submit', function(e) {
        e.preventDefault();
        const idAssinatura = document.getElementById('pagamento-assinatura').value;
        const valor = parseFloat(document.getElementById('pagamento-valor').value);
        const metodo = document.getElementById('pagamento-metodo').value;

        if (!idAssinatura || isNaN(valor) || !metodo) { alert('Todos os campos são obrigatórios!'); return; }

        contadores.pagamento++;
        const pag = new Pagamento(contadores.pagamento, parseInt(idAssinatura), valor, metodo);
        dados.pagamentos.push(pag);

        this.reset();
        renderPagamentos();
    });

    document.getElementById('form-certificado').addEventListener('submit', function(e) {
        e.preventDefault();
        const idUsuario = document.getElementById('certificado-usuario').value;
        const idCurso = document.getElementById('certificado-curso').value;
        const idTrilha = document.getElementById('certificado-trilha').value || null;

        if (!idUsuario || !idCurso) { alert('Usuário e curso são obrigatórios!'); return; }

        contadores.certificado++;
        const cert = new Certificado(
            contadores.certificado,
            parseInt(idUsuario),
            parseInt(idCurso),
            idTrilha ? parseInt(idTrilha) : null
        );
        dados.certificados.push(cert);

        this.reset();
        renderCertificados();
        mostrarCertificado(cert);
    });
}


function renderCategorias() {
    const tbody = document.getElementById('tbody-categorias');
    tbody.innerHTML = '';
    dados.categorias.forEach(cat => {
        tbody.innerHTML += `
            <tr>
                <td>${cat.id}</td>
                <td>${cat.nome}</td>
                <td>${cat.descricao}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarCategoria(${cat.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirCategoria(${cat.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderCursos() {
    const tbody = document.getElementById('tbody-cursos');
    tbody.innerHTML = '';
    dados.cursos.forEach(c => {
        const categoriaNome = buscarNome(dados.categorias, c.idCategoria, 'nome');
        const instrutorNome = buscarNome(dados.usuarios, c.idInstrutor, 'nomeCompleto');
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td>${c.titulo}</td>
                <td>${categoriaNome}</td>
                <td>${c.nivel}</td>
                <td>${instrutorNome}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarCurso(${c.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirCurso(${c.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderModulos() {
    const tbody = document.getElementById('tbody-modulos');
    tbody.innerHTML = '';
    dados.modulos.forEach(m => {
        const cursoTitulo = buscarNome(dados.cursos, m.idCurso, 'titulo');
        tbody.innerHTML += `
            <tr>
                <td>${m.id}</td>
                <td>${cursoTitulo}</td>
                <td>${m.titulo}</td>
                <td>${m.ordem}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarModulo(${m.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirModulo(${m.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderAulas() {
    const tbody = document.getElementById('tbody-aulas');
    tbody.innerHTML = '';
    dados.aulas.forEach(a => {
        const moduloTitulo = buscarNome(dados.modulos, a.idModulo, 'titulo');
        tbody.innerHTML += `
            <tr>
                <td>${a.id}</td>
                <td>${moduloTitulo}</td>
                <td>${a.titulo}</td>
                <td>${a.tipoConteudo}</td>
                <td>${a.duracaoMinutos} min</td>
                <td>${a.ordem}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarAula(${a.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAula(${a.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderUsuarios() {
    const tbody = document.getElementById('tbody-usuarios');
    tbody.innerHTML = '';
    dados.usuarios.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.id}</td>
                <td>${u.nomeCompleto}</td>
                <td>${u.email}</td>
                <td>${formatarData(u.dataCadastro)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarUsuario(${u.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirUsuario(${u.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderMatriculas() {
    const tbody = document.getElementById('tbody-matriculas');
    tbody.innerHTML = '';
    dados.matriculas.forEach(m => {
        const usuarioNome = buscarNome(dados.usuarios, m.idUsuario, 'nomeCompleto');
        const cursoTitulo = buscarNome(dados.cursos, m.idCurso, 'titulo');
        const conclusao = m.dataConclusao
            ? formatarData(m.dataConclusao)
            : `<button class="btn btn-sm btn-outline-success" onclick="concluirMatricula(${m.id})">Concluir</button>`;
        tbody.innerHTML += `
            <tr>
                <td>${m.id}</td>
                <td>${usuarioNome}</td>
                <td>${cursoTitulo}</td>
                <td>${formatarData(m.dataMatricula)}</td>
                <td>${conclusao}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirMatricula(${m.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderProgresso() {
    const tbody = document.getElementById('tbody-progresso');
    tbody.innerHTML = '';
    dados.progressoAulas.forEach(p => {
        const usuarioNome = buscarNome(dados.usuarios, p.idUsuario, 'nomeCompleto');
        const aulaTitulo = buscarNome(dados.aulas, p.idAula, 'titulo');
        let badgeClass = 'bg-secondary';
        if (p.status === 'Concluído') badgeClass = 'bg-success';
        else if (p.status === 'Em Andamento') badgeClass = 'bg-warning text-dark';

        tbody.innerHTML += `
            <tr>
                <td>${usuarioNome}</td>
                <td>${aulaTitulo}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td>${p.dataConclusao ? formatarData(p.dataConclusao) : '-'}</td>
            </tr>
        `;
    });
}

function renderAvaliacoes() {
    const tbody = document.getElementById('tbody-avaliacoes');
    tbody.innerHTML = '';
    dados.avaliacoes.forEach(a => {
        const usuarioNome = buscarNome(dados.usuarios, a.idUsuario, 'nomeCompleto');
        const cursoTitulo = buscarNome(dados.cursos, a.idCurso, 'titulo');
        let estrelas = '';
        for (let i = 1; i <= 5; i++) {
            estrelas += i <= a.nota ? '★' : '☆';
        }
        tbody.innerHTML += `
            <tr>
                <td>${a.id}</td>
                <td>${usuarioNome}</td>
                <td>${cursoTitulo}</td>
                <td>${estrelas} (${a.nota})</td>
                <td>${a.comentario || '-'}</td>
                <td>${formatarData(a.dataAvaliacao)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAvaliacao(${a.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderTrilhas() {
    const tbody = document.getElementById('tbody-trilhas');
    tbody.innerHTML = '';
    dados.trilhas.forEach(t => {
        const categoriaNome = buscarNome(dados.categorias, t.idCategoria, 'nome');
        tbody.innerHTML += `
            <tr>
                <td>${t.id}</td>
                <td>${t.titulo}</td>
                <td>${t.descricao}</td>
                <td>${categoriaNome}</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarTrilha(${t.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirTrilha(${t.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderTrilhasCursos() {
    const tbody = document.getElementById('tbody-trilhas-cursos');
    tbody.innerHTML = '';
    dados.trilhasCursos.forEach(tc => {
        const trilhaTitulo = buscarNome(dados.trilhas, tc.idTrilha, 'titulo');
        const cursoTitulo = buscarNome(dados.cursos, tc.idCurso, 'titulo');
        tbody.innerHTML += `
            <tr>
                <td>${trilhaTitulo}</td>
                <td>${cursoTitulo}</td>
                <td>${tc.ordem}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirTrilhaCurso(${tc.idTrilha}, ${tc.idCurso})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderPlanos() {
    const tbody = document.getElementById('tbody-planos');
    tbody.innerHTML = '';
    dados.planos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>${p.nome}</td>
                <td>${p.descricao}</td>
                <td>R$ ${p.preco.toFixed(2)}</td>
                <td>${p.duracaoMeses} meses</td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="editarPlano(${p.id})">Editar</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirPlano(${p.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderAssinaturas() {
    const tbody = document.getElementById('tbody-assinaturas');
    tbody.innerHTML = '';
    dados.assinaturas.forEach(a => {
        const usuarioNome = buscarNome(dados.usuarios, a.idUsuario, 'nomeCompleto');
        const planoNome = buscarNome(dados.planos, a.idPlano, 'nome');
        tbody.innerHTML += `
            <tr>
                <td>${a.id}</td>
                <td>${usuarioNome}</td>
                <td>${planoNome}</td>
                <td>${formatarData(a.dataInicio)}</td>
                <td>${formatarData(a.dataFim)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger" onclick="excluirAssinatura(${a.id})">Excluir</button>
                </td>
            </tr>
        `;
    });
}

function renderPagamentos() {
    const tbody = document.getElementById('tbody-pagamentos');
    tbody.innerHTML = '';
    dados.pagamentos.forEach(p => {
        tbody.innerHTML += `
            <tr>
                <td>${p.id}</td>
                <td>Assinatura #${p.idAssinatura}</td>
                <td>R$ ${p.valorPago.toFixed(2)}</td>
                <td>${formatarData(p.dataPagamento)}</td>
                <td>${p.metodoPagamento}</td>
                <td>${p.idTransacaoGateway}</td>
            </tr>
        `;
    });
}

function renderCertificados() {
    const tbody = document.getElementById('tbody-certificados');
    tbody.innerHTML = '';
    dados.certificados.forEach(c => {
        const usuarioNome = buscarNome(dados.usuarios, c.idUsuario, 'nomeCompleto');
        const cursoTitulo = buscarNome(dados.cursos, c.idCurso, 'titulo');
        const trilhaTitulo = c.idTrilha ? buscarNome(dados.trilhas, c.idTrilha, 'titulo') : '-';
        tbody.innerHTML += `
            <tr>
                <td>${c.id}</td>
                <td>${usuarioNome}</td>
                <td>${cursoTitulo}</td>
                <td>${trilhaTitulo}</td>
                <td>${c.codigoVerificacao}</td>
                <td>${formatarData(c.dataEmissao)}</td>
            </tr>
        `;
    });
}


function editarCategoria(id) {
    const cat = dados.categorias.find(c => c.id === id);
    document.getElementById('categoria-id').value = cat.id;
    document.getElementById('categoria-nome').value = cat.nome;
    document.getElementById('categoria-descricao').value = cat.descricao;
    document.getElementById('form-categoria').scrollIntoView({ behavior: 'smooth' });
}

function editarCurso(id) {
    const c = dados.cursos.find(c => c.id === id);
    atualizarSelects();
    document.getElementById('curso-id').value = c.id;
    document.getElementById('curso-titulo').value = c.titulo;
    document.getElementById('curso-descricao').value = c.descricao;
    document.getElementById('curso-categoria').value = c.idCategoria;
    document.getElementById('curso-nivel').value = c.nivel;
    document.getElementById('curso-instrutor').value = c.idInstrutor;
    document.getElementById('curso-data').value = c.dataPublicacao || '';
    document.getElementById('curso-total-aulas').value = c.totalAulas;
    document.getElementById('curso-total-horas').value = c.totalHoras;
    document.getElementById('form-curso').scrollIntoView({ behavior: 'smooth' });
}

function editarModulo(id) {
    const m = dados.modulos.find(m => m.id === id);
    atualizarSelects();
    document.getElementById('modulo-id').value = m.id;
    document.getElementById('modulo-curso').value = m.idCurso;
    document.getElementById('modulo-titulo').value = m.titulo;
    document.getElementById('modulo-ordem').value = m.ordem;
    document.getElementById('form-modulo').scrollIntoView({ behavior: 'smooth' });
}

function editarAula(id) {
    const a = dados.aulas.find(a => a.id === id);
    atualizarSelects();
    document.getElementById('aula-id').value = a.id;
    document.getElementById('aula-modulo').value = a.idModulo;
    document.getElementById('aula-titulo').value = a.titulo;
    document.getElementById('aula-tipo').value = a.tipoConteudo;
    document.getElementById('aula-url').value = a.urlConteudo || '';
    document.getElementById('aula-duracao').value = a.duracaoMinutos;
    document.getElementById('aula-ordem').value = a.ordem;
    document.getElementById('form-aula').scrollIntoView({ behavior: 'smooth' });
}

function editarUsuario(id) {
    const u = dados.usuarios.find(u => u.id === id);
    document.getElementById('usuario-id').value = u.id;
    document.getElementById('usuario-nome').value = u.nomeCompleto;
    document.getElementById('usuario-email').value = u.email;
    document.getElementById('usuario-senha').value = u.senhaHash;
    document.getElementById('form-usuario').scrollIntoView({ behavior: 'smooth' });
}

function editarTrilha(id) {
    const t = dados.trilhas.find(t => t.id === id);
    atualizarSelects();
    document.getElementById('trilha-id').value = t.id;
    document.getElementById('trilha-titulo').value = t.titulo;
    document.getElementById('trilha-descricao').value = t.descricao;
    document.getElementById('trilha-categoria').value = t.idCategoria;
    document.getElementById('form-trilha').scrollIntoView({ behavior: 'smooth' });
}

function editarPlano(id) {
    const p = dados.planos.find(p => p.id === id);
    document.getElementById('plano-id').value = p.id;
    document.getElementById('plano-nome').value = p.nome;
    document.getElementById('plano-descricao').value = p.descricao;
    document.getElementById('plano-preco').value = p.preco;
    document.getElementById('plano-duracao').value = p.duracaoMeses;
    document.getElementById('form-plano').scrollIntoView({ behavior: 'smooth' });
}


function excluirCategoria(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        dados.categorias = dados.categorias.filter(c => c.id !== id);
        renderCategorias();
    }
}

function excluirCurso(id) {
    if (confirm('Tem certeza que deseja excluir este curso?')) {
        dados.cursos = dados.cursos.filter(c => c.id !== id);
        renderCursos();
        atualizarSelects();
    }
}

function excluirModulo(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        dados.modulos = dados.modulos.filter(m => m.id !== id);
        renderModulos();
        atualizarSelects();
    }
}

function excluirAula(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        dados.aulas = dados.aulas.filter(a => a.id !== id);
        renderAulas();
        atualizarSelects();
    }
}

function excluirUsuario(id) {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
        dados.usuarios = dados.usuarios.filter(u => u.id !== id);
        renderUsuarios();
        atualizarSelects();
    }
}

function excluirMatricula(id) {
    if (confirm('Excluir matrícula?')) {
        dados.matriculas = dados.matriculas.filter(m => m.id !== id);
        renderMatriculas();
    }
}

function excluirAvaliacao(id) {
    if (confirm('Excluir avaliação?')) {
        dados.avaliacoes = dados.avaliacoes.filter(a => a.id !== id);
        renderAvaliacoes();
    }
}

function excluirTrilha(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        dados.trilhas = dados.trilhas.filter(t => t.id !== id);
        renderTrilhas();
        atualizarSelects();
    }
}

function excluirTrilhaCurso(idTrilha, idCurso) {
    if (confirm('Remover curso da trilha?')) {
        dados.trilhasCursos = dados.trilhasCursos.filter(tc => !(tc.idTrilha === idTrilha && tc.idCurso === idCurso));
        renderTrilhasCursos();
    }
}

function excluirPlano(id) {
    if (confirm('Tem certeza que deseja excluir?')) {
        dados.planos = dados.planos.filter(p => p.id !== id);
        renderPlanos();
        atualizarSelects();
    }
}

function excluirAssinatura(id) {
    if (confirm('Excluir assinatura?')) {
        dados.assinaturas = dados.assinaturas.filter(a => a.id !== id);
        renderAssinaturas();
        atualizarSelects();
    }
}


function concluirMatricula(id) {
    const mat = dados.matriculas.find(m => m.id === id);
    if (mat) {
        mat.dataConclusao = new Date().toISOString().split('T')[0];
        renderMatriculas();
    }
}

function mostrarCertificado(cert) {
    const usuario = dados.usuarios.find(u => u.id == cert.idUsuario);
    const curso = dados.cursos.find(c => c.id == cert.idCurso);
    const div = document.getElementById('certificado-visual');
    div.innerHTML = `
        <div class="certificado-card text-center p-4 mt-3">
            <h3>Certificado de Conclusão</h3>
            <hr>
            <p>Certificamos que <strong>${usuario ? usuario.nomeCompleto : ''}</strong></p>
            <p>concluiu o curso <strong>${curso ? curso.titulo : ''}</strong></p>
            <p>Data de emissão: ${formatarData(cert.dataEmissao)}</p>
            <p class="text-muted">Código de verificação: ${cert.codigoVerificacao}</p>
        </div>
    `;
}
