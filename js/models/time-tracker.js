require([
        'underscore',
        'backbone',
        'backbone.localStorage'
    ],
    function(_, Backbone){
        var Models = {};
        Models.Log = Backbone.Model.extend({
            defaults: {
                startTime: 0,
                duration: 0,
                title: "",
                description: "",
            },

            localStorage: new Backbone.LocalStorage('logs'),

            initialize: function(){
                this.save();
            },

            validation: {
                startTime: {
                    required: true,
                    min: 1,
                    msg: 'Please enter start date',
                },
                title: {
                    required: true,
                    maxLength: 30,
                    msg: 'Please enter title',
                },
                duration: {
                    required: true,
                    min: 1,
                    msg: 'Please enter time spent value',
                },
            },
        });

        Models.LogFormData = Backbone.Model.extend({
            defaults: {
                id: 0,
                startTime: '',
                duration: '',
                title: '',
                description: 'Work description',
            },
            localStorage: new Backbone.LocalStorage('logFormData'),
            initialize: function(){
                this.fetch();
            },
        });

        Models.AppSettings = Backbone.Model.extend({
            defaults:{
                currentLocal: {
                    name: 'England',
                    dateTimeFormat: 'DD/MM/YYYY hh:mm A',
                    example: '18/09/2015 12:05 PM',
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: "HH:mm:ss",
                    local: 'en',
                },
            },
            dayValueInMilis: (24 * 60 * 60 * 1000),
            hourValueInMilis: (60 * 60 * 1000),
            localStorage: new Backbone.LocalStorage('settings'),
            moment: window.moment,

            availableLocals: {
                en: {
                    name: 'England',
                    dateTimeFormat: 'DD/MM/YYYY hh:mm A',
                    example: '18/09/2015 12:05 PM',
                    dateFormat: 'DD/MM/YYYY',
                    timeFormat: "HH:mm:ss",
                    local: 'en',
                },
                se: {
                    name: 'Sweden',
                    dateTimeFormat: 'YYYY-MM-DD HH.mm',
                    example: '2015-09-18 15.59',
                    dateFormat: 'YYYY-MM-DD',
                    timeFormat: "HH:mm:ss",
                    local: 'se',
                },
            },

            initialize: function(){
                this.fetch();
            },
        });



        return Models;
    }
);