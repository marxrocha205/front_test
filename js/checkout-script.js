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
    // ... (lógica do recaptcha não muda) ...
    const recaptchaContainer = document.getElementById('recaptcha-simulation');
    const recaptchaIcon = document.getElementById('recaptcha-icon');
    const recaptchaText = document.getElementById('recaptcha-text');
    let captchaRunning = false;
    let captchaSolved = false;

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
            
            // <<< CORREÇÃO FINAL >>>
            // Voltamos a enviar o amount e a quantity, como você intuiu.
            const paymentData = {
                amount: parseFloat(savedPrice),
                quantity: parseInt(savedQuantity, 10) || 0,
                name: nameInput.value,
                cpf: cpfInput.value,
                email: emailInput.value,
                phone: phoneInput.value
            };
            
            sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
            
            pixButton.disabled = true;
            pixButton.querySelector('span').textContent = 'Gerando...';

            fetch('http://127.0.0.1:5000/gerar-pix', {
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
                    sessionStorage.setItem('paymentPrice', paymentData.amount);
                    window.location.href = 'payment.html';
                } else {
                    alert('Não foi possível iniciar o pagamento. Tente novamente.');
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