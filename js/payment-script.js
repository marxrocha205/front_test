document.addEventListener('DOMContentLoaded', () => {
    console.log("payment-script.js carregado com sucesso!");

    // --- VARIÁVEIS GLOBAIS ---
    const transactionId = sessionStorage.getItem('transactionId');
    let pixDataStore = null; // Vamos armazenar todos os dados do PIX aqui
    let countdownInterval;
    let statusCheckInterval;

    // --- SELEÇÃO DOS ELEMENTOS ---
    const paymentAmountElement = document.getElementById('pix-payment-amount');
    const timerElement = document.getElementById('pix-timer');
    const copyBtn = document.getElementById('copy-pix-btn');
    const copiedFeedback = document.getElementById('copied-feedback');
    const showQrBtn = document.getElementById('show-qr-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const qrCodeModal = document.getElementById('qr-code-modal');

    // --- FUNÇÃO DE CÓPIA UNIVERSAL (Funciona em todos os dispositivos) ---
    function copyToClipboard(text) {
        // Tenta usar a API moderna primeiro (requer HTTPS e contexto seguro)
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(() => true, () => false);
        }
        
        // Se a API moderna falhar ou não estiver disponível, usa o método antigo
        let textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed"; // Evita que a tela pule
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve(successful);
        } catch (err) {
            console.error('Fallback de cópia falhou: ', err);
            document.body.removeChild(textArea);
            return Promise.resolve(false);
        }
    }

    // --- LÓGICA PRINCIPAL ---
    function formatCurrency(value) {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    // Função para buscar os dados do PIX do backend
    async function fetchPixData() {
        if (!transactionId) {
            alert("ID da transação não encontrado. Você será redirecionado.");
            window.location.href = 'index.html';
            return;
        }
        try {
            const resp = await fetch(`https://backendfiote.onrender.com/get-pix-data?id=${transactionId}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            
            pixDataStore = await resp.json(); // Armazena os dados na nossa variável global

            // Habilita os botões agora que temos os dados
            if (copyBtn) {
                copyBtn.disabled = false;
                copyBtn.textContent = 'Copiar Código Pix';
            }
            if (showQrBtn) {
                showQrBtn.disabled = false;
                showQrBtn.textContent = 'Ver QR Code';
            }

        } catch (err) {
            console.error("Erro ao buscar PIX data:", err);
            alert("Erro ao carregar dados do PIX. Tente recarregar a página.");
            if (copyBtn) copyBtn.textContent = 'Erro ao carregar';
            if (showQrBtn) showQrBtn.textContent = 'Erro ao carregar';
        }
    }

    // Função para checar o status do pagamento
    async function checkPaymentStatus() {
        if (!transactionId) {
            clearInterval(statusCheckInterval);
            return;
        }
        try {
            const response = await fetch(`https://backendfiote.onrender.com/consultar-status?id=${transactionId}`);
            if (!response.ok) {
                console.error("Falha ao consultar status (Servidor). Status:", response.status);
                return;
            }
            const data = await response.json();
            console.log(`Status atual da transação [${transactionId}]: ${data.status}`);

            const successStatuses = ['PAID', 'COMPLETED']; // Status de sucesso
            if (data && data.status && successStatuses.includes(data.status.toUpperCase())) {
                console.log("Pagamento confirmado! Finalizando a compra no servidor...");
                clearInterval(countdownInterval);
                clearInterval(statusCheckInterval);

                // Chama a rota para o servidor salvar a compra
                fetch('https://backendfiote.onrender.com/finalizar-compra', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: transactionId })
                })
                .then(finalResponse => finalResponse.json())
                .then(finalData => {
                    if (!finalData.success) throw new Error(finalData.error || 'Erro desconhecido ao finalizar a compra.');
                    console.log('Compra finalizada com sucesso no servidor:', finalData);
                    window.location.href = 'confirmation.html';
                })
                .catch(error => {
                    console.error('Erro CRÍTICO ao finalizar compra:', error);
                    alert('O pagamento foi aprovado, mas houve um erro ao registrar seus números. Por favor, contate o suporte com o ID da transação.');
                    window.location.href = 'confirmation.html'; // Redireciona mesmo assim
                });
            }
        } catch (error) {
            console.error("Erro de rede ao consultar status:", error);
        }
    }

    // --- INICIALIZAÇÃO DA PÁGINA ---
    const savedPrice = sessionStorage.getItem('paymentPrice');
    if (savedPrice && paymentAmountElement) {
        paymentAmountElement.textContent = formatCurrency(savedPrice);
    }
    
    // Desabilita os botões até os dados do PIX serem carregados
    if (copyBtn) {
        copyBtn.disabled = true;
        copyBtn.textContent = 'Carregando...';
    }
    if (showQrBtn) {
        showQrBtn.disabled = true;
        showQrBtn.textContent = 'Carregando...';
    }

    // Busca os dados do PIX assim que a página carregar
    fetchPixData();
    
    // Inicia a checagem de status após 5 segundos
    if (transactionId) {
        setTimeout(() => {
            checkPaymentStatus(); // Roda uma vez
            statusCheckInterval = setInterval(checkPaymentStatus, 5000); // E depois a cada 5 segundos
        }, 5000);
    }

    // Lógica do cronômetro
    let timeInSeconds = 299; // 5 minutos
    countdownInterval = setInterval(() => {
        if (timeInSeconds <= 0) {
            clearInterval(countdownInterval);
            clearInterval(statusCheckInterval);
            if (timerElement) timerElement.textContent = 'Expirado';
            window.location.href = 'expired.html';
            return;
        }
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        if (timerElement) timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timeInSeconds--;
    }, 1000);

    // --- EVENT LISTENERS DOS BOTÕES ---
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (!pixDataStore || !pixDataStore.pixCode) {
                alert('Código PIX ainda não carregado, aguarde um momento.');
                return;
            }
            copyToClipboard(pixDataStore.pixCode).then(success => {
                if (success) {
                    if (copiedFeedback) copiedFeedback.style.display = 'flex';
                    setTimeout(() => { if (copiedFeedback) copiedFeedback.style.display = 'none'; }, 2000);
                } else {
                    alert('Falha ao copiar. Seu navegador pode não ser compatível. Tente usar o QR Code.');
                }
            });
        });
    }

    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            if (!pixDataStore || !pixDataStore.qrCodeData) {
                alert('QR Code ainda não carregado, aguarde um momento.');
                return;
            }
            const qrCodeContainer = document.getElementById('qrcode-container');
            if (qrCodeContainer && qrCodeModal) {
                qrCodeContainer.innerHTML = '';
                new QRCode(qrCodeContainer, {
                    text: pixDataStore.qrCodeData,
                    width: 256,
                    height: 256,
                    correctLevel: QRCode.CorrectLevel.L
                });
                qrCodeModal.style.display = 'flex';
            }
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if(qrCodeModal) qrCodeModal.style.display = 'none';
        });
    }
    
    if (qrCodeModal) {
        qrCodeModal.addEventListener('click', (e) => {
            if (e.target === qrCodeModal) {
                qrCodeModal.style.display = 'none';
            }
        });
    }
});