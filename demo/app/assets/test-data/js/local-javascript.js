'use strict';

function getNumber() {
  return 42;
}

function getNumberFloat() {
  return 3.14;
}

function getFalse() {
  return false;
}

function getTruth() {
  return true;
}

function getString() {
  return 'string result from webview JS function';
}

function getArray() {
  return [1.5, true, "hello"];
}

function getObject() {
  return {
    prop: "test",
    name: "object-test",
    values: [
      42,
      3.14
    ]
  };
}

function setupEventListener() {
  window.nsWebViewBridge.on('tns-message', function (args) {
    window.nsWebViewBridge.emit('web-message', args);
  });
}

function testPromiseResolve() {
  return new Promise(function(resolve) {
    setTimeout(function() {
      resolve(42);
    }, 100);
  });
}

function testPromiseReject() {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      reject(new Error('The Cake is a Lie'));
    }, 100);
  });
}