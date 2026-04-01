function gerarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = 'CERT-';
    for (let i = 0; i < 5; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

function gerarIdTransacao() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'TXN-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

function formatarData(dateStr) {
    if (!dateStr) return '-';
    const partes = dateStr.split('-');
    if (partes.length !== 3) return dateStr;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

class Usuario {
    constructor(id, nomeCompleto, email, senhaHash) {
        this.id = id;
        this.nomeCompleto = nomeCompleto;
        this.email = email;
        this.senhaHash = senhaHash;
        this.dataCadastro = new Date().toISOString().split('T')[0];
    }
}

class Categoria {
    constructor(id, nome, descricao) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
    }
}

class Curso {
    constructor(id, titulo, descricao, idInstrutor, idCategoria, nivel, dataPublicacao, totalAulas, totalHoras) {
        this.id = id;
        this.titulo = titulo;
        this.descricao = descricao;
        this.idInstrutor = idInstrutor;
        this.idCategoria = idCategoria;
        this.nivel = nivel;
        this.dataPublicacao = dataPublicacao;
        this.totalAulas = totalAulas;
        this.totalHoras = totalHoras;
    }
}

class Modulo {
    constructor(id, idCurso, titulo, ordem) {
        this.id = id;
        this.idCurso = idCurso;
        this.titulo = titulo;
        this.ordem = ordem;
    }
}

class Aula {
    constructor(id, idModulo, titulo, tipoConteudo, urlConteudo, duracaoMinutos, ordem) {
        this.id = id;
        this.idModulo = idModulo;
        this.titulo = titulo;
        this.tipoConteudo = tipoConteudo;
        this.urlConteudo = urlConteudo;
        this.duracaoMinutos = duracaoMinutos;
        this.ordem = ordem;
    }
}

class Matricula {
    constructor(id, idUsuario, idCurso) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idCurso = idCurso;
        this.dataMatricula = new Date().toISOString().split('T')[0];
        this.dataConclusao = null;
    }
}

class ProgressoAula {
    constructor(idUsuario, idAula, dataConclusao, status) {
        this.idUsuario = idUsuario;
        this.idAula = idAula;
        this.dataConclusao = dataConclusao;
        this.status = status;
    }
}

class Avaliacao {
    constructor(id, idUsuario, idCurso, nota, comentario) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idCurso = idCurso;
        this.nota = nota;
        this.comentario = comentario;
        this.dataAvaliacao = new Date().toISOString().split('T')[0];
    }
}

class Trilha {
    constructor(id, titulo, descricao, idCategoria) {
        this.id = id;
        this.titulo = titulo;
        this.descricao = descricao;
        this.idCategoria = idCategoria;
    }
}

class TrilhaCurso {
    constructor(idTrilha, idCurso, ordem) {
        this.idTrilha = idTrilha;
        this.idCurso = idCurso;
        this.ordem = ordem;
    }
}

class Certificado {
    constructor(id, idUsuario, idCurso, idTrilha) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idCurso = idCurso;
        this.idTrilha = idTrilha || null;
        this.codigoVerificacao = gerarCodigo();
        this.dataEmissao = new Date().toISOString().split('T')[0];
    }
}

class Plano {
    constructor(id, nome, descricao, preco, duracaoMeses) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.duracaoMeses = duracaoMeses;
    }
}

class Assinatura {
    constructor(id, idUsuario, idPlano, dataInicio, dataFim) {
        this.id = id;
        this.idUsuario = idUsuario;
        this.idPlano = idPlano;
        this.dataInicio = dataInicio;
        this.dataFim = dataFim;
    }
}

class Pagamento {
    constructor(id, idAssinatura, valorPago, metodoPagamento) {
        this.id = id;
        this.idAssinatura = idAssinatura;
        this.valorPago = valorPago;
        this.dataPagamento = new Date().toISOString().split('T')[0];
        this.metodoPagamento = metodoPagamento;
        this.idTransacaoGateway = gerarIdTransacao();
    }
}

const dados = {
    usuarios: [],
    categorias: [],
    cursos: [],
    modulos: [],
    aulas: [],
    matriculas: [],
    progressoAulas: [],
    avaliacoes: [],
    trilhas: [],
    trilhasCursos: [],
    certificados: [],
    planos: [],
    assinaturas: [],
    pagamentos: []
};

let contadores = {
    usuario: 0,
    categoria: 0,
    curso: 0,
    modulo: 0,
    aula: 0,
    matricula: 0,
    avaliacao: 0,
    trilha: 0,
    certificado: 0,
    plano: 0,
    assinatura: 0,
    pagamento: 0
};
