// Create a connection to the background page
var backgroundPageConnection = chrome.runtime.connect({
    name: "panel"
});

var tab_id = chrome.devtools.inspectedWindow.tabId;

backgroundPageConnection.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId
});

chrome.devtools.panels.create("Laravel TestTools", null, "../html/panel.html", function(extensionPanel) {
    var _window;
    var steps;

    extensionPanel.onShown.addListener(function tmp(panelWindow) {
        extensionPanel.onShown.removeListener(tmp); // Run once
        _window = panelWindow;

        _window._postMessage = function(obj) {
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
          _window._postMessage({
            "method": "getSteps"
          });
        }


        chrome.devtools.inspectedWindow.eval(
            "window.location.pathname",
             function(result) {
               _window.setPathname(result);
             }
        );
    });

    backgroundPageConnection.onMessage.addListener(function (message) {
      if (message.factories) {
        backgroundPageConnection.postMessage({
          "name": "setFactories",
          "tabId": tab_id,
          "factories": message.factories
        });
      } else {
        if (_window) {
          _window.setSteps(message);
        } else {
          steps = message;
        }
      }
    });
  }
);
