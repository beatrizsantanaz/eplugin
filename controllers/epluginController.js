const {
    obterTodasEmpresas,
    obterEmpresaPorCNPJ,
    obterFuncionarioPorNomeOuCPF,
    obterDetalhesFuncionario,
    simularFerias,
    simularRescisao
} = require('../services/epluginService');

// Controlador para listar todas as empresas
const handleObterTodasEmpresas = async (req, res) => {
    try {
        const { empresaId } = req.query;

        if (!empresaId) {
            return res.status(400).json({ error: 'O ID da empresa é obrigatório para buscar as empresas.' });
        }

        const empresas = await obterTodasEmpresas(empresaId);
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para buscar empresa pelo CNPJ
const handleObterEmpresaPorCNPJ = async (req, res) => {
    try {
        const { cnpj } = req.params;

        if (!cnpj) {
            return res.status(400).json({ error: 'O CNPJ é obrigatório.' });
        }

        const empresa = await obterEmpresaPorCNPJ(cnpj);
        res.json(empresa);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para buscar funcionários de uma empresa
const handleObterFuncionariosPorEmpresa = async (req, res) => {
    try {
        const { cnpj, nomeOuCPF } = req.query;

        if (!cnpj || !nomeOuCPF) {
            return res.status(400).json({ error: 'CNPJ e Nome ou CPF são obrigatórios.' });
        }

        // Identificar qual empresa esse CNPJ pertence
        const { empresaId, empresa } = await obterEmpresaPorCNPJ(cnpj);
        const funcionarioId = await obterFuncionarioPorNomeOuCPF(empresaId, empresa.id, nomeOuCPF);

        const detalhesFuncionario = await obterDetalhesFuncionario(empresaId, funcionarioId);
        res.json(detalhesFuncionario);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para simular férias
const handleSimulacaoFerias = async (req, res) => {
    try {
        const { cnpj, nomeFuncionario, diasFerias, venderDias } = req.body;

        if (!cnpj || !nomeFuncionario || !diasFerias) {
            return res.status(400).json({ error: 'CNPJ, nome do funcionário e dias de férias são obrigatórios.' });
        }

        const resultado = await simularFerias(cnpj, nomeFuncionario, diasFerias, venderDias);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para simular rescisão
const handleSimulacaoRescisao = async (req, res) => {
    try {
        const { cnpj, nomeOuCPF, dataDemissao, tipoRescisao } = req.body;

        if (!cnpj || !nomeOuCPF || !dataDemissao || !tipoRescisao) {
            return res.status(400).json({ error: 'CNPJ, nome ou CPF, data de demissão e tipo de rescisão são obrigatórios.' });
        }

        const resultado = await simularRescisao(cnpj, nomeOuCPF, dataDemissao, tipoRescisao);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    handleObterTodasEmpresas,
    handleObterEmpresaPorCNPJ,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao
};
