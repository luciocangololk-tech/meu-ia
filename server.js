require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const { PDFParse } = require("pdf-parse");

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// CONFIGURAÇÃO DO OLLAMA CLOUD
// ===============================

const OLLAMA_URL = "https://ollama.com";

const OLLAMA_API_KEY =
    process.env.OLLAMA_API_KEY;

const MODELO_TEXTO = "gemma4:cloud";
const MODELO_IMAGEM = "gemma4:cloud";

// ===============================
// VERIFICAR CHAVE
// ===============================

if (!OLLAMA_API_KEY) {

    console.log("");
    console.log("⚠️ AVISO:");
    console.log("OLLAMA_API_KEY não encontrada.");
    console.log("Verifica o teu ficheiro .env");
    console.log("");
}

// ===============================
// FICHEIRO DE MEMÓRIA
// ===============================

const ARQUIVO_MEMORIA = path.join(
    __dirname,
    "memoria.json"
);

// ===============================
// EXPRESS
// ===============================

app.use(express.json({
    limit: "30mb"
}));

app.use(express.static(__dirname));

// ===============================
// MEMÓRIA
// ===============================

function memoriaPadrao() {

    return {

        nome: "",

        gosta_de: [],

        jogo_favorito: "",

        cor_favorita: "",

        comida_favorita: "",

        notas: []
    };
}

function carregarMemoria() {

    try {

        if (
            !fs.existsSync(
                ARQUIVO_MEMORIA
            )
        ) {

            return memoriaPadrao();
        }

        const dados =
            fs.readFileSync(
                ARQUIVO_MEMORIA,
                "utf8"
            );

        return JSON.parse(dados);

    } catch (erro) {

        console.log(
            "Erro ao carregar memória:",
            erro.message
        );

        return memoriaPadrao();
    }
}

function guardarMemoria(memoria) {

    try {

        fs.writeFileSync(

            ARQUIVO_MEMORIA,

            JSON.stringify(
                memoria,
                null,
                2
            ),

            "utf8"
        );

    } catch (erro) {

        console.log(
            "Erro ao guardar memória:",
            erro.message
        );
    }
}

let memoria =
    carregarMemoria();

// ===============================
// ATUALIZAR MEMÓRIA
// ===============================

function atualizarMemoria(texto) {

    if (!texto) return;

    const t =
        texto.toLowerCase();

    const nome =
        texto.match(
            /(?:meu nome é|me chamo|chamo-me)\s+([a-záàâãéêíóôõúç]+)/i
        );

    if (nome) {

        memoria.nome =
            nome[1];
    }

    if (
        t.includes("eu gosto de") ||
        t.includes("gosto de")
    ) {

        const resultado =
            texto.match(
                /gosto de\s+(.+)/i
            );

        if (
            resultado &&
            resultado[1]
        ) {

            const coisa =
                resultado[1]
                    .replace(
                        /[.!?]+$/,
                        ""
                    )
                    .trim();

            if (
                coisa &&
                !memoria.gosta_de.includes(
                    coisa
                )
            ) {

                memoria.gosta_de.push(
                    coisa
                );
            }
        }
    }

    const jogo =
        texto.match(
            /(?:meu jogo favorito é|meu jogo preferido é)\s+(.+)/i
        );

    if (
        jogo &&
        jogo[1]
    ) {

        memoria.jogo_favorito =
            jogo[1]
                .replace(
                    /[.!?]+$/,
                    ""
                )
                .trim();
    }

    const cor =
        texto.match(
            /(?:minha cor favorita é|minha cor preferida é)\s+(.+)/i
        );

    if (
        cor &&
        cor[1]
    ) {

        memoria.cor_favorita =
            cor[1]
                .replace(
                    /[.!?]+$/,
                    ""
                )
                .trim();
    }

    const comida =
        texto.match(
            /(?:minha comida favorita é|minha comida preferida é)\s+(.+)/i
        );

    if (
        comida &&
        comida[1]
    ) {

        memoria.comida_favorita =
            comida[1]
                .replace(
                    /[.!?]+$/,
                    ""
                )
                .trim();
    }

    const nota =
        texto.match(
            /(?:lembra que|lembre que)\s+(.+)/i
        );

    if (
        nota &&
        nota[1]
    ) {

        const novaNota =
            nota[1]
                .replace(
                    /[.!?]+$/,
                    ""
                )
                .trim();

        if (
            novaNota &&
            !memoria.notas.includes(
                novaNota
            )
        ) {

            memoria.notas.push(
                novaNota
            );
        }
    }

    guardarMemoria(
        memoria
    );
}

// ===============================
// MEMÓRIA EM TEXTO
// ===============================

function memoriaParaTexto() {

    const partes = [];

    if (memoria.nome) {

        partes.push(
            `Nome do utilizador: ${memoria.nome}`
        );
    }

    if (
        memoria.gosta_de &&
        memoria.gosta_de.length
    ) {

        partes.push(
            `Gosta de: ${memoria.gosta_de.join(", ")}`
        );
    }

    if (
        memoria.jogo_favorito
    ) {

        partes.push(
            `Jogo favorito: ${memoria.jogo_favorito}`
        );
    }

    if (
        memoria.cor_favorita
    ) {

        partes.push(
            `Cor favorita: ${memoria.cor_favorita}`
        );
    }

    if (
        memoria.comida_favorita
    ) {

        partes.push(
            `Comida favorita: ${memoria.comida_favorita}`
        );
    }

    if (
        memoria.notas &&
        memoria.notas.length
    ) {

        partes.push(
            `Notas: ${memoria.notas
                .slice(-5)
                .join("; ")}`
        );
    }

    if (!partes.length) {

        return (
            "Não há informações guardadas sobre o utilizador."
        );
    }

    return partes.join(
        "\n"
    );
}

// ===============================
// LIMITAR TEXTO
// ===============================

function limitarTexto(
    texto,
    limite = 2500
) {

    if (!texto) {

        return "";
    }

    if (
        texto.length <=
        limite
    ) {

        return texto;
    }

    return (
        texto.slice(
            0,
            limite
        ) +
        "\n[Conteúdo cortado.]"
    );
}

// ===============================
// HISTÓRICO
// ===============================

function prepararHistorico(
    messages
) {

    if (
        !Array.isArray(messages)
    ) {

        return [];
    }

    const ultimas =
        messages.slice(-4);

    return ultimas.map(
        function(mensagem) {

            let role =
                "user";

            if (
                mensagem.role ===
                "assistant"
            ) {

                role =
                    "assistant";
            }

            if (
                mensagem.role ===
                "system"
            ) {

                role =
                    "system";
            }

            let content =
                mensagem.content;

            if (
                typeof content ===
                "string"
            ) {

                content =
                    limitarTexto(
                        content,
                        1200
                    );
            }

            return {

                role:
                    role,

                content:
                    content
            };
        }
    );
}

// ===============================
// LER PDF
// ===============================

async function lerPDF(
    base64
) {

    try {

        const buffer =
            Buffer.from(
                base64,
                "base64"
            );

        const parser =
            new PDFParse({
                data: buffer
            });

        const resultado =
            await parser.getText();

        await parser.destroy();

        return limitarTexto(
            resultado.text || "",
            6000
        );

    } catch (erro) {

        console.log(
            "Erro ao ler PDF:",
            erro.message
        );

        return "";
    }
}

// ===============================
// SISTEMA DA IA
// ===============================

function criarSistema(
    temImagem = false
) {

    let sistema = `
Tu és o Meu AI.

REGRA PRINCIPAL:
Responde sempre em português.

Nunca respondas em espanhol ou inglês,
a menos que o utilizador peça explicitamente.

Sê natural, simples e direto.

Não repitas a pergunta.

Não inventes informações.

Para perguntas simples, responde de forma curta.

Quando for necessário explicar, usa passos claros.

Ajuda o utilizador de forma amigável.

Memória do utilizador:

${memoriaParaTexto()}
`;

    if (temImagem) {

        sistema += `
O utilizador enviou uma imagem.

Analisa a imagem e responde à pergunta sobre ela.
`;
    }

    return sistema;
}
// ===============================
// LIMPAR BASE64 DA IMAGEM
// ===============================

function limparBase64Imagem(
    imagem
) {

    if (!imagem) {

        return "";
    }

    if (
        typeof imagem === "object" &&
        imagem.data
    ) {

        imagem =
            imagem.data;
    }

    if (
        typeof imagem !==
        "string"
    ) {

        return "";
    }

    if (
        imagem.includes(",")
    ) {

        return imagem.split(
            ","
        )[1];
    }

    return imagem;
}

// ===============================
// FALAR COM OLLAMA CLOUD
// ===============================

async function falarComOllama(
    modelo,
    mensagens,
    temImagem = false
) {

    const controlador =
        new AbortController();

    const temporizador =
        setTimeout(
            () =>
                controlador.abort(),
            120000
        );

    try {

        const resposta =
            await fetch(
                `${OLLAMA_URL}/api/chat`,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${OLLAMA_API_KEY}`
                    },

                    body:
                        JSON.stringify({

                            model:
                                modelo,

                            messages:
                                mensagens,

                            stream:
                                false,

                            options: {

                                num_predict:
                                    temImagem
                                        ? 160
                                        : 80,

                                temperature:
                                    0.4
                            }
                        }),

                    signal:
                        controlador.signal
                }
            );

        if (!resposta.ok) {

            const erroTexto =
                await resposta.text();

            throw new Error(
                `Ollama respondeu ${resposta.status}: ${erroTexto}`
            );
        }

        return await resposta.json();

    } finally {

        clearTimeout(
            temporizador
        );
    }
}

// ===============================
// CHAT
// ===============================

app.post(
    "/api/chat",
    async function(req, res) {

        try {

            const {

                messages = [],

                file = null,

                image = null

            } = req.body;

            // =========================
            // ÚLTIMA MENSAGEM
            // =========================

            const ultimaMensagem =

                Array.isArray(
                    messages
                ) &&
                messages.length

                    ? messages[
                        messages.length - 1
                    ]

                    : null;

            const textoUsuario =

                ultimaMensagem &&

                typeof ultimaMensagem.content ===
                "string"

                    ? ultimaMensagem.content

                    : "";

            // =========================
            // MEMÓRIA
            // =========================

            if (textoUsuario) {

                atualizarMemoria(
                    textoUsuario
                );
            }

            // =========================
            // HISTÓRICO
            // =========================

            const historico =
                prepararHistorico(
                    messages
                );

            // =========================
            // FICHEIRO
            // =========================

            let conteudoFicheiro =
                "";

            if (file) {

                if (
                    file.type ===
                    "pdf" &&
                    file.data
                ) {

                    conteudoFicheiro =
                        await lerPDF(
                            file.data
                        );

                } else if (
                    file.content
                ) {

                    conteudoFicheiro =
                        limitarTexto(
                            file.content,
                            6000
                        );
                }
            }

            // =========================
            // MENSAGENS
            // =========================

            const mensagens = [];

            mensagens.push({

                role:
                    "system",

                content:
                    criarSistema(
                        !!image
                    )
            });

            for (
                const mensagem
                of historico
            ) {

                if (
                    mensagem.role ===
                    "system"
                ) {

                    continue;
                }

                mensagens.push(
                    mensagem
                );
            }

            // =========================
            // FICHEIRO
            // =========================

            if (
                conteudoFicheiro
            ) {

                mensagens.push({

                    role:
                        "user",

                    content:
                        `Conteúdo do ficheiro:

${conteudoFicheiro}

Responde usando este conteúdo quando necessário.`
                });
            }

            // =========================
            // MODELO
            // =========================

            let modelo =
                MODELO_TEXTO;

            // =========================
            // IMAGEM
            // =========================

            if (image) {

                modelo =
                    MODELO_IMAGEM;

                const pergunta =

                    textoUsuario ||

                    "Analisa esta imagem.";

                const base64 =
                    limparBase64Imagem(
                        image
                    );

                if (!base64) {

                    return res
                        .status(400)
                        .json({

                            reply:
                                "Não consegui ler a imagem."
                        });
                }

                mensagens.push({

                    role:
                        "user",

                    content:
                        pergunta,

                    images: [
                        base64
                    ]
                });
            }

            // =========================
            // LOG
            // =========================

            console.log("");

            console.log(
                "=============================="
            );

            console.log(
                `🤖 Modelo: ${modelo}`
            );

            console.log(
                "☁️ A enviar para Ollama Cloud..."
            );

            const inicio =
                Date.now();

            // =========================
            // OLLAMA CLOUD
            // =========================

            const dados =
                await falarComOllama(

                    modelo,

                    mensagens,

                    !!image
                );

            const tempo =

                (
                    Date.now() -
                    inicio
                ) / 1000;

            console.log(
                `⚡ Resposta em ${tempo.toFixed(1)}s`
            );

            // =========================
            // RESPOSTA
            // =========================

            const respostaFinal =

                dados &&

                dados.message &&

                dados.message.content

                    ? dados.message.content

                    : "Não consegui gerar uma resposta.";

            console.log(
                "✅ Resposta recebida!"
            );

            console.log(
                "=============================="
            );

            res.json({

                reply:
                    respostaFinal
            });

        } catch (erro) {

            console.log("");

            console.log(
                "=============================="
            );

            console.error(
                "❌ ERRO NO CHAT:"
            );

            console.error(
                erro.message
            );

            console.log(
                "=============================="
            );

            let mensagemErro =
                "Não consegui contactar o Ollama Cloud.";

            if (
                erro.name ===
                "AbortError"
            ) {

                mensagemErro =
                    "O Ollama Cloud demorou demasiado tempo a responder.";
            }

            if (
                erro.message &&
                erro.message.includes(
                    "401"
                )
            ) {

                mensagemErro =
                    "A chave do Ollama Cloud não foi aceite. Verifica o ficheiro .env.";
            }

            res.status(500).json({

                reply:
                    mensagemErro,

                error:
                    erro.message
            });
        }
    }
);

// ===============================
// VER MEMÓRIA
// ===============================

app.get(
    "/memoria",
    function(req, res) {

        res.json(
            memoria
        );
    }
);

// ===============================
// TESTE DO SERVIDOR
// ===============================

app.get(
    "/teste",
    function(req, res) {

        res.send(
            "Meu AI está funcionando!"
        );
    }
);

// ===============================
// TESTE DO OLLAMA CLOUD
// ===============================

app.get(
    "/teste-ollama",
    async function(req, res) {

        try {

            const resposta =
                await fetch(
                    `${OLLAMA_URL}/api/tags`,
                    {

                        method:
                            "GET",

                        headers: {

                            "Authorization":
                                `Bearer ${OLLAMA_API_KEY}`
                        }
                    }
                );

            const texto =
                await resposta.text();

            let dados;

            try {

                dados =
                    JSON.parse(
                        texto
                    );

            } catch {

                dados = {
                    resposta:
                        texto
                };
            }

            if (
                !resposta.ok
            ) {

                return res
                    .status(
                        resposta.status
                    )
                    .json({

                        ollama:
                            "erro",

                        status:
                            resposta.status,

                        detalhes:
                            dados
                    });
            }

            res.json({

                ollama:
                    "funcionando",

                modelos:
                    dados.models ||
                    []
            });

        } catch (erro) {

            res.status(500).json({

                ollama:
                    "não respondeu",

                erro:
                    erro.message
            });
        }
    }
);
// ===============================
// INICIAR SERVIDOR
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log("");
    console.log("========================================");
    console.log("🤖 MEU AI");
    console.log("========================================");
    console.log(`🌐 Servidor: http://localhost:${PORT}`);
    console.log(`☁️ Ollama Cloud: ${OLLAMA_URL}`);
    console.log(`🧠 Modelo: ${MODELO_TEXTO}`);
    console.log("🚀 MODO CLOUD ATIVADO!");
    console.log("========================================");
    console.log("");
});