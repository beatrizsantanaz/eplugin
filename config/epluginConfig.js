require('dotenv').config();

const config = {
  tokens: {
    empresa1: process.env.EPLUGIN_TOKEN_EMPRESA_1,
    empresa2: process.env.EPLUGIN_TOKEN_EMPRESA_2
  }
};

const getTokenForEmpresa = (empresaId) => {
  if (empresaId === 'empresa1') {
    return config.tokens.empresa1;
  } else if (empresaId === 'empresa2') {
    return config.tokens.empresa2;
  }
  return null;
};

module.exports = { config, getTokenForEmpresa };
