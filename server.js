const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const epluginRoutes = require('./routes/epluginRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares essenciais
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: '*' })); // 🔥 Isso permite que qualquer domínio acesse a API
app.use(express.json());

// Rotas principais
app.use('/api/eplugin', epluginRoutes);

// Rota padrão para testar se está funcionando
app.get('/', (req, res) => {
    res.json({ message: "API rodando na Vercel!" });
});

// Tratamento de erro para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
});

// Iniciar servidor apenas se rodando localmente
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
