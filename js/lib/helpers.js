define(function(){
    return {
        TimeHelper: {
            pad: function(num, size) {
                var s = "0" + num;
                return s.substr(s.length-size);
            },
            getFormattedTimeFromMilis: function(milis){
                var hours = Math.floor(milis / 36e5) % 24;
                var minutes = Math.floor(milis / 6e4) % 60;
                var seconds = Math.floor(milis / 1000) % 60;
                return this.pad(hours,2) + ':' + this.pad(minutes,2) + ':' + this.pad(seconds,2);
            }
        }
    };
});
