const fs = require('fs');
const path = require('path');

const csvFile = 'ex.csv';
const outputFile = 'output.json';

function csvToJson(csv, delimiter = ';') {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(delimiter).map(h => h.trim());

    return lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim());
        return headers.reduce((obj, header, idx) => {
            let val = values[idx];
            if (val === '') val = null;
            else if (val === 'true' || val === '1') val = true;
            else if (val === 'false' || val === '0') val = false;
            obj[header] = val;
            return obj;
        }, {});
    });
}

fs.readFile(path.join(__dirname, csvFile), 'utf8', (err, data) => {
    if (err) {
        console.error('Erreur de lecture :', err);
        return;
    }

    const json = csvToJson(data, ';');

    // Format : tableau JSON, chaque objet sur une ligne avec virgule
    const formatted = '[\n' +
        json.map(obj => '  ' + JSON.stringify(obj)).join(',\n') +
        '\n]';

    fs.writeFile(path.join(__dirname, outputFile), formatted, (err) => {
        if (err) {
            console.error('Erreur d’écriture :', err);
        } else {
            console.log(`✅ Fichier JSON bien formaté créé : ${outputFile}`);
        }
    });
});
