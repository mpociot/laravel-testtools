var $ = require('jquery'),
    faker = require('faker/locale/en_US'),
    Vue = require('vue');
    Vue.config.devtools = false;
    
var App = new Vue({

    data: {
        steps: [],
        recording: false
    },

    created: function() {
        var self = this;

        chrome.storage.local.get(null,function(items) {
          self.recording = items.recording || false;

          if (items.steps) {
            self.steps = items.steps;
          }
          self.initializeEvents();
        });
    },

    methods: {
      initializeEvents: function() {
        var self = this;

        if (self.recording === true) {
          if (this.steps.length === 0 || this.steps[this.steps.length-1].method !== 'press') {
            this.steps.push({
                'method': 'visit',
                'args': [window.location.pathname]
            });
          } else if (this.steps[this.steps.length-1].method === 'press') {
            this.steps.push({
                'method': 'seePageIs',
                'args': [window.location.pathname]
            });
          }
        }

        $(document).on('change', 'textarea, input[type!="checkbox"][type!="file"][type!="submit"]', function(){
          if (self.recording === true) {
            var name    = $(this).attr("name"),
                value   = $(this).val();
            self.steps.push({
                'method': 'type',
                'args': [value, name]
            });
          }
        });

        $(document).on('change', 'input[type="file"]', function(){
          if (self.recording === true) {
            var name    = $(this).attr("name"),
                value   = 'absolutePathToFile';
            self.steps.push({
                'method': 'attach',
                'args': [value, name]
            });
          }
        });

        $(document).on('change', 'input[type="checkbox"]', function(){
          if (self.recording === true) {
            var name    = $(this).attr("name");
            if (this.checked) {
                self.steps.push({
                    'method': 'check',
                    'args': [name]
                });
            } else {
                self.steps.push({
                    'method': 'uncheck',
                    'args': [name]
                });
            }
          }
        });

        $(document).on('click', 'input[type="submit"],button', function(){
            if (self.recording === true) {
              var name    = $(this).attr("name") || $(this).text().trim();
              if (name === '') {
                name = $(this).val();
              }
              self.steps.push({
                  'method': 'press',
                  'args': [name]
              });
            }
        });

        $(document).on('click', 'a', function(){
            if (self.recording === true) {
                var linkText = $(this).text().trim();
                if (linkText !== '') {
                    self.steps.push({
                        'method': 'clickLink',
                        'args': [linkText]
                    });
                }
            }
        });

        $(document).on('change', 'select', function(){
          if (self.recording === true) {
            var name    = $(this).attr("name"),
                value   = $(this).val();
            self.steps.push({
                'method': 'select',
                'args': [value, name]
            });
          }
        });
      }
    },

    watch: {
      'steps': function(val) {
        var self = this;
        chrome.storage.local.set({'steps': val, 'preserveSteps': self.preserveSteps});
        chrome.extension.sendMessage({
          'steps' : val
        });
      }
    },

});


var clickedEl = null;

document.addEventListener("mousedown", function(event){
    if(event.button === 2) {
        clickedEl = event.target;
    }
}, true);

chrome.extension.onRequest.addListener(function(request) {

    var method = request.method || false;
    if(method === "seeText") {
        App.steps.push({
            'method': 'see',
            'args': [request.text]
        });
    }
    if(method === "waitForText") {
        App.steps.push({
            'method': 'waitForText',
            'args': [request.text]
        });
    }
    if(method === "press") {
        var name    = $(clickedEl).attr("name") || $(clickedEl).text().trim();
        if (name === '') {
          name = $(clickedEl).val();
        }
        App.steps.push({
          'method': 'press',
          'args': [name]
        });
    }
    if(method === "visit") {
        App.steps.push({
            'method': 'visit',
            'args': [window.location.pathname]
        });
    }
    if(method === "seePageIs") {
        App.steps.push({
            'method': 'seePageIs',
            'args': [window.location.pathname]
        });
    }
    if(method === "recording") {
        App.recording = request.value;
        chrome.storage.local.set({'steps': App.steps, 'recording': App.recording});
        if (App.recording === true && App.steps.length === 0) {
          App.steps.push({
              'method': 'visit',
              'args': [window.location.pathname]
          });
        }
    }
    if(method === "clear") {
        App.recording = request.value;
        App.steps = [];
    }
    if(method === "undo") {
        App.steps.pop();
    }
    if(method === "importFactories") {
      var fileChooser = document.createElement("input");
      fileChooser.setAttribute("accept", ".php");
      fileChooser.type = 'file';

      fileChooser.addEventListener('change', function (evt) {
        var f = evt.target.files[0];
        if(f) {
          var reader = new FileReader();
          reader.onload = function(e) {
            var contents = e.target.result;
            // Lookup factories and factory properties
            var factoryRegex = /factory->define\(\s?(.*)\s?,/g;
            var propertyRegex = /\s*[\'\"](.*)[\'\"]\s*=>\s*(.*)\s*,/g;
            var match, factoryMatch;
            if (contents.match(factoryRegex) === null) {
              alert("No Laravel factories found.\nPlease select the database/factories/ModelFactory.php file.");
              return;
            }
            var factories = [],
                factoryIndex = 0,
                properties = [];
            var factoryStrings = contents.split(/factory->define\(\s?.*\s?,/);
            factoryStrings.shift();
            while ((match = factoryRegex.exec(contents)) !== null) {
                properties = [];
                if (match.index === factoryRegex.lastIndex) {
                    factoryRegex.lastIndex++;
                }
                while ((factoryMatch = propertyRegex.exec(factoryStrings[factoryIndex])) !== null) {
                  if (factoryMatch.index === propertyRegex.lastIndex) {
                      propertyRegex.lastIndex++;
                  }
                  properties.push({
                    key: factoryMatch[1],
                    value: factoryMatch[2]
                  });
                }
                factoryIndex++;
                factories.push({
                  name: match[1],
                  properties: properties
                });
            }
            alert("Successfully imported "+factories.length+" factories.");
            chrome.extension.sendMessage({
              'factories' : factories
            });
          };
          reader.readAsText(f);
        }
      });

      fileChooser.click();
    }

    if(method === "createFactoryModel") {
      App.steps.push({
        'custom': true,
        'action': '$model = factory('+request.model+')->make()'
      });
    }

    if(method === "fake") {
        var fakeData  = "";

        switch (request.type) {
          case "email":
            fakeData = faker.internet.email();
          break;
          case "name":
            fakeData = faker.name.findName();
          break;
          case "firstname":
            fakeData = faker.name.firstName();
          break;
          case "lastname":
            fakeData = faker.name.lastName();
          break;
          case "word":
            fakeData = faker.lorem.words().pop();
          break;
          case "url":
            fakeData = faker.internet.url();
          break;
        }
        $(clickedEl).val(fakeData);

        App.steps.push({
          'method': 'type',
          'faker': true,
          'args': ['$this->faker->'+request.type, $(clickedEl).attr("name")]
        });
    }

    if(method === "getSteps") {
      chrome.extension.sendMessage({
        'steps' : App.steps
      });
    }
});
