const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_FILE = path.join(__dirname, '../public/Logo.png');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function generateIcons() {
    try {
        if (!fs.existsSync(INPUT_FILE)) {
            console.error('Error: public/Logo.png not found.');
            process.exit(1);
        }

        console.log('Processing Logo.png...');

        // 1. Create the base 512x512 icon
        // We want a white background with the logo centered and fitted.
        // Using a slightly smaller logo size (e.g. 400px) inside the 512px box provides padding (maskable safe area).

        // safe zone for maskable icons is circle with radius 40%, i.e. 80% diameter.
        // 512 * 0.8 = 409.6. Let's maximize logo within ~400px box.

        const logoBuffer = await sharp(INPUT_FILE)
            .resize(400, 400, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 } // transparent fit
            })
            .toBuffer();

        const baseIconBuffer = await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
            }
        })
            .composite([{ input: logoBuffer, gravity: 'center' }])
            .png()
            .toBuffer();

        // Save the base 512 icon
        await sharp(baseIconBuffer).toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
        console.log('Created public/icon-512.png');

        // 2. Generate other sizes from the base buffer
        for (const size of SIZES) {
            if (size === 512) continue; // already created

            await sharp(baseIconBuffer)
                .resize(size, size)
                .toFile(path.join(PUBLIC_DIR, `icon-${size}.png`));

            console.log(`Created public/icon-${size}.png`);
        }

        console.log('All icons generated successfully!');

    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
