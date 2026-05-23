const { JSDOM } = require("jsdom");
const dom = new JSDOM();
global.window = dom.window;

const img = new window.Image();
img.onload = () => { console.log('success event triggered directly'); };
img.dispatchEvent(new window.Event('load'));
