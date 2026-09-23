let conversations = [];
let currentConversation = [];
let currentConversationIndex = -1;

let currentFile = null;
let currentImage = null;

let voiceEnabled = true;

// =====================================
// JANELA DO BONECO
// =====================================

let bonecoWindow = null;

// =====================================
// ELEMENTOS
// =====================================

const input = document.getElementById("messageInput");
const chat = document.getElementById("chat");

// =====================================
// CONVERSAS
// =====================================

function getMessages(conversation) {
    if (Array.isArray(conversation)) {
        return conversation;
    }

    if (conversation && Array.isArray(conversation.messages)) {
        return conversation.messages;
    }

    return [];
}

function normalizarConversa(conversation) {
    if (Array.isArray(conversation)) {
        return {
            messages: conversation,
            favorite: false
        };
    }

    return {
        messages: getMessages(conversation),
        favorite: conversation?.favorite === true
    };
}

function saveConversation() {
    localStorage.setItem(
        "conversations",
        JSON.stringify(conversations)
    );
}

// =====================================
// 🧍 ABRIR BONECO
// =====================================

function abrirBoneco() {
    if (bonecoWindow && !bonecoWindow.closed) {
        bonecoWindow.focus();
        return;
    }

    bonecoWindow = window.open(
        "boneco.html",
        "MeuAIBoneco",
        "width=450,height=650,resizable=yes"
    );

    if (!bonecoWindow) {
        alert(
            "O navegador bloqueou a janela do boneco. Permite janelas pop-up para este site."
        );
    }
}

// =====================================
// 🧍 ENVIAR RESPOSTA PARA O BONECO
// =====================================

function enviarParaBoneco(texto) {
    if (bonecoWindow && !bonecoWindow.closed) {
        bonecoWindow.postMessage(
            {
                tipo: "respostaDoMeuAI",
                texto: texto
            },
            "*"
        );
    }
}

// =====================================
// 🎤 RECEBER MENSAGEM DO BONECO
// =====================================

window.addEventListener("message", function(event) {
    if (!event.data) {
        return;
    }

    if (event.data.tipo === "mensagemDoBoneco") {
        const texto = event.data.texto;

        if (!texto) {
            return;
        }

        input.value = texto;
        sendMessage();
    }
});

// =====================================
// ENVIAR MENSAGEM
// =====================================

async function sendMessage() {
    const text = input.value.trim();

    if (!text && !currentImage) {
        return;
    }

    const welcome = document.getElementById("welcome");

    if (welcome) {
        welcome.style.display = "none";
    }

    if (text) {
        addMessage(text, "user");

        currentConversation.push({
            role: "user",
            content: text
        });

        input.value = "";
    }

    showThinking();

    try {
        // CORRIGIDO: rota certa + sem { extra
        const response = await fetch("/api/chat", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: currentConversation,
                file: currentFile,
                image: currentImage
            })
        });

        const data = await response.json();

        removeThinking();

        if (!response.ok) {
            throw new Error(
                data.reply || "Erro no servidor"
            );
        }

        // =================================
        // MOSTRAR RESPOSTA
        // =================================

        addMessage(
            data.reply,
            "ai"
        );

        // =================================
        // VOZ DO MEU AI
        // =================================

        if (voiceEnabled) {
            falar(data.reply);
        }

        // =================================
        // 🧍 ENVIAR PARA O BONECO
        // =================================

        enviarParaBoneco(data.reply);

        // =================================
        // GUARDAR RESPOSTA
        // =================================

        currentConversation.push({
            role: "assistant",
            content: data.reply
        });

        currentImage = null;
        currentFile = null;

        // =================================
        // GUARDAR CONVERSA
        // =================================

        if (
            currentConversationIndex >= 0 &&
            conversations[currentConversationIndex]
        ) {
            conversations[currentConversationIndex] =
                normalizarConversa(
                    conversations[currentConversationIndex]
                );

            conversations[currentConversationIndex].messages =
                currentConversation;

        } else {
            conversations.push({
                messages: currentConversation,
                favorite: false
            });

            currentConversationIndex =
                conversations.length - 1;
        }

        saveConversation();
        updateHistory();

    } catch (error) {
        removeThinking();

        addMessage(
            "❌ Não consegui contactar a IA. Verifica se o servidor está aberto.",
            "ai"
        );

        console.error("Erro no chat:", error);
    }
}

// =====================================
// MOSTRAR MENSAGEM
// =====================================

function addMessage(text, type) {
    const message = document.createElement("div");

    message.className = "message " + type;

    if (type === "ai") {
        message.innerHTML = `
            <div class="message-content">
                ${escapeHTML(text)}
            </div>

            <button
                class="copy-button"
                type="button"
                onclick="copiarTexto(this)"
            >
                📋 Copiar
            </button>
        `;
    } else {
        message.innerHTML = `
            <div class="message-content">
                ${escapeHTML(text)}
            </div>
        `;
    }

    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
}

// =====================================
// COPIAR
// =====================================

function copiarTexto(button) {
    const mensagem =
        button.parentElement
            .querySelector(".message-content")
            .innerText;

    navigator.clipboard
        .writeText(mensagem)
        .then(() => {
            button.textContent = "✅ Copiado!";

            setTimeout(() => {
                button.textContent = "📋 Copiar";
            }, 1500);
        })
        .catch(() => {
            button.textContent = "❌ Erro";
        });
}

// =====================================
// A PENSAR
// =====================================

function showThinking() {
    removeThinking();

    const thinking = document.createElement("div");

    thinking.id = "thinking";
    thinking.className = "message ai";

    thinking.innerHTML = `
        <div class="message-content">
            🤔 A pensar...
        </div>
    `;

    chat.appendChild(thinking);
    chat.scrollTop = chat.scrollHeight;
}

function removeThinking() {
    const thinking =
        document.getElementById("thinking");

    if (thinking) {
        thinking.remove();
    }
}

// =====================================
// SUGESTÕES
// =====================================

function suggest(text) {
    input.value = text;
    sendMessage();
}

// =====================================
// NOVA CONVERSA
// =====================================

function newChat() {
    currentConversation = [];
    currentConversationIndex = -1;
    currentFile = null;
    currentImage = null;

    chat.innerHTML = `
        <div class="welcome" id="welcome">

            <div class="robot">
                🤖
            </div>

            <h1>
                Olá! Eu sou o Meu AI
            </h1>

            <p>
                Pergunta-me qualquer coisa.
            </p>

            <div class="suggestions">

                <button
                    onclick="suggest('Explica-me como funciona a inteligência artificial')"
                >
                    🧠 Explicar IA
                </button>

                <button
                    onclick="suggest('Ajuda-me a criar um programa')"
                >
                    💻 Programar
                </button>

                <button
                    onclick="suggest('Dá-me uma ideia para um projeto')"
                >
                    💡 Ideias
                </button>

                <button
                    onclick="suggest('Conta-me uma curiosidade')"
                >
                    🌎 Curiosidade
                </button>

            </div>

        </div>
    `;
}

// =====================================
// HISTÓRICO
// =====================================

function updateHistory() {
    const history =
        document.getElementById("historyList");

    if (!history) {
        return;
    }

    criarPesquisaHistorico();
    criarBotaoLimparHistorico();
    criarBotaoVoz();

    renderHistory(conversations);
}

// =====================================
// PESQUISA DO HISTÓRICO
// =====================================

function criarPesquisaHistorico() {
    const history =
        document.getElementById("historyList");

    if (!history) {
        return;
    }

    let pesquisa =
        document.getElementById("searchHistory");

    if (!pesquisa) {
        pesquisa =
            document.createElement("input");

        pesquisa.id = "searchHistory";
        pesquisa.type = "text";
        pesquisa.placeholder =
            "🔎 Pesquisar conversas...";

        pesquisa.addEventListener(
            "input",
            searchHistory
        );

        history.parentElement.insertBefore(
            pesquisa,
            history
        );
    }
}

// =====================================
// LIMPAR HISTÓRICO
// =====================================

function criarBotaoLimparHistorico() {
    const history =
        document.getElementById("historyList");

    if (!history) {
        return;
    }

    let botao =
        document.getElementById("clearHistory");

    if (!botao) {
        botao =
            document.createElement("button");

        botao.id = "clearHistory";
        botao.textContent =
            "🧹 Limpar histórico";
        botao.type = "button";
        botao.onclick = limparHistorico;

        history.parentElement.insertBefore(
            botao,
            history
        );
    }
}

// =====================================
// BOTÃO DE VOZ
// =====================================

function criarBotaoVoz() {
    const topbar =
        document.querySelector(".topbar");

    if (!topbar) {
        return;
    }

    let botao =
        document.getElementById("voiceToggle");

    if (!botao) {
        botao =
            document.createElement("button");

        botao.id = "voiceToggle";
        botao.type = "button";
        botao.title =
            "Ligar/desligar voz";
        botao.onclick = toggleVoice;

        topbar.appendChild(botao);
    }

    atualizarBotaoVoz();
}

function atualizarBotaoVoz() {
    const botao =
        document.getElementById("voiceToggle");

    if (!botao) {
        return;
    }

    if (voiceEnabled) {
        botao.textContent = "🔊";
        botao.title = "Desligar voz";
    } else {
        botao.textContent = "🔇";
        botao.title = "Ligar voz";
    }
}

// =====================================
// LIGAR / DESLIGAR VOZ
// =====================================

function toggleVoice() {
    voiceEnabled = !voiceEnabled;

    localStorage.setItem(
        "voiceEnabled",
        String(voiceEnabled)
    );

    if (
        !voiceEnabled &&
        "speechSynthesis" in window
    ) {
        window.speechSynthesis.cancel();
    }

    atualizarBotaoVoz();
}

// =====================================
// PESQUISAR HISTÓRICO
// =====================================

function searchHistory() {
    const pesquisa =
        document.getElementById("searchHistory");

    if (!pesquisa) {
        return;
    }

    const textoPesquisa =
        pesquisa.value.toLowerCase().trim();

    if (!textoPesquisa) {
        renderHistory(conversations);
        return;
    }

    const resultados =
        conversations.filter(
            (conversation) => {
                const mensagens =
                    getMessages(conversation);

                const texto =
                    mensagens
                        .map(
                            message =>
                                message.content || ""
                        )
                        .join(" ")
                        .toLowerCase();

                return texto.includes(
                    textoPesquisa
                );
            }
        );

    renderHistory(resultados);
}

// =====================================
// MOSTRAR HISTÓRICO
// =====================================

function renderHistory(lista) {
    const history =
        document.getElementById("historyList");

    if (!history) {
        return;
    }

    history.innerHTML = "";

    if (!lista.length) {
        const vazio =
            document.createElement("div");

        vazio.style.padding = "12px";
        vazio.style.opacity = "0.6";
        vazio.textContent =
            "Nenhuma conversa encontrada.";

        history.appendChild(vazio);
        return;
    }

    lista.forEach((conversation) => {
        const mensagens =
            getMessages(conversation);

        if (!mensagens.length) {
            return;
        }

        const index =
            conversations.indexOf(conversation);

        if (index < 0) {
            return;
        }

        const favorito =
            !Array.isArray(conversation) &&
            conversation.favorite === true;

        const primeiroUsuario =
            mensagens.find(
                message =>
                    message.role === "user"
            );

        const titulo =
            primeiroUsuario
                ? primeiroUsuario.content
                : "Nova conversa";

        const item =
            document.createElement("div");

        item.className =
            "history-item";

        item.innerHTML = `
            <span
                class="history-title"
                onclick="abrirConversa(${index})"
            >
                💬
                ${escapeHTML(
                    titulo.substring(0, 40)
                )}
            </span>

            <button
                class="favorite-chat"
                type="button"
                onclick="toggleFavorite(${index}, event)"
            >
                ${favorito ? "⭐" : "☆"}
            </button>

            <button
                class="delete-chat"
                type="button"
                onclick="deleteConversation(${index}, event)"
            >
                🗑️
            </button>
        `;

        history.appendChild(item);
    });
}

// =====================================
// ABRIR CONVERSA
// =====================================

function abrirConversa(index) {
    const conversa =
        conversations[index];

    if (!conversa) {
        return;
    }

    const mensagens =
        getMessages(conversa);

    currentConversation =
        JSON.parse(
            JSON.stringify(mensagens)
        );

    currentConversationIndex = index;
    currentFile = null;
    currentImage = null;

    chat.innerHTML = "";

    currentConversation.forEach(
        message => {
            addMessage(
                message.content,
                message.role === "user"
                    ? "user"
                    : "ai"
            );
        }
    );
}

// =====================================
// FAVORITO
// =====================================

function toggleFavorite(index, event) {
    event.stopPropagation();

    if (!conversations[index]) {
        return;
    }

    conversations[index] =
        normalizarConversa(
            conversations[index]
        );

    conversations[index].favorite =
        !conversations[index].favorite;

    saveConversation();
    updateHistory();
}

// =====================================
// APAGAR CONVERSA
// =====================================

function deleteConversation(index, event) {
    event.stopPropagation();

    if (!conversations[index]) {
        return;
    }

    const confirmar =
        confirm(
            "Tem certeza que quer apagar esta conversa?"
        );

    if (!confirmar) {
        return;
    }

    conversations.splice(index, 1);

    if (
        currentConversationIndex === index
    ) {
        currentConversation = [];
        currentConversationIndex = -1;
        newChat();

    } else if (
        currentConversationIndex > index
    ) {
        currentConversationIndex--;
    }

    saveConversation();
    updateHistory();
}

// =====================================
// APAGAR TODO HISTÓRICO
// =====================================

function limparHistorico() {
    if (conversations.length === 0) {
        alert(
            "O histórico já está vazio."
        );
        return;
    }

    const confirmar =
        confirm(
            "⚠️ Tem certeza que quer apagar TODAS as conversas?"
        );

    if (!confirmar) {
        return;
    }

    conversations = [];
    currentConversation = [];
    currentConversationIndex = -1;
    currentFile = null;
    currentImage = null;

    localStorage.removeItem(
        "conversations"
    );

    newChat();
    updateHistory();

    alert(
        "✅ Todo o histórico foi apagado."
    );
}

// =====================================
// TEMA
// =====================================

function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
        "darkMode",
        document.body.classList.contains("dark")
    );
}

// =====================================
// MENU LATERAL
// =====================================

function toggleSidebar() {
    const sidebar =
        document.querySelector(".sidebar");

    if (!sidebar) {
        return;
    }

    if (
        sidebar.style.display === "none"
    ) {
        sidebar.style.display = "flex";
    } else {
        sidebar.style.display = "none";
    }
}

// =====================================
// DEFINIÇÕES
// =====================================

function showSettings() {
    const modal =
        document.getElementById(
            "settingsModal"
        );

    if (modal) {
        modal.style.display = "flex";
    }
}

function closeSettings() {
    const modal =
        document.getElementById(
            "settingsModal"
        );

    if (modal) {
        modal.style.display = "none";
    }
}

function saveSettings() {
    const campo =
        document.getElementById(
            "assistantName"
        );

    const name =
        campo
            ? campo.value.trim()
            : "";

    if (name) {
        localStorage.setItem(
            "assistantName",
            name
        );

        const logo =
            document.querySelector(".logo");

        if (logo) {
            logo.textContent =
                "🤖 " + name;
        }
    }

    closeSettings();
}

// =====================================
// FICHEIROS
// =====================================

async function uploadFile() {
    const inputFile =
        document.getElementById(
            "fileInput"
        );

    const file =
        inputFile?.files[0];

    if (!file) {
        return;
    }

    const extensao =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    const permitidos = [
        "txt",
        "md",
        "json",
        "csv",
        "pdf"
    ];

    if (!permitidos.includes(extensao)) {
        addMessage(
            "❌ Esse tipo de ficheiro ainda não é suportado.",
            "ai"
        );
        return;
    }

    try {
        if (extensao === "pdf") {
            const base64 =
                await lerArquivoBase64(file);

            addMessage(
                "📄 PDF carregado: " +
                file.name,
                "user"
            );

            currentFile = {
                name: file.name,
                type: "pdf",
                data: base64
            };

        } else {
            const texto =
                await file.text();

            addMessage(
                "📄 Ficheiro lido: " +
                file.name,
                "user"
            );

            currentFile = {
                name: file.name,
                content: texto
            };
        }

        addMessage(
            "✅ Ficheiro carregado. Agora faça uma pergunta sobre ele.",
            "ai"
        );

    } catch (error) {
        addMessage(
            "❌ Não consegui ler esse ficheiro.",
            "ai"
        );

        console.error(error);
    }

    inputFile.value = "";
}

function lerArquivoBase64(file) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload =
                function() {
                    const resultado =
                        reader.result;

                    resolve(
                        resultado.split(",")[1]
                    );
                };

            reader.onerror =
                function() {
                    reject(
                        new Error(
                            "Erro ao ler ficheiro"
                        )
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}

// =====================================
// IMAGEM
// =====================================

async function uploadImage() {
    const inputImagem =
        document.getElementById(
            "imageInput"
        );

    if (!inputImagem) {
        addMessage(
            "❌ O botão de imagem ainda não está no HTML.",
            "ai"
        );
        return;
    }

    const file =
        inputImagem.files[0];

    if (!file) {
        return;
    }

    if (!file.type.startsWith("image/")) {
        addMessage(
            "❌ Escolha uma imagem.",
            "ai"
        );
        return;
    }

    try {
        const dataURL =
            await lerImagem(file);

        currentImage = {
            name: file.name,
            data: dataURL
        };

        addMessage(
            "🖼️ Imagem carregada: " +
            file.name,
            "user"
        );

        addMessage(
            "✅ Imagem pronta. Agora faça uma pergunta sobre ela.",
            "ai"
        );

    } catch (error) {
        addMessage(
            "❌ Não consegui carregar a imagem.",
            "ai"
        );

        console.error(error);
    }

    inputImagem.value = "";
}

function lerImagem(file) {
    return new Promise(
        (resolve, reject) => {
            const reader =
                new FileReader();

            reader.onload =
                function() {
                    resolve(
                        reader.result
                    );
                };

            reader.onerror =
                function() {
                    reject(
                        new Error(
                            "Erro ao ler imagem"
                        )
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}

// =====================================
// MICROFONE DO MEU AI
// =====================================

function startVoice() {
    if (
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
    ) {
        alert(
            "O reconhecimento de voz não é suportado neste navegador."
        );
        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const recognition =
        new SpeechRecognition();

    recognition.lang = "pt-PT";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();

    recognition.onresult =
        function(event) {
            input.value =
                event.results[0][0]
                    .transcript;

            input.focus();
        };

    recognition.onerror =
        function() {
            console.log(
                "Erro no reconhecimento de voz."
            );
        };
}

// =====================================
// VOZ DA IA
// =====================================

function falar(texto) {
    if (!voiceEnabled) {
        return;
    }

    if (!("speechSynthesis" in window)) {
        console.log(
            "Voz não suportada neste navegador."
        );
        return;
    }

    window.speechSynthesis.cancel();

    const voz =
        new SpeechSynthesisUtterance(texto);

    voz.lang = "pt-PT";
    voz.rate = 1;
    voz.pitch = 1;
    voz.volume = 1;

    window.speechSynthesis.speak(voz);
}

// =====================================
// ENTER
// =====================================

function handleKey(event) {
    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {
        event.preventDefault();
        sendMessage();
    }
}

// =====================================
// SEGURANÇA HTML
// =====================================

function escapeHTML(text) {
    const div =
        document.createElement("div");

    div.textContent = text ?? "";

    return div.innerHTML;
}

// =====================================
// CARREGAR CONVERSAS
// =====================================

const savedConversations =
    localStorage.getItem(
        "conversations"
    );

if (savedConversations) {
    try {
        conversations =
            JSON.parse(
                savedConversations
            );

        conversations =
            conversations.map(
                normalizarConversa
            );

    } catch (error) {
        conversations = [];
        console.error(error);
    }
}

// =====================================
// TEMA GUARDADO
// =====================================

if (
    localStorage.getItem("darkMode") === "true"
) {
    document.body.classList.add("dark");
}

// =====================================
// VOZ GUARDADA
// =====================================

const savedVoice =
    localStorage.getItem(
        "voiceEnabled"
    );

if (savedVoice !== null) {
    voiceEnabled =
        savedVoice === "true";
}

// =====================================
// NOME GUARDADO
// =====================================

const nomeGuardado =
    localStorage.getItem(
        "assistantName"
    );

if (nomeGuardado) {
    const logo =
        document.querySelector(".logo");

    if (logo) {
        logo.textContent =
            "🤖 " + nomeGuardado;
    }
}

// =====================================
// INICIAR
// =====================================

updateHistory();