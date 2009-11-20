(function() {

  //TODO: inline critical (most?) CSS styles

  var DEFAULT_OPTIONS = {

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
      },

      request: function(value) {
        return {query: value};
      },

      response: function(item) {
        return item;
      }
    },

    effects: {
      open: function(element, callback) {
        element.slideDown(300, callback);
      },

      //TODO: add effect hover: function(current, previous, callback)?

      select: function(element, callback) {
        element.slideUp(300, callback);
      },

      cancel: function(element, callback) {
        element.slideUp(300, callback);
      }
    },

    events: {
      onOpen: function() {
      },

      onHover: function(item) {
      },

      onSelect: function(item) {
      },

      onCancel: function() {
      },

      onRequest: function() {
      },

      onResponse: function(success) {
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

  var HOVER_NEXT = -20;
  var HOVER_PREV = -30;

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

      self.options = jQuery.extend(true, {}, AUTOCOMPLETE_OPTIONS, options);

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

      self.inputElement.bind('click.autocomplete', function(event) {
        event.stopPropagation();

        if (self.selectOpen) {
          self.close(false);
        }
      });

      jQuery(document).bind('click.autocomplete', function() {
        if (self.selectOpen) {
          self.close(false);
        }
      });
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
          self.hover(self.selectElement.find('li').index(item));
        });

        self.selectElement.append(item);
      });

      self.hover(0);
      self.selectOpen = true;

      self.options.effects.open.call(self.options, function() {
        self.options.events.onOpen.call(self.options);
      });
    },

    hover: function(index) {
      var self = this;

      if (index == HOVER_NEXT) {
        self.selectIndex++;

        if (self.selectIndex >= self.selectData.length) {
          self.selectIndex = 0;
        }

      } else if (index == HOVER_PREV) {
        self.selectIndex--;

        if (self.selectIndex < 0) {
          self.selectIndex = self.selectData.length - 1;
        }

      } else if (index >= 0 && index < self.selectData.length) {
        self.selectIndex = index;

      } else {
        return;

      }

      self.selectElement.find('li.selected').removeClass('selected');

      var items = self.selectElement.find('li');

      if (items[self.selectIndex]) {
        items[self.selectIndex].addClass('selected');
      }
    },

    select: function() {
      var self = this;
      var item = self.selectData[self.selectIndex];

      self.inputElement.val(
              self.options.formatters.text.apply(self.options, item));

      self.effects.close.call(self.options,
              self.options.onSelect.call(self.options, item));

      self.selectData = [];
      self.selectIndex = -1;
      self.selectOpen = false;
    },

    cancel: function() {
      var self = this;

      if (self.options.forceSelection) {
        self.inputElement.val("");
      }

      self.effects.close.call(self.options,
              self.options.onCancel.call(self.options));

      self.selectData = [];
      self.selectIndex = -1;
      self.selectOpen = false;
    },

    onKeyDown: function(event) {
      var self = this;
      var code = event.keyCode;

      if (!self.selectOpen) {
        return;
      }

      if (code == KEYS.UP || code == KEYS.LEFT) {
        event.preventDefault();
        self.hover(HOVER_PREV);

      } else if (code == KEYS.DOWN || code == KEYS.RIGHT || code == KEYS.TAB) {
        event.preventDefault();
        self.hover(HOVER_NEXT);

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