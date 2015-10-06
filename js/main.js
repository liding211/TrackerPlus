$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

var TimeHelper = {
    pad: function(num, size) {
        var s = "0" + num;
        return s.substr(s.length-size);
    },
    getFormattedTimeFromMilis: function(milis){
        var hours = Math.floor(milis / 36e5) % 24;
        var minutes = Math.floor(milis / 6e4) % 60;
        var seconds = Math.floor(milis / 1000) % 60;
        return this.pad(hours,2) + ':' + this.pad(minutes,2) + ':' + this.pad(seconds,2);
    },
};

$(function(){    
    new TrackerApp.Routers.Router();
    Backbone.history.start();
});