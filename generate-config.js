const fs = require('fs');
const path = require('path');

// --- THESE ARE THE DEBUGGING LINES ---
console.log('DEBUG: VITE_OPENAI_API_KEY is', process.env.VITE_OPENAI_API_KEY ? 'DEFINED (value exists)' : 'UNDEFINED (value is missing)');
console.log('DEBUG: VITE_SEMANTIC_SCHOLAR_API_KEY is', process.env.VITE_SEMANTIC_SCHOLAR_API_KEY ? 'DEFINED (value exists)' : 'UNDEFINED (value is missing)');
// --- END DEBUGGING LINES ---

const configContent = `
window.APP_CONFIG = {
  OPENAI_API_KEY: "${process.env.VITE_OPENAI_API_KEY || ''}",
  SEMANTIC_SCHOLAR_API_KEY: "${process.env.VITE_SEMANTIC_SCHOLAR_API_KEY || ''}"
};
`;

const outputPath = path.join(__dirname, 'config.js');
fs.writeFileSync(outputPath, configContent.trim());

console.log('Generated config.js with API keys.');