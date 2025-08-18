// Salve este código como "js/expired.js"

document.addEventListener('DOMContentLoaded', () => {
    const newPixButton = document.querySelector('.action-button');

    if (newPixButton) {
        newPixButton.addEventListener('click', () => {
            // 1. Busca os dados originais do pagamento que salvamos no checkout.js
            const paymentDataString = sessionStorage.getItem('paymentData');

            if (!paymentDataString) {
                alert("Não foi possível encontrar os dados do pagamento original. Por favor, volte ao início.");
                //window.location.href = 'index.html'; // Redireciona para o início se não houver dados
                navigateWithUTMs('index.html');
                return;
            }

            const paymentData = JSON.parse(paymentDataString);

            // 2. Desabilita o botão e mostra que está carregando
            newPixButton.disabled = true;
            newPixButton.textContent = 'Gerando...';

            // 3. Chama a API para gerar um novo PIX (mesma lógica do checkout.js)
            fetch('https://backendfiote.onrender.com/gerar-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(paymentData) // Usa os dados salvos
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => { throw new Error(`Erro do servidor (${response.status}): ${text}`); });
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.transactionId) {
                    // 4. Se der certo, ATUALIZA o ID da transação no sessionStorage
                    sessionStorage.setItem('transactionId', data.transactionId);
                    
                    // 5. Redireciona DE VOLTA para a tela de pagamento
                    navigateWithUTMs('payment.html');
                } else {
                    alert('Não foi possível gerar um novo PIX. Tente novamente.');
                    newPixButton.disabled = false;
                    newPixButton.textContent = 'Gerar novo Código Pix';
                }
            })
            .catch(error => {
                console.error('Erro ao gerar novo PIX:', error);
                alert('Ocorreu um erro de comunicação. Verifique se o servidor local está ativo e tente novamente.');
                newPixButton.disabled = false;
                newPixButton.textContent = 'Gerar novo Código Pix';
            });
        });
    }
});