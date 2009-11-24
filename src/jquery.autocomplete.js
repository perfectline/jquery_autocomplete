(function() {

  var DEFAULT_OPTIONS = {

    delay:            1000,
    forceSelection:   false,
    minimumLength:    3,

    ajaxOptions:      {
      url:        null,
      cache:      false,
      dataType:   'json',
      data:       {}
    },

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

      response: function(content) {
        return item;
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

      self.options = jQuery.extend(true, {}, DEFAULT_OPTIONS, options);

      self.selectElement = jQuery('<ul class="autocomplete"/>');
      self.selectElement.css('position', 'absolute');
      self.selectElement.css('overflow', 'hidden');
      self.selectElement.css('display', 'none');
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
          self.cancel();
        }
      });

      jQuery(document).bind('click.autocomplete', function() {
        if (self.selectOpen) {
          self.cancel();
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

        item.css('display', 'block');
        item.css('overflow', 'hidden');

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
      self.selectElement.slideDown(300);

      self.options.events.onOpen.call(self.options);
    },

    close: function() {
      var self = this;

      if (self.options.forceSelection) {
        self.inputElement.val("");
      }

      self.options.events.onClose.call(self.options);

      self.selectData = [];
      self.selectIndex = -1;
      self.selectOpen = false;

      self.selectElement.slideUp(300);
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

      var items = self.selectElement.find('li');

      var previous = self.selectElement.find('li.selected');
      var current = items[self.selectIndex];

      if (previous != null) {
        jQuery(previous).removeClass('selected');
      }

      if (current != null) {
        jQuery(current).addClass('selected');
      }
    },

    select: function() {
      var self = this;
      var item = self.selectData[self.selectIndex];

      self.inputElement.val(
              self.options.formatters.text.apply(self.options, item));

      self.options.events.onSelect.call(self.options, item);

      self.selectData = [];
      self.selectIndex = -1;
      self.selectOpen = false;

      self.selectElement.slideUp(300);
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
        self.cancel();
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

        if (self.inputElement.val().length >= self.options.minimumLength) {

          var params = jQuery.extend({}, self.options.ajaxOptions);

          jQuery.extend(params.data,
                  self.options.formatters.request.call(self.options, self.inputElement.val()));

          params.success = function(data) {
            var items = self.options.formatters.response.call(self.options, data);

            if (jQuery.isArray(items) && items.length > 0) {
              self.selectData = items;
              self.options.events.onResponse.call(self.options, true);
              self.open();
            }

          };

          params.error = function(data) {
            self.selectData = [];
            self.options.events.onResponse.call(self.options, false);
          };

          self.options.events.onRequest.call(self.options);

          jQuery.ajax(params);
        }

      }, self.options.delay);
    }
  };

  jQuery.fn.autocomplete = function(options) {
    return this.each(function() {
      new AutoComplete(this, options);
    });
  };

})();