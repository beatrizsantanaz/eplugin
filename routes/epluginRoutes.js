const express = require('express');
const {
    handleObterTodasEmpresas,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao
} = require('../controllers/epluginController'); // ✅ Caminho correto



const router = express.Router();

// Rota para listar todas as empresas cadastradas
router.get('/empresas', handleObterTodasEmpresas);

// Rota para listar funcionários de uma empresa específica
router.get('/funcionarios', handleObterFuncionariosPorEmpresa);

// Rotas para simulação de férias e rescisão
router.post('/simulacao/ferias', handleSimulacaoFerias);
router.post('/simulacao/rescisao', handleSimulacaoRescisao); // 🔥 Agora está chamando o controller corretamente

module.exports = router;