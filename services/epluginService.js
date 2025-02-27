const axios = require('axios');
const { BASE_URL, TOKEN } = require('../config/epluginConfig');

const epluginApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
    }
});

// Obter todas as empresas
const obterTodasEmpresas = async () => {
    try {
        console.log(`🔍 Buscando todas as empresas com paginação...`);

        let empresas = [];
        let offset = 0;
        const limit = 100;
        let continuarBuscando = true;

        while (continuarBuscando) {
            const response = await epluginApi.get(`/empresas?page[limit]=${limit}&page[offset]=${offset}`);
            const empresasPagina = response.data.data;

            if (empresasPagina.length === 0) {
                continuarBuscando = false;
            } else {
                empresas = empresas.concat(empresasPagina);
                offset += limit;
            }
        }

        console.log(`📄 Total de empresas carregadas: ${empresas.length}`);
        return empresas;
    } catch (error) {
        console.error('❌ Erro ao buscar todas as empresas:', error.response?.data || error.message);
        throw new Error('Não foi possível carregar todas as empresas.');
    }
};

// Buscar empresa pelo CNPJ
const obterEmpresaPorCNPJ = async (cnpj) => {
    try {
        console.log(`🔍 Buscando empresa com CNPJ: ${cnpj}`);
        const cnpjFormatado = cnpj.replace(/\D/g, '');
        const empresas = await obterTodasEmpresas();

        const empresa = empresas.find(emp => {
            if (!emp.attributes.cpfcnpj) return false;
            const cnpjEmpresa = String(emp.attributes.cpfcnpj).replace(/\D/g, '');
            return cnpjEmpresa === cnpjFormatado;
        });

        if (!empresa) throw new Error('Empresa não encontrada.');

        console.log(`✅ Empresa encontrada: ID ${empresa.id} - Nome: ${empresa.attributes.nome}`);
        return empresa.id;
    } catch (error) {
        console.error('❌ Erro ao obter empresa pelo CNPJ:', error.response?.data || error.message);
        throw new Error('Não foi possível obter a empresa.');
    }
};

// Buscar funcionário pelo nome ou CPF dentro da empresa correta
const obterFuncionarioPorNomeOuCPF = async (empresaId, nomeOuCPF) => {
    try {
        console.log(`🔍 Buscando funcionário por Nome ou CPF na empresa ID ${empresaId}...`);

        const response = await epluginApi.get(`/funcionarios?filter[empresaId]=${empresaId}`);
        const funcionarios = response.data.data;

        if (!funcionarios.length) throw new Error('Nenhum funcionário encontrado.');

        // Formatar CPF (remover caracteres especiais)
        const cpfFormatado = nomeOuCPF.replace(/\D/g, '').trim().toLowerCase();
        const nomeFormatado = nomeOuCPF.trim().toLowerCase();
        const primeiroNome = nomeFormatado.split(' ')[0]; // Pega apenas o primeiro nome

        // Filtrar por nome completo, primeiro nome ou CPF
        const funcionario = funcionarios.find(f =>
            f.attributes.nome.trim().toLowerCase() === nomeFormatado || // Nome completo
            f.attributes.nome.trim().toLowerCase().includes(primeiroNome) || // Primeiro nome
            (f.attributes.cpf && String(f.attributes.cpf).replace(/\D/g, '') === cpfFormatado) // CPF
        );

        if (!funcionario) throw new Error('Funcionário não encontrado.');

        console.log(`✅ Funcionário encontrado: ID ${funcionario.id} - Nome: ${funcionario.attributes.nome}`);
        return funcionario.id;
    } catch (error) {
        console.error('❌ Erro ao obter funcionário:', error.response?.data || error.message);
        throw new Error('Não foi possível obter o funcionário.');
    }
};

// Buscar detalhes do funcionário
const obterDetalhesFuncionario = async (funcionarioId) => {
    try {
        const response = await epluginApi.get(`/funcionarios/${funcionarioId}`);
        return response.data.data.attributes;
    } catch (error) {
        console.error('❌ Erro ao obter detalhes do funcionário:', error.response?.data || error.message);
        throw new Error('Não foi possível obter os detalhes do funcionário.');
    }
};

// Cálculo de férias atualizado
const calcularFerias = (salarioBase, diasFerias, nomeFuncionario, venderDias = false) => {
    const diasVendidos = venderDias ? 10 : 0;
    const valorFerias = (salarioBase / 30) * diasFerias;
    const tercoConstitucional = valorFerias / 3;
    const abonoPecuniario = (salarioBase / 30) * diasVendidos;
    const tercoSobreAbono = abonoPecuniario / 3;
    const totalBruto = valorFerias + tercoConstitucional + abonoPecuniario + tercoSobreAbono;

    const inss = calcularINSS(totalBruto);
    const irrf = calcularIRRF(totalBruto - inss);
    const totalLiquido = totalBruto - inss - irrf;

    return {
        funcionario: nomeFuncionario,
        salarioBase,
        diasFerias,
        diasVendidos,
        valorFerias: valorFerias.toFixed(2),
        tercoConstitucional: tercoConstitucional.toFixed(2),
        abonoPecuniario: abonoPecuniario.toFixed(2),
        tercoSobreAbono: tercoSobreAbono.toFixed(2),
        totalBruto: totalBruto.toFixed(2),
        inss: inss.toFixed(2),
        irrf: irrf.toFixed(2),
        totalLiquido: totalLiquido.toFixed(2),
        vendeuFerias: venderDias ? "Sim" : "Não"
    };
};

// Simulação de férias
const simularFerias = async (cnpj, nomeOuCPF, diasFerias, venderDias = null) => {
    try {
        console.log(`🚀 Iniciando simulação de férias para ${nomeOuCPF}`);

        const empresaId = await obterEmpresaPorCNPJ(cnpj);
        const funcionarioId = await obterFuncionarioPorNomeOuCPF(empresaId, nomeOuCPF);
        const detalhesFuncionario = await obterDetalhesFuncionario(funcionarioId);
        const { salarioBase, admissao, nome } = detalhesFuncionario;

        const dataAdmissao = new Date(admissao);
        const hoje = new Date();
        const umAnoDepois = new Date(dataAdmissao);
        umAnoDepois.setFullYear(umAnoDepois.getFullYear() + 1);

        if (hoje < umAnoDepois) {
            throw new Error('Funcionário ainda não tem 1 ano de empresa para tirar férias.');
        }

        // 🚨 REGRA: Se o funcionário tirar 30 dias, ele NÃO pode vender férias.
        if (diasFerias === 30) {
            console.log("🔴 Funcionário está tirando 30 dias de férias. Venda de férias não permitida.");
            return calcularFerias(salarioBase, diasFerias, nome, false);
        }

        // Se `venderDias` for nulo, retornamos ambas as possibilidades, exceto quando `diasFerias === 30`
        if (venderDias === null) {
            return {
                semVender: calcularFerias(salarioBase, diasFerias, nome, false),
                vendendo: calcularFerias(salarioBase, diasFerias, nome, true)
            };
        }

        return calcularFerias(salarioBase, diasFerias, nome, venderDias);
    } catch (error) {
        console.error('❌ Erro na simulação de férias:', error.message);
        throw new Error(error.message);
    }
};

// Cálculo do INSS e IRRF
const calcularINSS = (salario) => {
    if (salario <= 1412) return salario * 0.075;
    if (salario <= 2666.68) return salario * 0.09 - 21.18;
    if (salario <= 4000.03) return salario * 0.12 - 101.18;
    if (salario <= 7786.02) return salario * 0.14 - 181.18;
    return 908.86;
};

const calcularIRRF = (salario) => {
    const baseCalculo = salario - 528;
    if (baseCalculo <= 2112) return 0;
    if (baseCalculo <= 2826.65) return baseCalculo * 0.075 - 158.40;
    if (baseCalculo <= 3751.05) return baseCalculo * 0.15 - 370.40;
    if (baseCalculo <= 4664.68) return baseCalculo * 0.225 - 651.73;
    return baseCalculo * 0.275 - 884.96;
};

//A PARTIR DAQUI, FALAMOS DA RESCISÃO!

const simularRescisao = async (cnpj, nomeOuCPF, dataDemissao, tipoRescisao) => {
    try {
        console.log(`🚀 Iniciando simulação de rescisão para ${nomeOuCPF}...`);

        const empresaId = await obterEmpresaPorCNPJ(cnpj);
        const funcionarioId = await obterFuncionarioPorNomeOuCPF(empresaId, nomeOuCPF);
        const detalhesFuncionario = await obterDetalhesFuncionario(funcionarioId);
        const { salarioBase, admissao, nome } = detalhesFuncionario;

        const dataAdmissao = new Date(admissao);
        const dataSaida = new Date(dataDemissao);
        const tempoEmpresaMeses = calcularTempoEmpresaMeses(dataAdmissao, dataSaida);

        if (dataSaida < dataAdmissao) {
            throw new Error('Data de demissão não pode ser anterior à admissão.');
        }

        // Calcular cada item da rescisão com base no tipo de rescisão
        let avisoPrevio = 0, multaFgts = 0, saldoSalario = 0, feriasVencidas = 0, feriasProporcionais = 0, decimoTerceiro = 0, fgts = 0;

        saldoSalario = calcularSaldoSalario(salarioBase, dataSaida);

        if (tipoRescisao === 'demissaoSemJustaCausa') {
            avisoPrevio = calcularAvisoPrevio(salarioBase, tempoEmpresaMeses);
            feriasProporcionais = calcularFeriasProporcionais(salarioBase, dataAdmissao, dataSaida);
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
            decimoTerceiro = calcularDecimoTerceiro(salarioBase, dataSaida);
            multaFgts = salarioBase * 0.4;
            fgts = salarioBase * 0.08 * tempoEmpresaMeses; // 8% do FGTS mensal acumulado

        } else if (tipoRescisao === 'pedidoDemissao') {
            feriasProporcionais = calcularFeriasProporcionais(salarioBase, dataAdmissao, dataSaida);
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
            decimoTerceiro = calcularDecimoTerceiro(salarioBase, dataSaida);
            // Sem aviso prévio e sem multa FGTS
        } else if (tipoRescisao === 'demissaoPorJustaCausa') {
            // Apenas saldo de salário e férias vencidas
            feriasVencidas = calcularFeriasVencidas(salarioBase, dataAdmissao, dataSaida);
        } else {
            throw new Error('Tipo de rescisão inválido.');
        }

        return {
            funcionario: nome,
            tipoRescisao,
            salarioBase,
            saldoSalario: saldoSalario.toFixed(2),
            avisoPrevio: avisoPrevio.toFixed(2),
            feriasVencidas: feriasVencidas.toFixed(2),
            feriasProporcionais: feriasProporcionais.toFixed(2),
            decimoTerceiro: decimoTerceiro.toFixed(2),
            multaFgts: multaFgts.toFixed(2),
            fgts: fgts.toFixed(2),
            totalBruto: (saldoSalario + avisoPrevio + feriasVencidas + feriasProporcionais + decimoTerceiro + multaFgts).toFixed(2)
        };
    } catch (error) {
        console.error('❌ Erro na simulação de rescisão:', error.message);
        throw new Error(error.message);
    }
};

const calcularTempoEmpresaMeses = (dataAdmissao, dataSaida) => {
    return (dataSaida.getFullYear() - dataAdmissao.getFullYear()) * 12 + (dataSaida.getMonth() - dataAdmissao.getMonth());
};

const calcularSaldoSalario = (salarioBase, dataSaida) => {
    const diasTrabalhados = dataSaida.getDate();
    return (salarioBase / 30) * diasTrabalhados;
};

const calcularAvisoPrevio = (salarioBase, tempoEmpresaMeses) => {
    const avisoPrevioDias = tempoEmpresaMeses >= 12 ? 30 : 0;
    return (salarioBase / 30) * avisoPrevioDias;
};

const calcularFeriasVencidas = (salarioBase, dataAdmissao, dataSaida) => {
    return (dataSaida - dataAdmissao) >= 365 * 24 * 60 * 60 * 1000 ? salarioBase + salarioBase / 3 : 0;
};

const calcularFeriasProporcionais = (salarioBase, dataAdmissao, dataSaida) => {
    const mesesTrabalhados = calcularTempoEmpresaMeses(dataAdmissao, dataSaida) % 12;
    return ((salarioBase / 12) * mesesTrabalhados) + ((salarioBase / 12) * mesesTrabalhados) / 3;
};

const calcularDecimoTerceiro = (salarioBase, dataSaida) => {
    const mesesTrabalhados = calcularTempoEmpresaMeses(new Date(dataSaida.getFullYear(), 0, 1), dataSaida);
    return (salarioBase / 12) * mesesTrabalhados;
};

module.exports = {
    simularFerias,
    simularRescisao // 🔥 Certifique-se de exportar essa função!
};
