(function () {
    'use strict';

    class PosfraEmbed {
        private container: Element;
        private embedToken: string | null = null;
        private ref: string | null = null;
        private noWarning: boolean = false;
        private redirectURL: string | null = null;

        constructor(container: Element) {
            this.container = container;
            this.build();
        }

        private shortUUID(): string {
            return 'xxxxxxxx'.replace(/[xy]/g, (char) => {
                const rand = Math.random() * 16 | 0;
                const value = char === 'x' ? rand : (rand & 0x3 | 0x8);
                return value.toString(16);
            });
        }

        private getStatus(ref: string): Promise<Response> {
            return fetch(`${API_URL}/ref/${ref}`);
        }

        private beforeUnloadHandler(event: BeforeUnloadEvent) {
            const message = 'Are you sure you want to leave? Your payment process may be interrupted.';
            event.preventDefault();
            event.returnValue = message;
            return message;
        };

        private async update(): Promise<void> {
            try {
                if (!this.ref) return;
                const response = await this.getStatus(this.ref);
                if (response.ok) {
                    const data = await response.json();
                    if (data.isPaid === true) {

                        if (!this.noWarning) {
                            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
                        }

                        if (this.redirectURL) {
                            window.location.href = this.redirectURL;
                        }
                    }
                }
            } catch (_) { }
        }

        private validateUrl(url: string): boolean {
            try {
                new URL(url);
                return true;
            } catch (error) {
                if (url !== '') {
                    console.error(`ERROR 73380: Invalid URL: ${url}`);
                    console.error(error);
                }
                return false;
            }
        }

        public build() {
            const iframe = document.createElement('iframe');
            iframe.setAttribute('width', '100%');
            iframe.setAttribute('height', '600');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('loading', 'lazy');
            iframe.style.width = '300px';
            iframe.style.height = '500px';
            iframe.style.margin = 'auto';
            iframe.style.display = 'block';
            iframe.style.border = '0';
            iframe.style.borderRadius = '15px';
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin'); // Strict sandbox - No allow-forms, no allow-popups, no allow-top-navigation


            // Get embed token
            const embedToken = this.container.getAttribute('data-embed-token');
            if (!embedToken) throw new Error('Missing embed token');
            this.embedToken = embedToken;
            this.ref = this.shortUUID();
            console.log(`Posfra transaction ref: ${this.ref}`);

            // Redirect URL
            const redirectURL = this.container.getAttribute('data-redirect-url');
            if (redirectURL && this.validateUrl(redirectURL)) {
                this.redirectURL = redirectURL;
            }

            // No Warning
            this.noWarning = this.container.getAttribute('data-no-warning') === 'true';
            if (!this.noWarning) {
                iframe.addEventListener('load', () => window.addEventListener('beforeunload', this.beforeUnloadHandler));
            }



            // AB: type this
            const data: any = {
                et: this.embedToken,
                r: this.ref,
            };

            // Options
            const options = [
                'btc',
                'eth',
                'xmr',
                'doge',
            ];
            let i = 0;
            for (const option of options) {
                const value = this.container.getAttribute(`data-${option}`);
                if (value) {
                    data[option.toLowerCase()] = value;
                    i++;
                }
            }
            if (i === 0) throw new Error('Missing payment options');

            // Set URL
            const base64 = btoa(JSON.stringify(data));
            iframe.setAttribute('src', `${EMBED_URL}/${base64}`);
            this.container.innerHTML = ''; // prevent XSS from inner HTML
            this.container.appendChild(iframe);

            // this.update();
            setInterval(async () => await this.update(), 30 * 1000);
        }
    }

    function init() {
        document.querySelectorAll('.posfra').forEach((container) => {
            new PosfraEmbed(container);
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
