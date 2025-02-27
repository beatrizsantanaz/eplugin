const {
    obterEmpresas,
    obterFuncionariosPorEmpresa,
    simularFerias,
    simularRescisao
} = require('../services/epluginService');

// Controlador para listar as empresas
const handleObterEmpresas = async (req, res) => {
    try {
        const empresas = await obterEmpresas();
        res.json(empresas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const handleObterFuncionariosPorEmpresa = async (req, res) => {
    try {
        const empresaId = req.query.empresaId || req.params.empresaId;
        console.log("📌 Empresa ID recebido:", empresaId);

        if (!empresaId) {
            return res.status(400).json({ error: 'O ID da empresa é obrigatório.' });
        }

        const funcionarios = await obterFuncionariosPorEmpresa(empresaId);
        res.json(funcionarios);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Controlador para simular férias
const handleSimulacaoFerias = async (req, res) => {
    try {
        const { cnpj, nomeFuncionario, diasFerias } = req.body;

        if (!cnpj || !nomeFuncionario || !diasFerias) {
            return res.status(400).json({ error: 'CNPJ, nome do funcionário e dias de férias são obrigatórios.' });
        }

        const resultado = await simularFerias(cnpj, nomeFuncionario, diasFerias);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


// Controlador para simular rescisão
const handleSimulacaoRescisao = async (req, res) => {
    try {
        const { cnpj, nomeOuCPF, dataDemissao, tipoRescisao } = req.body;
        const resultado = await simularRescisao(cnpj, nomeOuCPF, dataDemissao, tipoRescisao);
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    handleObterEmpresas,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao };
