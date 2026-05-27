import fs from 'fs';

import path from 'path';

// const mapName = 'marina';
// const mapName = 'paradise-island';
// const mapName = 'great-lakes';
// const mapName = 'costa-rica';
// const mapName = 'alaska';
// const mapName = 'australia';
// const mapName = 'scotland';


// const mapName = 'thailand';
// const mapName = 'amazon';
// const mapName = 'chemical-plant';
// const mapName = 'nuclear-plant';
// const mapName = 'petrochemical';
const mapName = 'bermuda-triangle';

// const category = 'fish';
// const category = 'creature';
const category = 'item';
// const category = 'monster';
let startIndex = 22;
let endIndex = 24;
// let prefix = 'M';
// let prefix = '';
// let prefix = '0';
let prefix = 'DT-';
// let prefix = 'a';
// let prefix = 'DT-';
// const pad = true
const pad = false

async function downloadFile(url, outPath) {
    try {
        const res = await fetch(url);

        if (!res.ok) {
            console.log('SKIP', url);
            return;
        }

        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.log('SKIP', url);
            return;
        }
        const buffer = Buffer.from(await res.arrayBuffer());

        fs.writeFileSync(
            outPath,
            buffer
        );

        console.log('DOWN', outPath);

    } catch (err) {

        console.log(
            'ERR',

            url,

            err.message
        );

    }

}

const normalDir = `./assets/maps/${mapName}/portraits/${category}`;
const tightDir = `${normalDir}/figure`;

fs.mkdirSync(normalDir, {
    recursive: true
});

fs.mkdirSync(tightDir, {
    recursive: true
});

async function download() {

    for (let i = startIndex; i <= endIndex; i++) {
        const id = pad ?
            `${prefix}${String(i).padStart(2, '0')}`
            :
            `${prefix}${i}`;
        // 일반
        const normalUrl = `https://cloversalad.com/fishPortraits/${id}.png`;
        // tight
        const tightUrl = `https://cloversalad.com/fishPortraits/tight/${id}W.png`;

        await downloadFile(
            normalUrl,
            path.join(normalDir, `${id}.png`)
        );

        await downloadFile(
            tightUrl,
            path.join(tightDir, `${id}W.png`)
        );
    }
}

download();
