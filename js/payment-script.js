document.addEventListener('DOMContentLoaded', () => {

    console.log("payment-script.js carregado com sucesso!");

    // --- SELEÇÃO DOS ELEMENTOS ---
    const paymentAmountElement = document.getElementById('pix-payment-amount');
    const timerElement = document.getElementById('pix-timer');
    const copyBtn = document.getElementById('copy-pix-btn');
    const copiedFeedback = document.getElementById('copied-feedback');
    const showQrBtn = document.getElementById('show-qr-btn');
    const qrCodeModal = document.getElementById('qr-code-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    
    // --- LÓGICA DE DADOS ---
    const savedPrice = sessionStorage.getItem('paymentPrice');
    const transactionId = sessionStorage.getItem('transactionId');

    // --- VARIÁVEIS PARA CONTROLAR OS INTERVALOS ---
    let countdownInterval;
    let statusCheckInterval;

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    if (savedPrice && paymentAmountElement) {
        paymentAmountElement.textContent = formatCurrency(parseFloat(savedPrice));
    }

    // --- FUNÇÃO PARA VERIFICAR O STATUS DO PAGAMENTO ---
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

            const successStatuses = ['PAID', 'COMPLETED'];
            if (data && data.status && successStatuses.includes(data.status.toUpperCase())) {
                
                console.log("Pagamento confirmado! Finalizando a compra no servidor...");

                // 1. Para todos os contadores
                clearInterval(countdownInterval);
                clearInterval(statusCheckInterval);

                // <<< ALTERAÇÃO CRÍTICA AQUI >>>
                // 2. Chama a rota para o servidor salvar a compra e gerar os números
                fetch('https://backendfiote.onrender.com/finalizar-compra', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: transactionId })
                })
                .then(finalResponse => {
                    if (!finalResponse.ok) {
                        // Mesmo que dê erro aqui, o pagamento foi feito.
                        // Avisamos o usuário e logamos o erro para análise manual.
                        throw new Error('O pagamento foi aprovado, mas houve um erro ao registrar seus números. Por favor, contate o suporte com o ID da transação.');
                    }
                    return finalResponse.json();
                })
                .then(finalData => {
                    console.log('Compra finalizada com sucesso no servidor:', finalData);
                    // 3. APENAS se tudo deu certo, redireciona para a confirmação.
                    window.location.href = 'confirmation.html';
                })
                .catch(error => {
                    console.error('Erro CRÍTICO ao finalizar compra:', error);
                    alert(error.message);
                    // Redireciona mesmo em caso de erro para não deixar o cliente travado.
                    window.location.href = 'confirmation.html';
                });
            }
        } catch (error) {
            console.error("Erro de rede ao consultar status:", error);
        }
    }


    // --- LÓGICA DO CRONÔMETRO ---
    let timeInSeconds = 299;
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

    // --- FUNÇÃO PARA BUSCAR DADOS DO PIX NO SERVIDOR ---
    async function fetchPixData() {
        if (!transactionId) {
            clearInterval(countdownInterval);
            clearInterval(statusCheckInterval);
            alert("ID da transação não encontrado. Você será redirecionado ao início.");
            window.location.href = 'index.html';
            return null;
        }
        try {
            const resp = await fetch(`https://backendfiote.onrender.com/get-pix-data?id=${transactionId}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch (err) {
            console.error("Erro ao buscar PIX data:", err);
            alert("Erro ao buscar dados do PIX.");
            return null;
        }
    }

    // --- LÓGICAS DOS BOTÕES ---
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            copyBtn.disabled = true;
            copyBtn.textContent = 'Buscando...';
            const pixData = await fetchPixData();
            if (pixData && pixData.pixCode) {
                navigator.clipboard.writeText(pixData.pixCode)
                    .then(() => {
                        if(copiedFeedback) copiedFeedback.style.display = 'flex';
                        setTimeout(() => { if(copiedFeedback) copiedFeedback.style.display = 'none'; }, 3000);
                    })
                    .catch(() => alert('Falha ao copiar.'));
            } else {
                alert('Código Pix não disponível.');
            }
            copyBtn.disabled = false;
            copyBtn.textContent = 'Copiar Código Pix';
        });
    }
  if (showQrBtn) {
    showQrBtn.addEventListener('click', async () => {
        showQrBtn.disabled = true;
        showQrBtn.textContent = 'Buscando...';
        const pixData = await fetchPixData();

        console.log("Dados recebidos para o QR Code:", pixData);

        if (pixData && pixData.qrCodeData) {
            const qrCodeContainer = document.getElementById('qrcode-container');
            const qrCodeModal = document.getElementById('qr-code-modal');

            // Limpa qualquer QR Code que já estivesse ali para evitar duplicatas
            qrCodeContainer.innerHTML = ''; 

            // Cria a imagem do QR Code dentro da div
            new QRCode(qrCodeContainer, {
                text: pixData.qrCodeData,
                width: 256,
                height: 256,
                correctLevel: QRCode.CorrectLevel.L
            });

            // Mostra o modal
            qrCodeModal.style.display = 'flex';
        } else {
            alert('QR Code não encontrado.');
        }

        showQrBtn.disabled = false;
        showQrBtn.textContent = 'Ver QR Code';
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
    
    // --- INICIA A VERIFICAÇÃO DE STATUS ---
    if (transactionId) {
        setTimeout(() => {
            checkPaymentStatus();
            statusCheckInterval = setInterval(checkPaymentStatus, 5000);
        }, 5000);
    }
});