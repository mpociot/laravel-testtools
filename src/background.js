var connections = {};

chrome.runtime.onConnect.addListener(function (port) {

    var extensionListener = function (message, sender, sendResponse) {
        // The original connection event doesn't include the tab ID of the
        // DevTools page, so we need to send it explicitly.
        if (message.name == "init") {
          connections[message.tabId] = port;
          return;
        }

        if (message.name === "postMessage") {
          chrome.tabs.sendRequest(message.tabId, message.object);
        }
    }

    // Listen to messages sent from the DevTools page
    port.onMessage.addListener(extensionListener);

    port.onDisconnect.addListener(function(port) {
        port.onMessage.removeListener(extensionListener);
        // Disconnect means -> Dev tools closed. Set recording to false.
        var tabs = Object.keys(connections);
        for (var i=0, len=tabs.length; i < len; i++) {
          if (connections[tabs[i]] == port) {
            chrome.tabs.sendRequest(tabs[i], {
                "method": "recording",
                "value": false
            });
            delete connections[tabs[i]]
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


function seeText(info, tab) {
  chrome.tabs.sendRequest(tab.id, {
      "method": "seeText",
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

// Create menu items
var parent = chrome.contextMenus.create({"title": "Laravel TestTools", "contexts":["all"]});
var visitMenu = chrome.contextMenus.create({
  "title": "Visit URL",
  "parentId": parent,
  "contexts":["all"],
  "onclick": visit
});
var seePageIsMenu = chrome.contextMenus.create({
  "title": "See Page is...",
  "parentId": parent,
  "contexts":["all"],
  "onclick": seePageIs
});
var seeTextMenu = chrome.contextMenus.create({
  "title": "See text",
  "parentId": parent,
  "contexts":["selection"],
  "onclick": seeText
});
var pressMenu = chrome.contextMenus.create({
  "title": "Press",
  "parentId": parent,
  "contexts":["all"],
  "onclick": press
});

var fakerMenu = chrome.contextMenus.create({
  "title": "Faker",
  "parentId": parent,
  "contexts":["all"]
});

chrome.contextMenus.create({
  "title": "Email",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"email");
  }
});
chrome.contextMenus.create({
  "title": "Name",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"name");
  }
});
chrome.contextMenus.create({
  "title": "Firstname",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"firstname");
  }
});
chrome.contextMenus.create({
  "title": "Lastname",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"lastname");
  }
});
chrome.contextMenus.create({
  "title": "Word",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"word");
  }
});
chrome.contextMenus.create({
  "title": "URL",
  "parentId": fakerMenu,
  "contexts": ["all"],
  "onclick": function(info, tab) {
    fake(info,tab,"url");
  }
});
