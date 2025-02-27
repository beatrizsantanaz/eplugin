const express = require('express');
const {
    handleObterEmpresas,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao
} = require('../controllers/epluginController');
const { simularRescisao } = require('../services/epluginService'); // 🔥 Importando corretamente

const router = express.Router();

// Rota para listar todas as empresas cadastradas
router.get('/empresas', handleObterEmpresas);

// Rota para listar funcionários de uma empresa específica
router.get('/funcionarios', handleObterFuncionariosPorEmpresa);

// Rotas para simulação de férias e rescisão
router.post('/simulacao/ferias', handleSimulacaoFerias);
router.post('/simulacao/rescisao', handleSimulacaoRescisao); // 🔥 Ajustando para chamar a função do controller

module.exports = router;
