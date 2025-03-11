const express = require('express');
const {
    handleObterTodasEmpresas,
    handleObterEmpresaPorCNPJ,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao
} = require('../controllers/epluginController'); // ✅ Caminho correto

const router = express.Router();

// Rota para listar todas as empresas cadastradas
router.get('/empresas', handleObterTodasEmpresas);

// Rota para buscar uma empresa pelo CNPJ
router.get('/empresa/:cnpj', handleObterEmpresaPorCNPJ);

// Rota para listar funcionários de uma empresa específica
router.get('/funcionarios', handleObterFuncionariosPorEmpresa);

// Rotas para simulação de férias e rescisão
router.post('/simular-ferias', handleSimulacaoFerias);
router.post('/simular-rescisao', handleSimulacaoRescisao); // 🔥 Corrigida para seguir o padrão

module.exports = router;
