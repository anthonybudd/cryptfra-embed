// build.js
const esbuild = require('esbuild');
const dotenv = require('dotenv');
dotenv.config();

esbuild.build({
    entryPoints: ['src/index.ts'],         // Your main TypeScript file
    bundle: true,                          // Bundle dependencies
    minify: true,                          // Minify output for CDN use
    sourcemap: false,                       // Optional: useful for debugging
    outfile: 'dist/embed.js',              // Output file
    format: 'iife',                        // IIFE format so it can be used in <script>
    globalName: 'CinfraEmbed',             // Expose your code as `window.CinfraEmbed`
    target: ['es2017'],                    // Set target environment (adjust as needed)
    platform: 'browser',                   // Optimize for browser usage
    logLevel: 'info',                     // Log build info to console
    define: {
        'API_URL': `'${process.env.API_URL}'`,
    }
}).catch(() => process.exit(1));