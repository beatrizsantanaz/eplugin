const {
    obterTodasEmpresas,
    obterEmpresaPorCNPJ,
    obterFuncionarioPorNomeOuCPF,
    obterDetalhesFuncionario,
    simularFerias,
    simularRescisao
} = require('../services/epluginService');
const { buscarDocumentoEspecifico } = require('../services/epluginService');
const axios = require('axios');
require('dotenv').config();

const WEBHOOK_URL = "https://contabhub.app.n8n.cloud/webhook/32d4027e-cb57-49b1-85d5-76a472d001d0";



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

// Controlador para buscar documento baseado na solicitação do cliente
// Controlador para buscar documento baseado na solicitação do cliente
const handleBuscarDocumento = async (req, res) => {
    try {
        const { empresa, tipoDocumento, mes, telefone } = req.body;

        if (!empresa || !tipoDocumento || !telefone) {
            return res.status(400).json({ erro: "Empresa, tipo de documento e telefone são obrigatórios." });
        }

        console.log(`📄 Solicitando documento: Empresa: ${empresa}, Tipo: ${tipoDocumento}, Mês: ${mes || "qualquer mês"}`);

        const resultado = await buscarDocumentoEspecifico(empresa, tipoDocumento, mes);
        const payloadWebhook = { ...resultado, telefone };

        // 🚀 **Responde ao cliente IMEDIATAMENTE**
        res.json(payloadWebhook);

        // 🔥 **Envia o webhook em SEGUNDO PLANO para evitar bloqueios**
        if (WEBHOOK_URL) {
            console.log(`🚀 Enviando webhook para: ${WEBHOOK_URL}`);
            console.log(`📡 Payload do webhook:`, JSON.stringify(payloadWebhook));

            axios.post(WEBHOOK_URL, payloadWebhook)
                .then(() => console.log("✅ Webhook enviado com sucesso."))
                .catch(err => console.error("❌ Erro ao enviar webhook:", err.response ? err.response.data : err.message));
        }

    } catch (error) {
        console.error("❌ Erro no handler de busca de documento:", error.message);
        return res.status(500).json({ erro: "Erro interno ao buscar documento." });
    }
};


module.exports = {
    handleObterTodasEmpresas,
    handleBuscarDocumento,
    handleObterEmpresaPorCNPJ,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao
};
