/**
 * ChapApp - Generador de Variables de Entorno en Tiempo de Build
 * Lee las variables configuradas en Vercel y genera env.js para el cliente.
 */

import fs from 'fs';
import path from 'path';

const geminiKey = process.env.GEMINI_API_KEY || 
                  process.env.GOOGLE_GEMINI_API_KEY || 
                  process.env.GOOGLE_API_KEY || 
                  process.env.API_KEY_GEMINI || 
                  process.env.GEMINI_KEY ||
                  process.env.EXPO_PUBLIC_GEMINI_API_KEY || 
                  process.env.VITE_GEMINI_API_KEY || 
                  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
                  process.env.REACT_APP_GEMINI_API_KEY ||
                  process.env.GEMINI_API ||
                  '';

const envContent = `// Auto-generated build-time environment variables
window.__ENV = window.__ENV || {};
window.__ENV.GEMINI_API_KEY = ${JSON.stringify(geminiKey)};
`;

const targetPath = path.resolve('./env.js');
fs.writeFileSync(targetPath, envContent, 'utf-8');
console.log('✅ [build-env.js] env.js generado exitosamente. Clave Gemini detectada:', Boolean(geminiKey));
