Object.defineProperty(
  Function.prototype, 
  'only', 
  {
    value: function(nargs) {
      var self = this;
      return function() { return self.apply(this,[].slice.call(arguments,0,nargs)); };
    }
  }
);
