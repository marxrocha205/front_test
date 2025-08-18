document.addEventListener('DOMContentLoaded', () => {
    console.log("payment-script.js carregado com sucesso!");

    // --- VARIÁVEIS GLOBAIS ---
    const transactionId = sessionStorage.getItem('transactionId');
    let pixDataStore = null;
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
     
    // --- FUNÇÃO DE REDIRECIONAMENTO ---
    function navigateWithUTMs(destinationUrl) {
        const queryString = window.location.search;
        window.location.href = destinationUrl + queryString;
    }
    // --- FUNÇÃO DE CÓPIA APRIMORADA PARA iOS ---
    async function copyToClipboard(text) {
        // Método 1: Tenta a API de Clipboard moderna, que é a melhor opção
        try {
            if (!navigator.clipboard) {
                // Se a API não existe, força a ida para o método antigo
                throw new Error('Clipboard API not available');
            }
            await navigator.clipboard.writeText(text);
            console.log('Texto copiado com sucesso (API moderna)!');
            return true;
        } catch (err) {
            console.warn('API moderna de clipboard falhou. Tentando método antigo (fallback)...', err);
            
            // Método 2: Fallback com execCommand, otimizado para iOS
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.setAttribute('readonly', ''); // Previne o teclado de aparecer no iOS
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px'; // Move para fora da tela
                document.body.appendChild(textArea);
                
                // Lógica de seleção específica para iOS
                if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
                    textArea.contentEditable = true;
                    textArea.readOnly = true;
                    const range = document.createRange();
                    range.selectNodeContents(textArea);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    textArea.setSelectionRange(0, 999999);
                } else {
                    textArea.select();
                }

                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                
                if (successful) {
                    console.log('Texto copiado com sucesso (método antigo)!');
                    return true;
                } else {
                    throw new Error('execCommand retornou "false"');
                }
            } catch (fallbackErr) {
                console.error('Falha em ambos os métodos de cópia.', fallbackErr);
                return false;
            }
        }
    }

    // --- LÓGICA PRINCIPAL (sem alterações) ---
    function formatCurrency(value) {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    async function fetchPixData() {
        if (!transactionId) {
            alert("ID da transação não encontrado. Você será redirecionado.");
            window.location.href = 'index.html';
            return;
        }
        try {
            const resp = await fetch(`https://backendfiote.onrender.com/get-pix-data?id=${transactionId}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            pixDataStore = await resp.json();
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

    async function checkPaymentStatus() {
        if (!transactionId) { clearInterval(statusCheckInterval); return; }
        try {
            const response = await fetch(`https://backendfiote.onrender.com/consultar-status?id=${transactionId}`);
            if (!response.ok) { console.error("Falha ao consultar status. Status:", response.status); return; }
            const data = await response.json();
            console.log(`Status atual da transação [${transactionId}]: ${data.status}`);
            const successStatuses = ['PAID', 'COMPLETED'];
            if (data && data.status && successStatuses.includes(data.status.toUpperCase())) {
                console.log("Pagamento confirmado! Finalizando a compra...");
                clearInterval(countdownInterval);
                clearInterval(statusCheckInterval);
                fetch('https://backendfiote.onrender.com/finalizar-compra', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ transactionId: transactionId })
                })
                .then(finalResponse => finalResponse.json())
                .then(finalData => {
                    if (!finalData.success) throw new Error(finalData.error || 'Erro desconhecido ao finalizar.');
                    navigateWithUTMs('confirmation.html');
                })
                .catch(error => {
                    console.error('Erro CRÍTICO ao finalizar compra:', error);
                    alert('Pagamento aprovado, mas houve um erro ao registrar seus números. Contate o suporte.');
                    navigateWithUTMs('confirmation.html');
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
    if (copyBtn) { copyBtn.disabled = true; copyBtn.textContent = 'Carregando...'; }
    if (showQrBtn) { showQrBtn.disabled = true; showQrBtn.textContent = 'Carregando...'; }
    fetchPixData();
    if (transactionId) {
        setTimeout(() => {
            checkPaymentStatus();
            statusCheckInterval = setInterval(checkPaymentStatus, 5000);
        }, 5000);
    }
    let timeInSeconds = 299;
    countdownInterval = setInterval(() => {
        if (timeInSeconds <= 0) {
            clearInterval(countdownInterval);
            clearInterval(statusCheckInterval);
            if (timerElement) timerElement.textContent = 'Expirado';
            navigateWithUTMs('expired.html');
            return;
        }
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        if (timerElement) timerElement.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        timeInSeconds--;
    }, 1000);

    // --- EVENT LISTENERS ---
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => { // Adicionado async aqui
            if (!pixDataStore || !pixDataStore.pixCode) {
                alert('Código PIX ainda não carregado, aguarde.');
                return;
            }
            const success = await copyToClipboard(pixDataStore.pixCode); // Adicionado await
            if (success) {
                if (copiedFeedback) copiedFeedback.style.display = 'flex';
                setTimeout(() => { if (copiedFeedback) copiedFeedback.style.display = 'none'; }, 2000);
            } else {
                alert('Falha ao copiar. Por favor, pressione e segure o código para copiar manualmente.');
            }
        });
    }

    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            if (!pixDataStore || !pixDataStore.qrCodeData) { alert('QR Code ainda não carregado, aguarde.'); return; }
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
        closeModalBtn.addEventListener('click', () => { if(qrCodeModal) qrCodeModal.style.display = 'none'; });
    }
    if (qrCodeModal) {
        qrCodeModal.addEventListener('click', (e) => { if (e.target === qrCodeModal) qrCodeModal.style.display = 'none'; });
    }
});