document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA PARA EXIBIR O PREÇO E QUANTIDADE ---
    const totalPriceElement = document.querySelector('.total-price');
    const savedPrice = sessionStorage.getItem('checkoutPrice');
    const savedQuantity = sessionStorage.getItem('checkoutQuantity');

    function formatCurrency(value) { return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
    if (savedPrice && totalPriceElement) { const numericPrice = parseFloat(savedPrice); totalPriceElement.textContent = formatCurrency(numericPrice); } else if (totalPriceElement) { totalPriceElement.textContent = formatCurrency(0); }

    // --- APLICAÇÃO DAS MÁSCARAS DE INPUT ---
    const cpfInput = document.getElementById('cpf-input');
    const dobInput = document.getElementById('dob-input');
    const phoneInput = document.getElementById('phone-input');
    if (cpfInput) IMask(cpfInput, { mask: '000.000.000-00' });
    if (dobInput) IMask(dobInput, { mask: '00/00/0000' });
    if (phoneInput) IMask(phoneInput, { mask: [ { mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' } ] });

    // --- VALIDAÇÃO, RECAPTCHA E LÓGICA DE API ---
    const nameInput = document.getElementById('name-input');
    const emailInput = document.getElementById('email-input');
    const pixButton = document.getElementById('pix-button');
    const requiredFields = [cpfInput, nameInput, emailInput, phoneInput, dobInput];
    
    const recaptchaContainer = document.getElementById('recaptcha-simulation');
    const recaptchaIcon = document.getElementById('recaptcha-icon');
    const recaptchaText = document.getElementById('recaptcha-text');
    let captchaRunning = false;
    let captchaSolved = false;

    function navigateWithUTMs(destinationUrl) {
        const queryString = window.location.search;
        window.location.href = destinationUrl + queryString;
    }

    function runRecaptchaSimulation() {
        captchaRunning = true;
        recaptchaContainer.style.display = 'flex';
        recaptchaIcon.className = 'recaptcha-icon loading';
        recaptchaText.textContent = 'Verificando...';
        setTimeout(() => {
            captchaSolved = true;
            captchaRunning = false;
            recaptchaIcon.className = 'recaptcha-icon success';
            recaptchaIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" /></svg>`;
            recaptchaText.textContent = 'Verificação concluída!';
            validateForm(); 
        }, 2000);
    }
 
    function validateForm() {
        const allFieldsFilled = requiredFields.every(input => input && input.value.trim() !== '');
        if (allFieldsFilled && !captchaSolved && !captchaRunning) {
            runRecaptchaSimulation();
        }
        if(pixButton) {
            pixButton.disabled = !(allFieldsFilled && captchaSolved);
        }
    }

    requiredFields.forEach(input => {
        if(input) input.addEventListener('input', validateForm);
    });

    if (pixButton) {
        pixButton.addEventListener('click', () => {
            if (pixButton.disabled) return;
            
            // --- INÍCIO DA INTEGRAÇÃO UTMIFY ---
            // 1. Captura os parâmetros da URL atual
            const urlParams = new URLSearchParams(window.location.search);
            
            // 2. Cria um objeto com os dados de tracking
            const trackingParameters = {
                src: urlParams.get('src'),
                sck: urlParams.get('sck'),
                utm_source: urlParams.get('utm_source'),
                utm_campaign: urlParams.get('utm_campaign'),
                utm_medium: urlParams.get('utm_medium'),
                utm_content: urlParams.get('utm_content'),
                utm_term: urlParams.get('utm_term')
            };
            // --- FIM DA INTEGRAÇÃO UTMIFY ---

            const paymentData = {
                // Dados do cliente
                name: nameInput.value,
                cpf: cpfInput.value,
                email: emailInput.value,
                phone: phoneInput.value,
                
                // Dados da compra
                quantity: parseInt(savedQuantity, 10) || 0,
                
                // Dados de tracking
                tracking: trackingParameters // <-- ADICIONA O OBJETO AQUI
            };
            
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
            
            pixButton.disabled = true;
            pixButton.querySelector('span').textContent = 'Gerando...';

            fetch('https://backendfiote.onrender.com/gerar-pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(paymentData)
            })
            .then(response => {
                if (!response.ok) {
                     return response.json().then(err => { throw new Error(`Erro do servidor (${response.status}): ${err.error || 'Erro desconhecido'}`); });
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.transactionId) {
                    sessionStorage.setItem('transactionId', data.transactionId);
                    // Salva o preço final retornado pelo backend, que é a fonte da verdade
                    sessionStorage.setItem('paymentPrice', data.finalAmount);
                    navigateWithUTMs('payment.html');
                } else {
                    alert(`Não foi possível iniciar o pagamento. Motivo: ${data.error}`);
                    pixButton.disabled = false;
                    pixButton.querySelector('span').textContent = 'Gerar Pix';
                }
            })
            .catch(error => {
                console.error('Erro na chamada fetch:', error);
                alert(error.message);
                pixButton.disabled = false;
                pixButton.querySelector('span').textContent = 'Gerar Pix';
            });
        });
    }
    validateForm();
});