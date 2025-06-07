(function () {
    'use strict';

    class PosfraEmbed {
        private container: Element;
        private embedToken: string | null = null;
        private ref: string | null = null;
        private cookieRef: string | null = null;
        private noWarning: boolean = false;
        private redirectURL: string | null = null;
        private username: string | null = null;

        constructor(container: Element) {
            this.container = container;

            const ref = this.container.getAttribute('data-ref');
            if (!ref) {
                this.build();
            }
        }

        private setCookie(name: string, value: string, hours: number): void {
            const date = new Date();
            date.setTime(date.getTime() + (hours * 60 * 60 * 1000));
            const expires = `expires=${date.toUTCString()}`;
            document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Strict`;
        }

        private getCookie(name: string): string | null {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
            return null;
        }

        private deleteCookie(name: string): void {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
        }

        private shortUUID(): string {
            return 'xxxxxxxx'.replace(/[xy]/g, (char) => {
                const rand = Math.random() * 16 | 0;
                const value = char === 'x' ? rand : (rand & 0x3 | 0x8);
                return value.toString(16);
            });
        }

        private getStatus(ref: string): Promise<Response> {
            let embedToken = this.embedToken;
            if (this.username) embedToken = `${embedToken}:${this.username}`;

            return fetch(`${API_URL}/ref/${ref}`, {
                headers: {
                    'embedtoken': embedToken as string,
                },
            });
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

                    // Update cookieRef
                    if (this.cookieRef !== null) {
                        this.deleteCookie('posfra_ref');
                        this.setCookie('posfra_ref', this.ref, 24);
                        this.cookieRef = this.ref;
                    }

                    if (data.isAccepted === true) {
                        this.deleteCookie('posfra_ref');

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
            iframe.style.height = '550px';
            iframe.style.margin = 'auto';
            iframe.style.display = 'block';
            iframe.style.backgroundColor = 'rgb(18, 18, 18)';
            iframe.style.borderRadius = '15px';
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin'); // Strict sandbox - No allow-forms, no allow-popups, no allow-top-navigation


            // Get embed token
            const embedToken = this.container.getAttribute('data-embed-token');
            if (!embedToken) throw new Error('Missing embed token');
            this.embedToken = embedToken;

            // cookieRef
            this.cookieRef = this.getCookie('posfra_ref');

            // Ref
            this.ref = this.shortUUID();
            this.container.setAttribute('data-ref', this.ref);
            console.log(`Posfra transaction ref: ${this.ref}`);
            if (!this.cookieRef) this.setCookie('posfra_ref', this.ref, 24);

            // Redirect URL
            const redirectURL = this.container.getAttribute('data-redirect-url');
            if (redirectURL && this.validateUrl(redirectURL)) {
                this.redirectURL = redirectURL;
            }

            // No Warning
            this.noWarning = this.container.getAttribute('data-no-warning') !== null;
            if (!this.noWarning) {
                iframe.addEventListener('load', () => window.addEventListener('beforeunload', this.beforeUnloadHandler));
            } else {
                console.log('Posfra: No warnings');
            }

            // Allow Custom
            const allowCustom = this.container.getAttribute('data-allow-custom') !== null;

            // Allow Custom Meta
            const allowCustomMeta = this.container.getAttribute('data-allow-message') !== null;

            // Metadata
            let meta = '';
            const m = this.container.getAttribute('data-meta');
            if (m !== null) {
                if (m.length > 255) {
                    console.warn(`data-meta truncated, value is longer than 255 chars`);
                }
                meta = m.substring(0, 255);
            }

            // Username
            if (this.container.getAttribute('data-username')) {
                this.username = this.container.getAttribute('data-username') as string;
            }

            type EmbedData = {
                et: string;
                r: string;
                cr: string | null;
                ac: boolean | null;
                acm: boolean | null;
                m: string;
                u?: string;
                btc: string | null;
            };

            const data: EmbedData = {
                et: this.embedToken,
                r: this.ref,
                cr: this.cookieRef,
                ac: allowCustom,
                acm: allowCustomMeta,
                m: meta,
                btc: null,
            };

            if (this.username) {
                data.u = this.username;
            }

            // Options
            type PaymentOption = 'btc';
            const options: PaymentOption[] = ['btc'];
            let i = 0;
            for (const option of options) {
                const value = this.container.getAttribute(`data-${option}`);
                if (value && !/^\d*\.?\d+$/.test(value)) {
                    throw new Error(`Invalid ${option} amount: ${value}`);
                }

                if (value) {
                    data[option] = value;
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
