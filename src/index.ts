(function () {
    'use strict';

    class CinfraEmbed {
        private container: Element;

        constructor(container: Element) {
            this.container = container;
            this.build();
        }

        public build() {
            const iframe = document.createElement('iframe');
            iframe.setAttribute('width', '100%');
            iframe.setAttribute('height', '600');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('loading', 'lazy');
            iframe.style.width = '300px';
            iframe.style.height = '500px';

            // Add event listener to warn before refreshing or changing page
            const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
                // Standard message (browsers may show their own message instead)
                const message = 'Are you sure you want to leave? Your payment process may be interrupted.';
                event.preventDefault();
                event.returnValue = message;
                return message;
            };

            // Add the event listener when the iframe loads
            iframe.addEventListener('load', () => {
                window.addEventListener('beforeunload', beforeUnloadHandler);
            });

            // Create a method to remove the warning when payment is complete
            // This can be called via postMessage from the iframe when payment succeeds
            window.removePaymentWarning = () => {
                window.removeEventListener('beforeunload', beforeUnloadHandler);
            };

            // Get embed token
            const embedToken = this.container.getAttribute('data-embed-token');
            if (!embedToken) throw new Error('Missing embed token');

            // AB: type this
            const data: any = {
                et: embedToken,
            };

            // Options
            const options = [
                'btc',
                'eth',
                'xmr',
                'doge',
            ];
            for (const option of options) {
                const value = this.container.getAttribute(`data-${option}`);
                if (value) data[option.toLowerCase()] = value;
            }

            // Strict sandbox
            iframe.setAttribute(
                'sandbox',
                'allow-scripts allow-same-origin' // No allow-forms, no allow-popups, no allow-top-navigation
            );

            // Add security style isolation
            iframe.style.border = '0';
            iframe.style.display = 'block';

            // Set URL
            const base64 = btoa(JSON.stringify(data));
            iframe.setAttribute('src', `http://127.0.0.1:3000/${base64}`);

            // Insert iframe securely
            this.container.innerHTML = ''; // prevent XSS from inner HTML
            this.container.appendChild(iframe);
        }
    }

    function init() {
        document.querySelectorAll('.cinfra').forEach((container) => {
            new CinfraEmbed(container);
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
