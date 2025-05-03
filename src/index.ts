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

            // Options
            const options = [
                'embed-token',
                'amount',
                'currency',
            ];
            const data: any = {}; // AB: type this
            for (const option of options) {
                const value = this.container.getAttribute(`data-${option}`);
                if (!value) throw new Error(`Missing option: ${option}`); // AB: Go to Error URL
                data[option.charAt(0).toLowerCase()] = value;
            }

            // Strict sandbox - customize only if needed
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
