// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: "panel"
});

var tab_id = chrome.devtools.inspectedWindow.tabId;

backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

chrome.devtools.panels.create("Laravel TestTools", null, "src/panel.html", function(extensionPanel) {
    var _window;
    var steps;

    extensionPanel.onShown.addListener(function tmp(panelWindow) {
        extensionPanel.onShown.removeListener(tmp); // Run once
        _window = panelWindow;

        _window.postMessage = function(obj) {
          backgroundPageConnection.postMessage({
            "name": "postMessage",
            "tabId": tab_id,
            "object": obj
          });
        };

        // Initialize
        if (steps) {
          _window.setSteps(steps);
        } else {
          _window.postMessage({
            "method": "getSteps"
          });
        }
    });

    backgroundPageConnection.onMessage.addListener(function (message, sender, sendResponse) {
      if (_window) {
        _window.setSteps(message);
      } else {
        steps = message;
      }
    });
  }
);
