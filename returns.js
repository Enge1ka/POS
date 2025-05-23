document.addEventListener('DOMContentLoaded', () => {
    const returnForm = document.getElementById('returnForm');
    const returnResultDiv = document.getElementById('returnResult');
    const transactionIdField = document.getElementById('transactionId');
    const returnReasonField = document.getElementById('returnReason');

    if (returnForm) {
        returnForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            const sale_id = transactionIdField.value.trim();
            const reason = returnReasonField.value.trim();

            if (!sale_id || !reason) {
                returnResultDiv.innerHTML = '<p style="color: red;">Please fill in both Transaction ID and Reason for Return.</p>';
                return;
            }

            returnResultDiv.innerHTML = '<p>Processing your return...</p>';
            const submitButton = returnForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;

            try {
                const response = await fetch('/api/returns', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sale_id, reason }),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
                }

                returnResultDiv.innerHTML = `
                    <p style="color: green;">${responseData.message}</p>
                    <p>Returned Amount: $${responseData.totalReturnedAmount ? parseFloat(responseData.totalReturnedAmount).toFixed(2) : 'N/A'}</p>
                `;
                returnForm.reset(); // Clear form
            } catch (error) {
                console.error('Error processing return:', error);
                returnResultDiv.innerHTML = `
                    <p style="color: red;">Return processing failed: ${error.message}</p>
                `;
            } finally {
                submitButton.disabled = false;
            }
        });
    } else {
        console.error('Return form not found on the page!');
    }
});
