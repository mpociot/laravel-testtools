var connections = {};

function seeText(info, tab) {
    chrome.tabs.sendRequest(tab.id, {
        "method": "seeText",
        "text": info.selectionText
    });
}

function waitForText(info, tab) {
    chrome.tabs.sendRequest(tab.id, {
        "method": "waitForText",
        "text": info.selectionText
    });
}

function press(info, tab) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "press"
  });
}

function visit(info, tab) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "visit"
  });
}

function seePageIs(info, tab) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "seePageIs"
  });
}

function fake(info, tab, type) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "fake",
      "type": type
  });
}

function createFactoryModel(info, tab, model) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "createFactoryModel",
      "model": model
  });
}

function importFactories(info, tab) {
    chrome.tabs.sendRequest(tab.id, {
        "method": "importFactories"
    });
}

function loadMenu(factories) {
  chrome.contextMenus.removeAll(function() {
    // Create menu items
    var parent = chrome.contextMenus.create({"title": "Laravel TestTools", "contexts":["all"]});

    chrome.contextMenus.create({
      "title": "Import factories",
      "parentId": parent,
      "contexts":["all"],
      "onclick": importFactories
    });

    chrome.contextMenus.create({
      "type": "separator",
      "parentId": parent,
      "contexts":["all"]
    });

    chrome.contextMenus.create({
      "title": "Visit URL",
      "parentId": parent,
      "contexts":["all"],
      "onclick": visit
    });
    chrome.contextMenus.create({
      "title": "See Page is...",
      "parentId": parent,
      "contexts":["all"],
      "onclick": seePageIs
    });
    chrome.contextMenus.create({
      "title": "See text",
      "parentId": parent,
      "contexts":["selection"],
      "onclick": seeText
    });
    chrome.contextMenus.create({
      "title": "Wait for text",
      "parentId": parent,
      "contexts":["selection"],
      "onclick": waitForText
    });
    chrome.contextMenus.create({
      "title": "Press",
      "parentId": parent,
      "contexts":["all"],
      "onclick": press
    });

    if (factories) {
      var factoryMenu = chrome.contextMenus.create({
        "title": "Factories",
        "parentId": parent,
        "contexts":["all"]
      });

      factories.forEach(function(factory) {
        var parentFactory = chrome.contextMenus.create({
          "title": factory.name,
          "parentId": factoryMenu,
          "contexts": ["all"]
        });
        chrome.contextMenus.create({
          "title": "Create model: " + factory.name,
          "parentId": parentFactory,
          "contexts":["all"],
          "onclick": (function(factory){
                return function(info,tab){
                  createFactoryModel(info, tab, factory);
                };
            }(factory.name))
        });
        /**
        factory.properties.forEach(function(property){
            chrome.contextMenus.create({
              "title": property.key,
              "parentId": parentFactory,
              "contexts":["all"],
              "onclick": (function(key,value){
                    return function(info,tab){
                      createFactoryModel(info, tab, key, value);
                    };
                }(property.key,property.value))
            });
        });
        */

      });
    }

    var fakerMenu = chrome.contextMenus.create({
      "title": "Faker",
      "parentId": parent,
      "contexts":["all"]
    });

    var availableFaker = [
      { type: "email", name: "Email" },
      { type: "name", name: "Name" },
      { type: "firstname", name: "Firstname" },
      { type: "word", name: "Word" },
      { type: "url", name: "URL" },
    ];

    availableFaker.forEach(function(fakerData){
      chrome.contextMenus.create({
        "title": fakerData.name,
        "parentId": fakerMenu,
        "contexts": ["all"],
        "onclick": (function(type){
          return function(info, tab) {
            fake(info,tab,type);
          };
        }(fakerData.type))
      });
    });

  });
}


loadMenu();

chrome.runtime.onConnect.addListener(function (port) {

    var extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name === "init") {
          connections[message.tabId] = port;
          return;
        }

        if (message.name === "postMessage") {
          chrome.tabs.sendRequest(message.tabId, message.object);
        }

        if (message.name === "setFactories") {
          chrome.contextMenus.removeAll(function() {
            loadMenu(message.factories);
          });
        }
    };

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        port.onMessage.removeListener(extensionListener);
        // Disconnect means -> Dev tools closed. Set recording to false.
        var tabs = Object.keys(connections);
        for (var i=0, len=tabs.length; i < len; i++) {
          if (connections[tabs[i]] === port) {
            loadMenu();
            chrome.tabs.sendRequest(parseInt(tabs[i]), {
                "method": "recording",
                "value": false
            });
            delete connections[tabs[i]];
            break;
          }
        }
    });
});

// Receive message from content script and relay to the devTools page for the
// current tab
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Messages from content scripts should have sender.tab set
    if (sender.tab) {
      var tabId = sender.tab.id;
      if (tabId in connections) {
        connections[tabId].postMessage(request);
      } else {
        console.log("Tab not found in connection list.");
      }
    } else {
      console.log("sender.tab not defined.");
    }
    return true;
});
