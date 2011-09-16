var last_message = 0
var update_speed = 1000

Message = function(data) {
  this.nick = data.nick
  this.text = data.text
  this.time = data.time
  this.ip   = data.ip
}

Chat = function() {
  this.form   = jQuery('#chat form').hide()
  this.window = jQuery('#chat div.window')
  this.info   = {}
  this.tick_interval = null
  this.last_message = 0.0
}

Chat.prototype.setup = function() {
  var self = this
  jQuery.ajax({
    url: 'api/info', dataType: 'json',
    success: function(data) {
      self.info = data;
      self.tick_interval = setInterval(function(){self.tick()}, 1000);
      self.form.show();
    }
  })

  this.form.submit(function(e){
    var data = self.form.serialize()
    e.preventDefault();
    if(!self.form.find('input[name=text]').val()) return
    if(!self.form.find('input[name=nick]').val()) return
    jQuery.ajax({
      url: '/api/send_message', dataType: 'json', type: 'POST', data: data,
      success: function(data){
        if(data.error) {
          self.on_error(data)
        } else {
          self.form.find('input[name=text]').focus().val('')
        }
      }
    })
  })
}

Chat.prototype.tick = function() {
  var self = this
  jQuery.ajax({url: 'api/fetch', dataType: 'json', data: {since:this.last_message},
    success: function(data) {
      for(i=0; i<data.messages.length; i++) {
        var msg = new Message(data.messages[i]);
        self.append_message(msg)
      }
    }
  })
}

Chat.prototype.append_node = function(node) {
  var dom = this.window[0];
  var pos = dom.scrollTop;
  // Append node.
  node.hide().appendTo(this.window).slideDown();

  // Animate the scroll down
  var iv = setInterval(function(){
    var mv = dom.scrollHeight - dom.scrollTop - dom.clientHeight;
    mv *= 0.2;
    if(mv >= 1) dom.scrollTop += Math.ceil(mv);
    else clearInterval(iv);
  }, 50)
}

Chat.prototype.append_timestamp = function(date) {
  date.setMilliseconds(0)
  date.setSeconds(0)
  date.setMinutes(Math.floor(date.getMinutes()/15)*15)
  var node = jQuery('#tpl_timestamp').clone().attr('id', '')
  node.text(date.toLocaleString())
  this.append_node(node)
}

Chat.prototype.append_message = function(msg) {
  if(msg.time <= this.last_message) return
  if (Math.floor(this.last_message/60/15) < Math.floor(msg.time/60/15)) {
    var date = new Date(msg.time*1000);
    this.append_timestamp(date)
  }
  this.last_message = msg.time
  var node = jQuery('#tpl_message').clone().attr('id', '')
  node.find('.nick').text(msg.nick)
  node.find('.text').text(msg.text)
  this.append_node(node)
}

Chat.prototype.on_error = function(data) {
  var node = jQuery('<div />').text(data.error).appendTo(this.window)
  this.append_node(node)
}

jQuery(function(){
  chat = new Chat()
  chat.setup()
})