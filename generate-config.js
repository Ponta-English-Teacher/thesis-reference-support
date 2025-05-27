const fs = require('fs');
const path = require('path');

const configContent = `
window.APP_CONFIG = {
  OPENAI_API_KEY: "${process.env.VITE_OPENAI_API_KEY || ''}",
  SEMANTIC_SCHOLAR_API_KEY: "${process.env.VITE_SEMANTIC_SCHOLAR_API_KEY || ''}"
};
`;

const outputPath = path.join(__dirname, 'config.js');
fs.writeFileSync(outputPath, configContent.trim());

console.log('Generated config.js with API keys.');
