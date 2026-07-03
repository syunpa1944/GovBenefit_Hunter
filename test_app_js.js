// Simulate window and document to load app.js in Node
const store = {};
global.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
global.window = {};
global.document = {
  head: {
    appendChild: function() {}
  },
  getElementById: function(id) {
    return {
      value: '0',
      innerText: '',
      innerHTML: '',
      appendChild: function() {},
      classList: { add: function() {}, remove: function() {}, contains: function() { return false; } },
      addEventListener: function() {},
      querySelectorAll: function() { return []; },
      closest: function() { return null; },
      querySelector: function() { return null; },
      parentElement: null
    };
  },
  createElement: function(tag) {
    return {
      value: '',
      innerText: '',
      style: {},
      appendChild: function() {},
      classList: { add: function() {}, remove: function() {} }
    };
  },
  querySelectorAll: function() { return []; }
};
global.confirm = function() { return false; };
global.fetch = async function() {
  return { json: async () => ({}) };
};
global.TossAds = {
  initialize: { isSupported: () => false },
  attachBanner: { isSupported: () => false },
  destroyAll: { isSupported: () => false }
};
global.TossPixel = function(id) {
  return { pageView: function() {}, adImpression: function() {}, custom: function() {} };
};
global.loadRewardedAd = function(params) {
  if (params.onEvent) params.onEvent({ type: 'loaded' });
};
loadRewardedAd.isSupported = function() { return true; };
global.showRewardedAd = function(params) {
  if (params.onEvent) params.onEvent({ type: 'reward' });
  return true;
};
showRewardedAd.isSupported = function() { return true; };

// Load the actual database data.js to simulate populated calendar
console.log('Loading data.js...');
require('./data.js'); // Populates global.window.BENEFITS_DATA

try {
  console.log('Loading app.js for simulation...');
  require('./app.js');
  
  // Now call onload which triggers render() with populated data
  if (typeof global.window.onload === 'function') {
    console.log('Running window.onload...');
    global.window.onload();
    console.log('\n✅ ✅ SUCCESS: ALL RUNTIME CODE PASSED 无 ERROR! ✅ ✅');
  }
} catch (err) {
  console.error('\n🚨 🚨 CRITICAL RUNTIME ERROR DETECTED: 🚨 🚨');
  console.error(err);
}
