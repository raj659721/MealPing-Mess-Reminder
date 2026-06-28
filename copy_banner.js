const fs = require('fs');
try {
    fs.copyFileSync('C:\\Users\\hp\\.gemini\\antigravity-ide\\brain\\e4e9280a-df0d-4f02-8728-b726b8f88d85\\app_mockup_banner_1782659201496.png', './assets/banner.png');
    console.log("Successfully copied banner");
} catch (e) {
    console.error(e);
}
