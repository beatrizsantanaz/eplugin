const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require("path"); // ✅ Importando o módulo path corretamente

const epluginRoutes = require('./routes/epluginRoutes'); // ✅ Importação correta das rotas

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Rotas principais
app.use('/api/eplugin', epluginRoutes);

// Tratamento de erro para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
});

// Iniciando o servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
