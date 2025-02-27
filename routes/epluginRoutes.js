const express = require('express');
const {
    handleObterEmpresas,
    handleObterFuncionariosPorEmpresa,
    handleSimulacaoFerias,
    handleSimulacaoRescisao // 🔥 Importando a função correta do controller
} = require(`${__dirname}/../controllers/epluginController`);

const router = express.Router();

// Rota para listar todas as empresas cadastradas
router.get('/empresas', handleObterEmpresas);

// Rota para listar funcionários de uma empresa específica
router.get('/funcionarios', handleObterFuncionariosPorEmpresa);

// Rotas para simulação de férias e rescisão
router.post('/simulacao/ferias', handleSimulacaoFerias);
router.post('/simulacao/rescisao', handleSimulacaoRescisao); // 🔥 Agora está chamando o controller corretamente

module.exports = router;
