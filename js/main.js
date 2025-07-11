document.addEventListener('DOMContentLoaded', () => {

  // --- Seleção de Elementos ---
    const quantityInput = document.getElementById('quantity-input');
    const decreaseBtn = document.getElementById('decrease-btn');
    const increaseBtn = document.getElementById('increase-btn');
    const paymentBtn = document.getElementById('payment-btn');
    const selectableItems = document.querySelectorAll('.selectable-item');
    const spinCards = document.querySelectorAll('.spin-card');
    const quantityWarning = document.getElementById('quantity-warning');
    const footerSummary = document.getElementById('footer-summary');
    const footerNoSelection = document.getElementById('footer-no-selection');
    const summaryNumbers = document.getElementById('summary-numbers');
    const summaryOriginalPrice = document.getElementById('summary-original-price');
    const summaryFinalPrice = document.getElementById('summary-final-price');

    // NOVO: Seleção dos elementos da barra flutuante
    const quantityInputMobile = document.getElementById('quantity-input-mobile');
    const decreaseBtnMobile = document.getElementById('decrease-btn-mobile');
    const increaseBtnMobile = document.getElementById('increase-btn-mobile');
    const paymentBtnMobile = document.getElementById('payment-btn-mobile');
    const footerSummaryMobile = document.getElementById('footer-summary-mobile');
    const summaryNumbersMobile = document.getElementById('summary-numbers-mobile');
    const summaryOriginalPriceMobile = document.getElementById('summary-original-price-mobile');
    const summaryFinalPriceMobile = document.getElementById('summary-final-price-mobile');

    let finalPriceForCheckout = 0;

    // --- Constantes de Lógica de Negócio ---
    const PRICE_PER_NUMBER = 1.00;
    const MINIMUM_QUANTITY = 3;
    const DISCOUNT_TIER_1_QTY = 20;
    const DISCOUNT_TIER_1_PERCENT = 0.50;
    const DISCOUNT_TIER_2_QTY = 60;
    const DISCOUNT_TIER_2_PERCENT = 0.67;

    // --- Funções Auxiliares ---
    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function getPriceDetails(quantity) {
        const originalPrice = quantity * PRICE_PER_NUMBER;
        let finalPrice = originalPrice;
        let hasDiscount = false;
        let discountPercentage = 0;
        if (quantity >= DISCOUNT_TIER_2_QTY) {
            discountPercentage = DISCOUNT_TIER_2_PERCENT;
        } else if (quantity >= DISCOUNT_TIER_1_QTY) {
            discountPercentage = DISCOUNT_TIER_1_PERCENT;
        }
        if (discountPercentage > 0) {
            finalPrice = originalPrice * (1 - discountPercentage);
            hasDiscount = true;
        }
        return { finalPrice, originalPrice, hasDiscount };
    }

    // --- Função Principal de UI ---
    function updateSummaryAndButton() {
        let quantity = parseInt(quantityInput.value, 10);
        if (isNaN(quantity) || quantity < 0) { quantity = 0; }

        if (quantity >= MINIMUM_QUANTITY) {
            // Esconde avisos e mostra os rodapés
            quantityWarning.style.display = 'none';
            footerSummary.style.display = 'flex';
            footerSummaryMobile.style.display = 'flex';
            footerNoSelection.style.display = 'none';
            paymentBtn.disabled = false;
            paymentBtnMobile.disabled = false;
            
            const priceDetails = getPriceDetails(quantity);
            
            // Atualiza AMBOS os rodapés
            const numbersText = `${quantity} Número${quantity !== 1 ? 's' : ''}`;
            summaryNumbers.textContent = numbersText;
            summaryNumbersMobile.textContent = numbersText;
            
            if (priceDetails.hasDiscount) {
                const originalPriceText = formatCurrency(priceDetails.originalPrice);
                summaryOriginalPrice.textContent = originalPriceText;
                summaryOriginalPriceMobile.textContent = originalPriceText;
                summaryOriginalPrice.style.display = 'block';
                summaryOriginalPriceMobile.style.display = 'block';
            } else {
                summaryOriginalPrice.style.display = 'none';
                summaryOriginalPriceMobile.style.display = 'none';
            }
            const finalPriceText = formatCurrency(priceDetails.finalPrice);
            summaryFinalPrice.textContent = finalPriceText;
            summaryFinalPriceMobile.textContent = finalPriceText;

            finalPriceForCheckout = priceDetails.finalPrice;
        } else {
            quantityWarning.innerHTML = `<span>A quantidade mínima é ${MINIMUM_QUANTITY}</span>`;
            quantityWarning.style.display = 'block';
            footerSummary.style.display = 'none';
            footerNoSelection.style.display = 'block';
            paymentBtn.disabled = true;
        }
    }

    // --- Event Listeners ---
    decreaseBtn.addEventListener('click', () => {
        let currentValue = parseInt(quantityInput.value, 10);
        if (currentValue > 1) {
            quantityInput.value = currentValue - 1;
            updateSummaryAndButton();
        }
    });

    increaseBtn.addEventListener('click', () => {
        quantityInput.value = parseInt(quantityInput.value, 10) + 1;
        updateSummaryAndButton();
    });

    decreaseBtnMobile.addEventListener('click', () => {
        let currentValue = parseInt(quantityInputMobile.value, 10);
        if (currentValue > 1) {
            quantityInputMobile.value = currentValue - 1;
            quantityInput.value = quantityInputMobile.value; // Sincroniza
            updateSummaryAndButton();
        }
    });

    increaseBtnMobile.addEventListener('click', () => {
        quantityInputMobile.value = parseInt(quantityInputMobile.value, 10) + 1;
        quantityInput.value = quantityInputMobile.value; // Sincroniza
        updateSummaryAndButton();
    });

    
     quantityInput.addEventListener('input', () => {
        quantityInputMobile.value = quantityInput.value;
        updateSummaryAndButton();
    });
     
    quantityInputMobile.addEventListener('input', () => {
        quantityInput.value = quantityInputMobile.value;
        updateSummaryAndButton();
    });

    quantityInput.addEventListener('change', () => {
        if (parseInt(quantityInput.value, 10) < 1) {
            quantityInput.value = 1;
        }
        updateSummaryAndButton();
    });
    const goToCheckout = () => {
        sessionStorage.setItem('checkoutQuantity', quantityInput.value);
        sessionStorage.setItem('checkoutPrice', finalPriceForCheckout);
        window.location.href = 'checkout.html';
    };
    paymentBtn.addEventListener('click', goToCheckout);
    paymentBtnMobile.addEventListener('click', goToCheckout);
    selectableItems.forEach(item => {
        item.addEventListener('click', () => {
            const currentQuantity = parseInt(quantityInput.value, 10) || 0;
            const quantityToAdd = parseInt(item.dataset.quantity, 10);
            quantityInput.value = currentQuantity + quantityToAdd;
            updateSummaryAndButton();
        });
    });

    paymentBtn.addEventListener('click', () => {
        // <<< ALTERAÇÃO AQUI >>>
        sessionStorage.setItem('checkoutQuantity', quantityInput.value); // Salva a quantidade
        sessionStorage.setItem('checkoutPrice', finalPriceForCheckout);
        window.location.href = 'checkout.html';
    });

    spinCards.forEach(card => {
        card.addEventListener('click', () => {
            const quantityElement = card.querySelector('.spin-card-details b');
            if (quantityElement) {
                const quantityText = quantityElement.textContent.replace(/[^0-9]/g, '');
                const quantity = parseInt(quantityText, 10);
                if (!isNaN(quantity)) {
                    const priceDetails = getPriceDetails(quantity);
                    // <<< ALTERAÇÃO AQUI >>>
                    sessionStorage.setItem('checkoutQuantity', quantity); // Salva a quantidade
                    sessionStorage.setItem('checkoutPrice', priceDetails.finalPrice);
                    window.location.href = 'checkout.html';
                }
            }
        });
    });

    // --- Lógica da Data Dinâmica ---
    function getNextDrawDate() {
        const referenceDrawDate = new Date('2025-07-12T17:00:00');
        const now = new Date();
        const timeDifference = now.getTime() - referenceDrawDate.getTime();
        const cycleDuration = 14 * 24 * 60 * 60 * 1000;
        const cyclesPassed = Math.ceil(timeDifference / cycleDuration);
        const nextDrawTimestamp = referenceDrawDate.getTime() + (cyclesPassed * cycleDuration);
        return new Date(nextDrawTimestamp);
    }
    function formatDrawDate(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    const drawDateElement = document.querySelector('.draw-info .info-value');
    if (drawDateElement) {
        const nextDraw = getNextDrawDate();
        const formattedDate = formatDrawDate(nextDraw);
        drawDateElement.textContent = formattedDate;
        console.log(`Próximo sorteio atualizado para: ${formattedDate}`);
    }
    
    // --- Inicialização ---
    updateSummaryAndButton();
});