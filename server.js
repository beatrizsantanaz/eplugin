require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const epluginRoutes = require('./routes/epluginRoutes');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Rotas do ePlugin
app.use('/api/eplugin', epluginRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
