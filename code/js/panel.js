var helper = require('./modules/helper'),
    faker = require('faker/locale/en_US'),
    $ = require('jquery'),
    hljs = require('./libs/highlight'),
    Vue = require('vue');

hljs.registerLanguage('php', require('./libs/languages/php'));

var indent = "    ";
var fakerText="";
fakerText += indent + "\/**" + "\n";
fakerText += indent + " * @var Faker\Generator" + "\n";
fakerText += indent + " *\/" + "\n";
fakerText += indent + "protected $faker;" + "\n";
fakerText += indent + "" + "\n";
fakerText += indent + "\/**" + "\n";
fakerText += indent + " * Setup faker" + "\n";
fakerText += indent + " *\/" + "\n";
fakerText += indent + "public function setUp()" + "\n";
fakerText += indent + "{" + "\n";
fakerText += indent + "    parent::setUp();" + "\n";
fakerText += indent + "    $this->faker = \Faker\Factory::create();" + "\n";
fakerText += indent + "}";

var App = new Vue({
    el: "body",

    data: {
        renaming: false,
        editSettings: false,
        linebreak: "\n",
        indent: "        ",
        steps: [],
        message: '',
        namespace: '',
        className: 'ExampleTest',
        testName: helper.ucfirst(faker.company.catchPhraseNoun().replace('-','').replace(' ','')) + 'Is' + helper.ucfirst(faker.commerce.productAdjective().replace('-','')),
        recording: false,

        withoutMiddleware: false,
        dbMigrations: false,
        dbTransactions: false
    },

    watch: {
      'namespace': function() {
        this.updateCode();
      },

      'className': function() {
        this.updateCode();
      },

      'testName': function() {
        this.updateCode();
      },

      'withoutMiddleware': function() {
        this.updateCode();
      },

      'dbMigrations': function() {
        this.updateCode();
      },

      'dbTransactions': function() {
        this.updateCode();
      },

      'steps': function(val, oldVal) {
        this.updateCode();
      },

      'recording': function(val, oldVal) {
        _postMessage({
          'method': 'recording',
          'value': val
        });
      }
    },

    computed: {

      useStatements: function() {
        var statements = '';
        if (this.dbTransactions) {
          statements += 'use Illuminate\\Foundation\\Testing\\DatabaseTransactions;'+"\n";
        }
        if (this.dbMigrations) {
          statements += 'use Illuminate\\Foundation\\Testing\\DatabaseMigrations;'+"\n";
        }
        if (this.withoutMiddleware) {
          statements += 'use Illuminate\\Foundation\\Testing\\WithoutMiddleware;'+"\n";
        }
        return statements;
      },

      enabledTraits: function() {
        var traits = '';
        if (this.dbTransactions) {
          traits += '    '+'use DatabaseTransactions;'+"\n";
        }
        if (this.dbMigrations) {
          traits += '    '+'use DatabaseMigrations;'+"\n";
        }
        if (this.withoutMiddleware) {
          traits += '    '+'use WithoutMiddleware;'+"\n";
        }
        return traits;
      },

      hasFaker: function() {
        var hasFaker = false;
        this.steps.forEach(function(step){
          if (step.faker) {
            hasFaker = true;
          }
        });
        return hasFaker;
      }
    },

    filters: {
        implode: function(val, faker) {
            var result = '';
            if (val) {
              val.forEach(function(attribute, key){
                  if (key === 0 && faker === true) {
                    result += ""+attribute+", ";
                  } else {
                    result += "'"+helper.addslashes(attribute)+"', ";
                  }
              });
              return result.slice(0,-2);
            }
            return result;
        }
    },

    methods: {
      clear: function() {
        _postMessage({
          'method': 'clear'
        });
      },

      undo: function() {
          _postMessage({
            'method': 'undo'
          });
      },

      rename: function() {
        this.renaming = ! this.renaming;
        this.editSettings = false;
      },

      toggleEditSettings: function() {
        this.editSettings = ! this.editSettings;
        this.renaming = false;
      },

      copyTest: function() {
        var self = this;
        var range = document.createRange();
        var selection = window.getSelection();
        range.selectNodeContents(document.getElementById('testcode'));
        selection.removeAllRanges();
        selection.addRange(range);

        window.document.execCommand('Copy');

        this.message = 'Test successfully copied to clipboard.';

        setTimeout(function(){
          self.message = '';
        }, 1500);
      },

      updateCode: function() {
        var self = this;
        $('#testcode').html(hljs.highlightAuto(
          $('#steps')
            .text()
            .replace('%TESTNAME%', self.testName)
            .replace('%CLASSNAME%', self.className)
            .replace('%NAMESPACE%', (self.namespace !== '') ? 'namespace ' + self.namespace + ';' + "\n" : '' )
            .replace('%CLASS_USE_STATEMENTS%', self.useStatements)
            .replace('%ENABLED_TRAITS%', self.enabledTraits)
            .replace('%FAKER%', this.hasFaker ? fakerText : '' )
          ).value
        );
      }

    }

});

window.setSteps = function(message) {
  App.steps = message.steps;
};

window.setPathname = function(pathname) {
  var className = '';

  pathname.split('/').map(function(part){
    className += helper.ucfirst(part).replace(/[^\w]/gi, '');
  });
  App.className = className + 'Test';
};
