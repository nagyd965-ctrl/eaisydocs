const fs = require('fs');
const pdf = require('pdf-parse');

async function extractAlerts() {
    try {
        const dataBuffer = fs.readFileSync('c:\\Users\\dani pc xd\\Desktop\\Projectek\\easydocs\\eaisyhr.pdf');
        const data = await pdf(dataBuffer);
        const text = data.text;

        const paragraphs = text.split(/\n\s*\n/);
        
        const keywords = ['riaszt', 'figyelmeztet', 'értesít', 'emlékeztet', 'lejár', 'automatikus'];
        
        const matchingParagraphs = paragraphs.filter(p => {
            const lowerP = p.toLowerCase();
            return keywords.some(k => lowerP.includes(k));
        });

        fs.writeFileSync('c:\\Users\\dani pc xd\\Desktop\\Projectek\\easydocs\\alerts_extracted.md', matchingParagraphs.join('\n\n---\n\n'));
        console.log(`Found ${matchingParagraphs.length} matching paragraphs. Saved to alerts_extracted.md`);
    } catch (err) {
        console.error(err);
    }
}

extractAlerts();
