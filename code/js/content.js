var $ = require('jquery'),
    faker = require('faker/locale/en_US'),
    Vue = require('vue');

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

        $('textarea, input[type!="checkbox"][type!="submit"]').on('change', function(){
          if (self.recording === true) {
            var name    = $(this).attr("name"),
                value   = $(this).val();
            self.steps.push({
                'method': 'type',
                'args': [value, name]
            });
          }
        });

        $('input[type="checkbox"]').on('change', function(){
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

        $('input[type="submit"],button').on('click', function(){
            if (self.recording === true) {
              var name    = $(this).attr("name") || $(this).text().trim();
              self.steps.push({
                  'method': 'press',
                  'args': [name]
              });
            }
        });

        $('select').on('change', function(){
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
    if(method === "press") {
        var name    = $(clickedEl).attr("name") || $(clickedEl).text().trim();
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
