document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('purchase-details-container');

    // --- Funções Auxiliares de Formatação ---
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(',', '');
    }
    //
    function getNextDrawDate() {
        const referenceDrawDate = new Date('2025-07-12T17:00:00');
        const now = new Date();
        const timeDifference = now.getTime() - referenceDrawDate.getTime();
        const cycleDuration = 14 * 24 * 60 * 60 * 1000;
        const cyclesPassed = Math.ceil(timeDifference / cycleDuration);
        const nextDrawTimestamp = referenceDrawDate.getTime() + (cyclesPassed * cycleDuration);
        return new Date(nextDrawTimestamp);
    }
    
    function maskCPF(cpf) {
        if (!cpf || cpf.length < 11) return 'CPF Inválido';
        const cleanedCPF = cpf.replace(/\D/g, ''); // Remove formatação
        return `***.${cleanedCPF.substring(3, 6)}.${cleanedCPF.substring(6, 9)}-**`;
    }

    // --- Lógica Principal ---
    const purchaseDataString = sessionStorage.getItem('purchaseData');

    if (!purchaseDataString) {
        container.innerHTML = '<div class="card error-card"><p>Nenhuma informação de compra encontrada. Por favor, volte e pesquise novamente.</p></div>';
        return;
    }

    const purchases = JSON.parse(purchaseDataString);
    const drawDate = formatDateTime(getNextDrawDate());

    let allPurchasesHTML = '';

    purchases.forEach(purchase => {
        const luckyNumbers = JSON.parse(purchase.lucky_numbers);
        let numbersHTML = '';
        luckyNumbers.forEach(num => {
            numbersHTML += `<div class="lucky-number">${num}</div>`;
        });

        const purchaseCardHTML = `
            <div class="card">
                <div class="card-header">
                    <h2>Informações da compra:</h2>
                    <p>Edição Fiote de Sorte R$ 1,00 - Três Motos Honda CG 160 0km + RAM 1.500 0km | - 16/08/2025</p>
                    <span class="status-badge">Pagamento concluído</span>
                </div>
                <div class="card-body">
                    <div class="info-grid">
                        <div class="info-item"><span>Número do pedido:</span><str                        <div class="info-item"><span>Data e hora do sorteio:</span><strong>10/08/2025</strong></div>
                        <div class="info-item"><span>Valor total:</span><strong>${formatCurrency(purchase.amount)}</strong></div>
                        <div class="info-item"><span>Forma de pagamento:</span><strong>Pix</strong></div>
                        <div class="info-item"><span>Cliente:</span><strong>${purchase.client_name}</strong></div>
                        <div class="info-item"><span>CPF:</span><strong>${maskCPF(purchase.cpf)}</strong></div>
                        <div class="info-item"><span>Situação:</span><strong>Concluída</strong></div>
                    </div>
                </div>
                <div class="card-prizes">
                    <h3>Prêmios:</h3>
                    <p>1º Prêmio: Porsche Macan</p>
                </div>
                <div class="card-numbers">
                    <h3>Número(s) da sorte: ${purchase.quantity}</h3>
                    <div class="numbers-grid">
                        ${numbersHTML}
                    </div>
                </div>
            </div>
        `;
        allPurchasesHTML += purchaseCardHTML;
    });

    container.innerHTML = allPurchasesHTML;
});