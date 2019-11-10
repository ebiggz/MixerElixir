// #!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DEST_ZIP_DIR = path.join(__dirname, '../dist-zip');

const extractExtensionData = () => {
    const extPackageJson = require('../package.json');

    return {
        name: extPackageJson.name,
        version: extPackageJson.version
    };
};

const makeDestZipDirIfNotExists = () => {
    if (!fs.existsSync(DEST_ZIP_DIR)) {
        fs.mkdirSync(DEST_ZIP_DIR);
    }
};

const buildZip = (dist, zipFilename) => {
    console.info(`Building ${zipFilename}...`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = fs.createWriteStream(path.join(dist, zipFilename));

    return new Promise((resolve, reject) => {
        archive
            .glob('**/*', {
                dot: true,
                ignore: ['dist/**', 'dist-zip/**', 'node_modules/**', '.git/**', '.gitignore', '.github/**']
            })
            .on('error', err => reject(err))
            .pipe(stream);

        stream.on('close', () => resolve());
        archive.finalize();
    });
};

const main = () => {
    const { name, version } = extractExtensionData();

    const zipFilename = `${name}-v${version}-firefox-source.zip`;

    makeDestZipDirIfNotExists();

    buildZip(DEST_ZIP_DIR, zipFilename)
        .then(() => console.info('DONE'))
        .catch(console.err);
};

main();
