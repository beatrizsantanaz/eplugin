const axios = require('axios');
const { getTokenForEmpresa } = require('../config/epluginConfig');

const BASE_URL = 'https://dp.pack.alterdata.com.br/api/v1'; // Defina a URL base da API
const DOCUMENTOS_API_URL = 'https://documentos.pack.alterdata.com.br/api/v1/integracao/documentos';

// Criar instância do Axios dinamicamente
const createApiInstance = (empresaId) => {
    const token = getTokenForEmpresa(empresaId);

    if (!token) {
        throw new Error(`Token não encontrado para a empresa: ${empresaId}`);
    }

    return axios.create({
        baseURL: BASE_URL,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
        }
    });
};

// Obter todas as empresas de uma determinada conta
const obterTodasEmpresas = async (empresaId) => {
    try {
        console.log(`🔍 Buscando todas as empresas para ${empresaId}...`);
        const api = createApiInstance(empresaId);

        let empresas = [];
        let offset = 0;
        const limit = 100;
        let continuarBuscando = true;

        while (continuarBuscando) {
            console.log(`📡 Enviando requisição para offset=${offset}`);
            const response = await api.get(`/empresas?page[limit]=${limit}&page[offset]=${offset}`);
            
            console.log(`✅ Resposta recebida:`, response.data);
            
            const empresasPagina = response.data.data || []; // Garante que seja um array

            if (empresasPagina.length === 0) {
                continuarBuscando = false;
            } else {
                empresas = empresas.concat(empresasPagina);
                offset += limit;
            }
        }

        console.log(`📄 Total de empresas carregadas para ${empresaId}: ${empresas.length}`);
        return empresas;
    } catch (error) {
        console.error(`❌ Erro ao buscar empresas (${empresaId}):`, error.response?.data || error.message);
        throw new Error(`Erro na API do Eplugin: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
};


// Buscar empresa pelo CNPJ
const obterEmpresaPorCNPJ = async (cnpj) => {
    try {
        console.log(`🔍 Buscando empresa com CNPJ: ${cnpj}`);
        const cnpjFormatado = cnpj.replace(/\D/g, '');

        const empresaIds = ['empresa1', 'empresa2']; // IDs das empresas cadastradas
        for (const empresaId of empresaIds) {
            const empresas = await obterTodasEmpresas(empresaId);

            const empresa = empresas.find(emp => {
                if (!emp.attributes.cpfcnpj) return false;
                const cnpjEmpresa = String(emp.attributes.cpfcnpj).replace(/\D/g, '');
                return cnpjEmpresa === cnpjFormatado;
            });

            if (empresa) {
                console.log(`✅ Empresa encontrada na conta ${empresaId}: ID ${empresa.id} - Nome: ${empresa.attributes.nome}`);
                return { empresaId, empresa };
            }
        }

        throw new Error('Empresa não encontrada em nenhuma conta.');
    } catch (error) {
        console.error('❌ Erro ao obter empresa pelo CNPJ:', error.response?.data || error.message);
        throw new Error('Não foi possível obter a empresa.');
    }
};

// Buscar funcionário pelo nome ou CPF dentro da empresa correta
const obterFuncionarioPorNomeOuCPF = async (empresaId, empresaEpluginId, nomeOuCPF) => {
    try {
        console.log(`🔍 Buscando funcionário por Nome ou CPF na empresa ID ${empresaEpluginId} (conta ${empresaId})...`);
        const api = createApiInstance(empresaId);

        const response = await api.get(`/funcionarios?filter[empresaId]=${empresaEpluginId}`);
        const funcionarios = response.data.data;

        if (!funcionarios.length) throw new Error('Nenhum funcionário encontrado.');

        // Formatar CPF (remover caracteres especiais)
        const cpfFormatado = nomeOuCPF.replace(/\D/g, '').trim().toLowerCase();
        const nomeFormatado = nomeOuCPF.trim().toLowerCase();
        const primeiroNome = nomeFormatado.split(' ')[0]; // Pega apenas o primeiro nome

        // Filtrar por nome completo, primeiro nome ou CPF
        const funcionario = funcionarios.find(f =>
            f.attributes.nome.trim().toLowerCase() === nomeFormatado || // Nome completo
            f.attributes.nome.trim().toLowerCase().includes(primeiroNome) || // Primeiro nome
            (f.attributes.cpf && String(f.attributes.cpf).replace(/\D/g, '') === cpfFormatado) // CPF
        );

        if (!funcionario) throw new Error('Funcionário não encontrado.');

        console.log(`✅ Funcionário encontrado: ID ${funcionario.id} - Nome: ${funcionario.attributes.nome}`);
        return funcionario.id;
    } catch (error) {
        console.error(`❌ Erro ao obter funcionário na empresa ${empresaId}:`, error.response?.data || error.message);
        throw new Error('Não foi possível obter o funcionário.');
    }
};

// Buscar detalhes do funcionário
const obterDetalhesFuncionario = async (empresaId, funcionarioId) => {
    try {
        const api = createApiInstance(empresaId);
        const response = await api.get(`/funcionarios/${funcionarioId}`);
        return response.data.data.attributes;
    } catch (error) {
        console.error(`❌ Erro ao obter detalhes do funcionário na empresa ${empresaId}:`, error.response?.data || error.message);
        throw new Error('Não foi possível obter os detalhes do funcionário.');
    }
};

// Simular férias
const simularFerias = async (cnpj, nomeOuCPF, diasFerias, venderDias = null) => {
    try {
        console.log(`🚀 Iniciando simulação de férias para ${nomeOuCPF}`);

        const { empresaId, empresa } = await obterEmpresaPorCNPJ(cnpj);
        const funcionarioId = await obterFuncionarioPorNomeOuCPF(empresaId, empresa.id, nomeOuCPF);
        const detalhesFuncionario = await obterDetalhesFuncionario(empresaId, funcionarioId);
        const { salarioBase, admissao, nome } = detalhesFuncionario;

        const dataAdmissao = new Date(admissao);
        const hoje = new Date();
        const umAnoDepois = new Date(dataAdmissao);
        umAnoDepois.setFullYear(umAnoDepois.getFullYear() + 1);

        if (hoje < umAnoDepois) {
            throw new Error('Funcionário ainda não tem 1 ano de empresa para tirar férias.');
        }

        if (diasFerias === 30) {
            return calcularFerias(salarioBase, diasFerias, nome, false);
        }

        if (venderDias === null) {
            return {
                semVender: calcularFerias(salarioBase, diasFerias, nome, false),
                vendendo: calcularFerias(salarioBase, diasFerias, nome, true)
            };
        }

        return calcularFerias(salarioBase, diasFerias, nome, venderDias);
    } catch (error) {
        console.error('❌ Erro na simulação de férias:', error.message);
        throw new Error(error.message);
    }
};

// Funções auxiliares para cálculos financeiros
const calcularFerias = (salarioBase, diasFerias, nomeFuncionario, venderDias = false) => {
    const diasVendidos = venderDias ? 10 : 0;
    const valorFerias = (salarioBase / 30) * diasFerias;
    const tercoConstitucional = valorFerias / 3;
    const abonoPecuniario = (salarioBase / 30) * diasVendidos;
    const tercoSobreAbono = abonoPecuniario / 3;
    const totalBruto = valorFerias + tercoConstitucional + abonoPecuniario + tercoSobreAbono;

    return {
        funcionario: nomeFuncionario,
        salarioBase,
        diasFerias,
        diasVendidos,
        valorFerias: valorFerias.toFixed(2),
        tercoConstitucional: tercoConstitucional.toFixed(2),
        abonoPecuniario: abonoPecuniario.toFixed(2),
        tercoSobreAbono: tercoSobreAbono.toFixed(2),
        totalBruto: totalBruto.toFixed(2)
    };
};

const simularRescisao = async (cnpj, nomeOuCPF, dataDemissao, tipoRescisao) => {
    try {
        console.log(`🚀 Iniciando simulação de rescisão para ${nomeOuCPF}...`);

        const empresaId = await obterEmpresaPorCNPJ(cnpj);
        const funcionarioId = await obterFuncionarioPorNomeOuCPF(empresaId, nomeOuCPF);
        const detalhesFuncionario = await obterDetalhesFuncionario(funcionarioId);
        const { salarioBase, admissao, nome } = detalhesFuncionario;

        const dataAdmissao = new Date(admissao);
        const dataSaida = new Date(dataDemissao);
        const tempoEmpresaMeses = calcularTempoEmpresaMeses(dataAdmissao, dataSaida);

        if (dataSaida < dataAdmissao) {
            throw new Error('Data de demissão não pode ser anterior à admissão.');
        }

        let avisoPrevio = 0, multaFgts = 0, saldoSalario = 0, feriasVencidas = 0, feriasProporcionais = 0, decimoTerceiro = 0, fgts = 0;

        saldoSalario = calcularSaldoSalario(salarioBase, dataSaida);

        if (tipoRescisao === 'demissaoSemJustaCausa') {
            avisoPrevio = calcularAvisoPrevio(salarioBase, tempoEmpresaMeses);
            feriasProporcionais = calcularFeriasProporcionais(salarioBase, dataAdmissao, dataSaida);
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
            decimoTerceiro = calcularDecimoTerceiro(salarioBase, dataSaida);
            multaFgts = salarioBase * 0.4;
            fgts = salarioBase * 0.08 * tempoEmpresaMeses;

        } else if (tipoRescisao === 'pedidoDemissao') {
            feriasProporcionais = calcularFeriasProporcionais(salarioBase, dataAdmissao, dataSaida);
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
            decimoTerceiro = calcularDecimoTerceiro(salarioBase, dataSaida);

        } else if (tipoRescisao === 'demissaoPorJustaCausa') {
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
        } else {
            throw new Error('Tipo de rescisão inválido.');
        }

        return {
            funcionario: nome,
            tipoRescisao,
            salarioBase,
            saldoSalario: saldoSalario.toFixed(2),
            avisoPrevio: avisoPrevio.toFixed(2),
            feriasVencidas: feriasVencidas.toFixed(2),
            feriasProporcionais: feriasProporcionais.toFixed(2),
            decimoTerceiro: decimoTerceiro.toFixed(2),
            multaFgts: multaFgts.toFixed(2),
            fgts: fgts.toFixed(2),
            totalBruto: (saldoSalario + avisoPrevio + feriasVencidas + feriasProporcionais + decimoTerceiro + multaFgts).toFixed(2)
        };
    } catch (error) {
        console.error('❌ Erro na simulação de rescisão:', error.message);
        throw new Error(error.message);
    }
};

const calcularTempoEmpresaMeses = (dataAdmissao, dataSaida) => {
    return (dataSaida.getFullYear() - dataAdmissao.getFullYear()) * 12 + (dataSaida.getMonth() - dataAdmissao.getMonth());
};

const calcularSaldoSalario = (salarioBase, dataSaida) => {
    const diasTrabalhados = dataSaida.getDate();
    return (salarioBase / 30) * diasTrabalhados;
};

const calcularAvisoPrevio = (salarioBase, tempoEmpresaMeses) => {
    const avisoPrevioDias = tempoEmpresaMeses >= 12 ? 30 : 0;
    return (salarioBase / 30) * avisoPrevioDias;
};

const calcularFeriasVencidas = (salarioBase, dataAdmissao, dataSaida) => {
    return (dataSaida - dataAdmissao) >= 365 * 24 * 60 * 60 * 1000 ? salarioBase + salarioBase / 3 : 0;
};

const calcularFeriasProporcionais = (salarioBase, dataAdmissao, dataSaida) => {
    const mesesTrabalhados = calcularTempoEmpresaMeses(dataAdmissao, dataSaida) % 12;
    return ((salarioBase / 12) * mesesTrabalhados) + ((salarioBase / 12) * mesesTrabalhados) / 3;
};

const calcularDecimoTerceiro = (salarioBase, dataSaida) => {
    const mesesTrabalhados = calcularTempoEmpresaMeses(new Date(dataSaida.getFullYear(), 0, 1), dataSaida);
    return (salarioBase / 12) * mesesTrabalhados;
};


// 🟢 Buscar TODAS as empresas (de ambas as contas)
const fetchEmpresas = async () => {
    try {
        console.log('🔍 Buscando lista de empresas em todas as contas...');
        let todasEmpresas = [];

        // Verifica ambas as contas (empresa1 e empresa2)
        const empresaIds = ['empresa1', 'empresa2'];

        for (const empresaId of empresaIds) {
            console.log(`📡 Buscando empresas para ${empresaId}...`);
            const api = createApiInstance(empresaId);
            let empresas = [];
            let offset = 0;
            const limit = 100;
            let continuarBuscando = true;

            while (continuarBuscando) {
                const response = await api.get(`/empresas?page[limit]=${limit}&page[offset]=${offset}`);
                const empresasPagina = response.data.data || [];

                if (empresasPagina.length === 0) {
                    continuarBuscando = false;
                } else {
                    empresas = empresas.concat(empresasPagina.map(empresa => ({
                        cnpj: empresa.attributes.cpfcnpj.toString(),
                        nome: empresa.attributes.nome || "Nome desconhecido",
                        telefone: empresa.attributes.telefone || "Não informado",
                        externoId: empresa.attributes.externoid,
                        empresaId // 🔹 Mantemos o ID da conta para referência
                    })));
                    offset += limit;
                }
            }

            console.log(`📄 Total de empresas carregadas para ${empresaId}: ${empresas.length}`);
            todasEmpresas = todasEmpresas.concat(empresas);
        }

        console.log(`🏢 Total de empresas encontradas: ${todasEmpresas.length}`);
        return todasEmpresas;
    } catch (error) {
        console.error('❌ Erro ao buscar empresas:', error.response ? error.response.data : error.message);
        return [];
    }
};

// 🟢 Buscar empresa por nome ou CNPJ em qualquer uma das contas
const buscarEmpresaPorNomeOuCNPJ = async (termo) => {
    try {
        console.log(`🔍 Buscando empresa pelo termo:`, termo);

        // 🔹 Se termo for um array, pegar o primeiro valor
        if (Array.isArray(termo)) {
            console.warn("⚠️ Recebido um array. Pegando o primeiro item...");
            termo = termo.length > 0 ? termo[0] : '';
        }

        // 🔹 Se for um objeto, converter para string
        if (typeof termo === 'object' && termo !== null) {
            console.warn("⚠️ Recebido um objeto. Convertendo para string...");
            termo = JSON.stringify(termo);
        }

        // 🔹 Se ainda assim não for string ou for vazia, retornar erro
        if (typeof termo !== 'string' || termo.trim() === '') {
            console.error("❌ Erro: O termo precisa ser uma string válida.");
            return null;
        }

        const empresas = await fetchEmpresas();
        const termoFormatado = termo.replace(/\D/g, '').toLowerCase();

        const empresaEncontrada = empresas.find(emp =>
            emp.cnpj.replace(/\D/g, '') === termoFormatado ||
            emp.nome.toLowerCase().includes(termo.toLowerCase())
        );

        if (!empresaEncontrada) {
            console.warn(`⚠️ Empresa "${termo}" não encontrada.`);
            return null;
        }

        console.log(`✅ Empresa encontrada: ${empresaEncontrada.nome} (CNPJ: ${empresaEncontrada.cnpj}) na conta ${empresaEncontrada.empresaId}`);
        return empresaEncontrada;
    } catch (error) {
        console.error(`❌ Erro ao buscar empresa:`, error.message);
        return null;
    }
};


// 🟢 Buscar documentos de uma empresa específica com autenticação correta
const buscarDocumentosDaEmpresa = async (cnpj, empresaId) => {
    try {
        console.log(`🔍 Buscando documentos para empresa CNPJ: ${cnpj} na conta ${empresaId}`);
        
        // ✅ Criar a instância de requisição já com o token correto
        const api = createApiInstance(empresaId);

        let documentos = [];
        let offset = 0;
        const limit = 25;
        let hasMorePages = true;

        while (hasMorePages) {
            let url = `${DOCUMENTOS_API_URL}?filter[empresaId]=${encodeURIComponent(cnpj)}&sort=-criacao&page[limit]=${limit}&page[offset]=${offset}`;

            console.log(`🔗 Requisição para: ${url}`);

            // ✅ Agora a requisição será feita corretamente
            const response = await api.get(url);

            if (!response.data || !response.data.data) {
                console.warn(`⚠️ Resposta inesperada da API para empresa ${cnpj}:`, response.data);
                return [];
            }

            if (response.data.data.length > 0) {
                documentos = documentos.concat(response.data.data);
                offset += limit;
            } else {
                hasMorePages = false;
            }

            hasMorePages = response.data.links?.next ? true : false;
        }

        console.log(`📄 Total de documentos encontrados para empresa ${cnpj}: ${documentos.length}`);
        return documentos;
    } catch (error) {
        console.error(`❌ Erro ao buscar documentos para empresa ${cnpj}:`, error.response ? error.response.data : error.message);
        return [];
    }
};

// 🟢 Encontrar o documento correto baseado no tipo e mês
const buscarDetalhesDocumento = async (documentos, tipoDesejado, mesDesejado, empresaId) => {
    if (!documentos.length) return null;

    const mesFormatado = mesDesejado ? mesDesejado.toLowerCase() : '';
    const tipoFormatado = tipoDesejado ? tipoDesejado.toLowerCase() : '';
    const anoAtual = new Date().getFullYear();

    console.log(`🔍 Buscando documento EXATO do tipo "${tipoDesejado}" para o mês "${mesDesejado}"...`);

    const documentoEncontrado = documentos.find(doc => {
        const nomeDocumento = doc.attributes.titulo?.toLowerCase() || '';
        const descricaoDocumento = doc.attributes.descricao?.toLowerCase() || '';
        const dataCriacao = new Date(doc.attributes.criacao);
        const mesCriacao = dataCriacao.toLocaleString('pt-BR', { month: 'long' }).toLowerCase();
        const anoCriacao = dataCriacao.getFullYear();

        console.log(`📄 Verificando documento: "${nomeDocumento}" - Criado em ${mesCriacao}/${anoCriacao}`);

        // 🔹 Extraindo o mês e ano do título ou descrição
        const regexData = /(\d{2})\/(\d{4})/;
        const matchTitulo = nomeDocumento.match(regexData);
        const matchDescricao = descricaoDocumento.match(regexData);

        let mesDocumento = mesCriacao;
        let anoDocumento = anoCriacao;

        if (matchTitulo) {
            mesDocumento = getNomeMesPorNumero(matchTitulo[1]);
            anoDocumento = parseInt(matchTitulo[2], 10);
        } else if (matchDescricao) {
            mesDocumento = getNomeMesPorNumero(matchDescricao[1]);
            anoDocumento = parseInt(matchDescricao[2], 10);
        }

        console.log(`📄 Mês extraído: ${mesDocumento}/${anoDocumento}`);

        return (
            nomeDocumento.includes(tipoFormatado) &&
            mesDocumento === mesFormatado &&
            anoDocumento === anoAtual
        );
    });

    if (!documentoEncontrado) {
        console.warn(`⚠️ Nenhum documento EXATO correspondente encontrado.`);
        return null;
    }

    console.log(`✅ Documento EXATO encontrado: ${documentoEncontrado.attributes.titulo} - Criado em ${documentoEncontrado.attributes.criacao}`);

    // 🟢 Pegar o link relacionado ao documento para obter detalhes completos
    const relatedLink = documentoEncontrado.relationships?.arquivos?.links?.related;
    
    if (!relatedLink) {
        console.warn(`⚠️ Nenhum link relacionado encontrado para o documento.`);
        return documentoEncontrado;
    }

    console.log(`🔗 Buscando detalhes adicionais no link: ${relatedLink}`);

    // Fazer requisição GET para pegar os detalhes completos do documento
    try {
        const api = createApiInstance(empresaId);
        const response = await api.get(relatedLink);

        if (response.data?.data) {
            console.log(`✅ Detalhes do documento carregados com sucesso.`);
            return { ...documentoEncontrado, detalhes: response.data.data };
        } else {
            console.warn(`⚠️ Resposta inesperada ao buscar detalhes do documento.`);
            return documentoEncontrado;
        }
    } catch (error) {
        console.error(`❌ Erro ao buscar detalhes do documento:`, error.response ? error.response.data : error.message);
        return documentoEncontrado;
    }
};

// 🛠 Função auxiliar para converter número do mês em nome
const getNomeMesPorNumero = (numeroMes) => {
    const meses = {
        "01": "janeiro", "02": "fevereiro", "03": "março",
        "04": "abril", "05": "maio", "06": "junho",
        "07": "julho", "08": "agosto", "09": "setembro",
        "10": "outubro", "11": "novembro", "12": "dezembro"
    };
    return meses[numeroMes] || "";
};


const buscarDocumentoEspecifico = async (termoEmpresa, tipoDocumento, mes) => {
    try {
        if (typeof termoEmpresa !== 'string' || termoEmpresa.trim() === '') {
            console.error("❌ Erro: termoEmpresa precisa ser uma string válida.");
            return { erro: "Termo inválido para busca de empresa." };
        }

        console.log(`📄 Solicitando documento: Empresa: ${termoEmpresa}, Tipo: ${tipoDocumento}, Mês: ${mes}`);

        // 🔍 Buscar a empresa
        const empresa = await buscarEmpresaPorNomeOuCNPJ(termoEmpresa.trim());
        if (!empresa) return { erro: "Empresa não encontrada." };

        // 🔍 Buscar documentos
        const documentos = await buscarDocumentosDaEmpresa(empresa.cnpj, empresa.empresaId);
        if (!documentos.length) return { erro: "Nenhum documento encontrado para a empresa." };

        // 🔍 Filtrar o documento correto
        const documento = await buscarDetalhesDocumento(documentos, tipoDocumento, mes, empresa.empresaId);
        if (!documento) return { erro: "Nenhum documento correspondente encontrado." };

        return {
            empresa: empresa.nome,
            documento: documento.attributes.nome,
            dataCriacao: documento.attributes.criacao,
            url: documento.attributes.url || null,
            detalhes: documento.detalhes || null
        };
    } catch (error) {
        console.error("❌ Erro ao buscar documento:", error.message);
        return { erro: "Erro ao buscar documento." };
    }
};



module.exports = {
    obterTodasEmpresas,
    obterEmpresaPorCNPJ,
    obterFuncionarioPorNomeOuCPF,
    obterDetalhesFuncionario,
    simularFerias,
    fetchEmpresas,
    simularRescisao,
    buscarEmpresaPorNomeOuCNPJ,
    buscarDocumentoEspecifico
};
