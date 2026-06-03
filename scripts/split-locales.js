// scripts/split-locales.js - Split locales JSON files into modular sub-files
const fs = require('fs');
const path = require('path');

const locales = ['vi', 'en'];
const sourceDir = path.resolve(__dirname, '../client/src/shared/locales');

// Define category prefixes
const CATEGORIES = {
    auth: ['login.', 'profile.', 'force_pwd.'],
    tree: ['detail.', 'member.', 'field.'],
    newsfeed: ['newsfeed.'],
    chat: ['chat.'],
    calendar: ['calendar.'],
    requests: ['requests.'],
    system: ['system.', 'admin.'],
    call: ['call.'],
    // Everything else goes to common
};

locales.forEach(lang => {
    const filePath = path.join(sourceDir, `${lang}.json`);
    if (!fs.existsSync(filePath)) {
        console.error(`Source file not found: ${filePath}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Create folders
    const destDir = path.join(sourceDir, lang);
    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    const groups = {
        common: {},
        auth: {},
        tree: {},
        newsfeed: {},
        chat: {},
        calendar: {},
        requests: {},
        system: {},
        call: {}
    };

    Object.entries(data).forEach(([key, val]) => {
        let matched = false;
        for (const [catName, prefixes] of Object.entries(CATEGORIES)) {
            if (prefixes.some(p => key.startsWith(p))) {
                groups[catName][key] = val;
                matched = true;
                break;
            }
        }
        if (!matched) {
            groups.common[key] = val;
        }
    });

    // Write each file
    Object.entries(groups).forEach(([name, content]) => {
        const destPath = path.join(destDir, `${name}.json`);
        fs.writeFileSync(destPath, JSON.stringify(content, null, 4), 'utf8');
        console.log(`Saved ${destPath} with ${Object.keys(content).length} keys`);
    });

    // Create index.js in that folder
    const indexContent = `// Auto-generated index for ${lang} translations
import common from './common.json';
import auth from './auth.json';
import tree from './tree.json';
import newsfeed from './newsfeed.json';
import chat from './chat.json';
import calendar from './calendar.json';
import requests from './requests.json';
import system from './system.json';
import call from './call.json';

export default {
    ...common,
    ...auth,
    ...tree,
    ...newsfeed,
    ...chat,
    ...calendar,
    ...requests,
    ...system,
    ...call
};
`;
    const indexPath = path.join(destDir, 'index.js');
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`Created index file: ${indexPath}`);
});
