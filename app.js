require.config({
    baseUrl: "js/lib",
    paths: {
        moment: 'moment-with-locales',
        jquery: 'jquery.min',
        underscore: 'underscore',
        backbone: 'backbone',
        'google-charts-bar': 'jsapi.js',
        'backbone.validation': 'backbone-validation',
        'bootstrap-datetimepicker': 'bootstrap-datetimepicker',
        'backbone.localStorage': 'backbone-localstorage'
    },
    shim: {
        moment: {
            exports: 'Moment'
        },
        jquery: {
            exports: '$'
        },
        underscore: {
            exports: "_"
        },
        backbone: {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'backbone.localStorage': {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        'backbone.validation': {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        //'google-charts-bar': {
        //    exports: 'google'
        //},
    }
});

require([
        'underscore',
        'jquery',
        'backbone.validation',
        '../models/time-tracker',
        '../views/time-tracker',
        '../collections/time-tracker',
    ],
    function(_, $, Backbone,  Models, Views, Collections){
        // Extend the callbacks to work with Bootstrap, as used in this example
        // See: http://thedersen.com/projects/backbone-validation/#configuration/callbacks
        _.extend(Backbone.Validation.callbacks, {
            valid: function (view, attr, selector) {
                var $el = view.$('[name=' + attr + ']'),
                    $group = $el.closest('.form-group');

                $group.removeClass('has-error');
                $group.find('.help-block').html('').addClass('hidden');
            },
            invalid: function (view, attr, error, selector) {
                var $el = view.$('[name=' + attr + ']'),
                    $group = $el.closest('.form-group');

                $group.addClass('has-error');
                $group.find('.help-block').html(error).removeClass('hidden');
            }
        });
        _.extend(Backbone.Model.prototype, Backbone.Validation.mixin);

        var template = function(id){
            return _.template( $('#' + id).html() );
        };

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

        Router = Backbone.Router.extend({
            //entities for page
            trackerViews: {},
            analyticsViews: {},
            settingsViews: {},
            collections: {},

            routes: {
                '':                             'trackerPage',
                'analytics':                    'analyticsPage',
                'analytics/:action/:value':     'analyticsPage',
                'settings':                     'sattingsPage',
            },

            trackerPage: function(){
                this.clearStage();
                this.trackerViews.timeLogListHeader.render();
                this.trackerViews.timeLogList.render();
                this.trackerViews.timeLogForm.render();
                $('#tracker-container').show();
            },

            analyticsPage: function(action, value){
                if(action){
                    switch(action){
                        case 'period':
                            this.collections.timeLogs.dateRange = value;
                            break;
                        case 'group_by':
                            this.collections.timeLogs.groupType = value;
                            break;
                        default:
                            break;
                    };
                }
                this.clearStage();
                this.analyticsViews.analyticsTable.render();
                $('#analytics-container').show();
            },

            sattingsPage: function(){
                this.clearStage();
                this.settingsViews.settings.render();
                $('#settings-container').show();
            },

            clearStage: function(){
                $('.tab-controller').attr('class', 'tab-controller');
                $('.tab-container').each(function(){
                    $(this).hide();
                });
            },

            initialize: function(){
                this.appSettings = new Models.AppSettings({
                    id: 1, //for getting single settings model
                });

                this.collections.timeLogs = new Collections.Logs({
                    model: Models.Log,
                    appSettings: this.appSettings,
                });
                this.collections.timeLogs.fetch();

                this.trackerViews = {
                    timeLogList: new Views.LogList({
                        el: '#list-of-tracker-logs',
                        collection: this.collections.timeLogs,
                        appSettings: this.appSettings,
                    }),
                    timeLogForm: new Views.LogForm({
                        el: '#time_tracker',
                        modelConstrutor: Models.Log,
                        collection: this.collections.timeLogs,
                        appSettings: this.appSettings,
                        formModel: new Models.LogFormData(),
                    }),
                    timeLogListHeader: new Views.LogListHeader({
                        el: '#log-list-header',
                        collection: this.collections.timeLogs,
                    }),
                };

                this.analyticsViews = {
                    analyticsTable: new Views.AnalyticsContainer({
                        el: '#analytics-container',
                        collection: this.collections.timeLogs,
                        appSettings: this.appSettings,
                    }),
                    analyticsRow: new Views.Analytics({
                        el: '#analytics-rows-container',
                    }),
                };

                this.settingsViews.settings = new Views.Settings({
                    el: '#settings-container',
                    model: this.appSettings,
                    collection: this.collections.timeLogs,
                });
            },
        });

        $(function(){
            new Router();
            Backbone.history.start();
        });
    }
);