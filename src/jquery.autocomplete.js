(function() {

  var OPTIONS = {

    forceSelection:   false,

    queryLengthMin:   3,
    queryDelay:       1000,
    queryUrl:         null,
    queryParams:      {},

    formatters: {
      text: function(item) {
        return item.name;
      },

      html: function(item) {
        return item.name;
      }
    },

    events: {
      onOpen: function() {
      },

      onClose: function() {
      },

      onSelect: function(item) {
      },

      onRequest: function() {
      },

      onResponse: function() {
      }
    }
  };

  var KEYS = {
    ENTER:  13,
    ESC:    27,
    TAB:    9,
    UP:     38,
    DOWN:   40,
    LEFT:   37,
    RIGHT:  39
  };

  var AutoComplete = function(element, options) {
    this.init(element, options);
  };

  AutoComplete.prototype = {

    options:        null,

    inputElement:   null,
    inputTimeout:   null,

    selectElement:  null,
    selectIndex:    -1,
    selectData:     [],
    selectOpen:     false,

    init: function(element, options) {

      var self = this;

      self.options = jQuery.extend({}, OPTIONS, options);

      self.selectElement = jQuery('<ul class="autocomplete"/>');
      self.selectElement.prependTo(jQuery('body'));

      self.inputElement = jQuery(element);
      self.inputElement.attr('autocomplete', 'off');

      self.inputElement.bind('keydown.autocomplete', function(event) {
        self.onKeyDown(event);
      });

      self.inputElement.bind('keypress.autocomplete', function(event) {
        self.onKeyPress(event);
      });

      self.inputElement.bind("click.autocomplete", function(event) {
        event.stopPropagation();

        if (self.selectOpen) {
          self.close(false);
        }
      });

      jQuery(document).bind("click.autocomplete", function(event) {
        if (self.selectOpen) {
          self.close(false);
        }
      });

      if (self.options.queryUrl == null) {
        if (jQuery.isFunction(self.inputElement.metadata) && self.inputElement.metadata().url) {
          self.options.queryUrl = self.inputElement.metadata().url;
        } else {
          self.options.queryUrl = self.inputElement.attr('rel');
        }
      }
    },

    open: function() {

      var self = this;

      self.selectElement.css('top', self.inputElement.offset().top + self.inputElement.outerHeight());
      self.selectElement.css('left', self.inputElement.offset().left);
      self.selectElement.css('width', self.inputElement.innerWidth());

      self.selectElement.html('');

      jQuery(self.selectData).each(function() {
        var item = jQuery('<li/>');

        item.html(self.options.formatters.html.call(self.options, this));

        item.bind('click.autocomplete', function() {
          self.select();
        });

        item.bind('mouseenter.autocomplete', function() {
          self.selectIndex = self.selectElement.find('li').index(item) + 1;
          self.selectElement.find('li.selected').removeClass('selected');
          self.selectElement.find('li:nth-child(' + self.selectIndex + ')').addClass('selected');
        });

        self.selectElement.append(item);
      });

      self.selectElement.find('li:first').addClass('selected');
      self.selectIndex = 1;
      self.selectOpen = true;
      self.selectElement.slideDown(300);

      self.options.events.onOpen.call(self.options);
    },

    close: function(selected) {
      var self = this;

      self.selectData = [];
      self.selectIndex = -1;
      self.selectOpen = false;
      self.selectElement.slideUp(300);

      if (self.options.forceSelection && !selected) {
        self.inputElement.val("");
      }

      self.options.events.onClose.call(self.options);
    },

    prev: function() {
      var self = this;

      self.selectIndex--;

      if (self.selectIndex < 1) {
        self.selectIndex = self.selectData.length;
      }

      self.selectElement.find('li.selected').removeClass('selected');
      self.selectElement.find('li:nth-child(' + self.selectIndex + ')').addClass('selected');
    },

    next: function() {
      var self = this;

      self.selectIndex++;

      if (self.selectIndex > self.selectData.length) {
        self.selectIndex = 1;
      }

      self.selectElement.find('li.selected').removeClass('selected');
      self.selectElement.find('li:nth-child(' + self.selectIndex + ')').addClass('selected');
    },

    select: function() {
      var self = this;
      var index = Math.max(0, self.selectIndex - 1);

      var text = self.options.formatters.text.apply(self.options, self.selectData[index]);

      self.inputElement.val(text);
      self.options.onSelect.call(self.options);
      self.close(true);
    },

    onKeyDown: function(event) {
      var self = this;
      var code = event.keyCode;

      if (!self.selectOpen) {
        return;
      }

      if (code == KEYS.UP || code == KEYS.LEFT) {
        event.preventDefault();
        self.prev();

      } else if (code == KEYS.DOWN || code == KEYS.RIGHT || code == KEYS.TAB) {
        event.preventDefault();
        self.next();

      } else if (code == KEYS.ENTER) {
        event.preventDefault();
        self.select();

      } else if (code == KEYS.ESC) {
        event.preventDefault();
        self.close(false);
      }
    },

    onKeyPress: function(event) {
      var self = this;
      var code = event.charCode;

      if (code == 0) {
        return;
      }

      if (self.inputTimeout != null) {
        window.clearInterval(self.inputTimeout);
      }

      self.inputTimeout = window.setInterval(function() {
        window.clearInterval(self.inputTimeout);

        if (self.inputElement.val().length >= self.options.queryLengthMin) {

          self.options.events.onRequest.call(self.options);

          var params = jQuery.extend({}, self.options.queryParams, {
            query: self.inputElement.val()
          });

          jQuery.ajax({
            url:        self.options.queryUrl,
            cache:      false,
            data:       params,
            dataType:   'json',

            success: function(data) {
              if (jQuery.isArray(data) && data.length > 0) {
                self.selectData = data;
                self.options.events.onResponse.call(self.options);
                self.open();
              }
            },

            error: function() {
              self.selectData = [];
              self.options.events.onResponse.call(self.options);
            }
          });
        }

      }, self.options.queryDelay);
    }
  };

  jQuery.fn.autocomplete = function(options) {
    return this.each(function() {
      new AutoComplete(this, options);
    });
  };

})();