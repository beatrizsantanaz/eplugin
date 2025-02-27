const express = require('express');
const { handleSimulacaoRescisao } = require('../controllers/epluginController');

const router = express.Router();

router.get('/empresas', handleObterEmpresas);
router.get('/funcionarios', handleObterFuncionariosPorEmpresa);
router.post('/simulacao/ferias', handleSimulacaoFerias);
router.post('/simulacao/rescisao', handleSimulacaoRescisao);

module.exports = router;
