document.addEventListener('DOMContentLoaded', () => {
    const cpfInput = document.getElementById('cpf-input');
    const searchBtn = document.getElementById('search-btn');
    const errorMessage = document.getElementById('error-message');

    // Aplica a máscara de CPF para facilitar a digitação
    const cpfMask = IMask(cpfInput, {
        mask: '000.000.000-00'
    });

    searchBtn.addEventListener('click', async () => {
        const cpf = cpfMask.unmaskedValue; // Pega apenas os números do CPF

        if (cpf.length !== 11) {
            errorMessage.textContent = 'Por favor, digite um CPF válido.';
            return;
        }

        errorMessage.textContent = '';
        searchBtn.disabled = true;
        searchBtn.querySelector('span').textContent = 'Buscando...';

        try {
            const response = await fetch(`http://127.0.0.1:5000/consultar-compras?cpf=${cpf}`);
            
            if (!response.ok) {
                throw new Error('Não foi possível se comunicar com o servidor.');
            }

            const purchases = await response.json();

            if (purchases.length === 0) {
                errorMessage.textContent = 'Nenhuma compra encontrada para este CPF.';
                searchBtn.disabled = false;
                searchBtn.querySelector('span').textContent = 'Ver compras';
            } else {
                // Salva os dados na sessão para a próxima página usar
                sessionStorage.setItem('purchaseData', JSON.stringify(purchases));
                // Redireciona para a página de detalhes
                window.location.href = 'purchase-details.html';
            }

        } catch (error) {
            console.error('Erro ao buscar compras:', error);
            errorMessage.textContent = 'Ocorreu um erro ao buscar suas compras. Tente novamente.';
            searchBtn.disabled = false;
            searchBtn.querySelector('span').textContent = 'Ver compras';
        }
    });
});