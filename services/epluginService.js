const axios = require('axios');
const { getTokenForEmpresa } = require('../config/epluginConfig');

const BASE_URL = 'https://dp.pack.alterdata.com.br/api/v1'; // Defina a URL base da API

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

module.exports = {
    obterTodasEmpresas,
    obterEmpresaPorCNPJ,
    obterFuncionarioPorNomeOuCPF,
    obterDetalhesFuncionario,
    simularFerias
};
