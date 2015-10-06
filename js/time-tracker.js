var TrackerApp = {
    Models: {},
    Collections: {},
    Views: {},
    Routers: {},
}

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

//Model
////Tracker
TrackerApp.Models.Log = Backbone.Model.extend({
    defaults: {
        startTime: 0,
        duration: 0,
        title: "",
        description: "",
    },
    
    localStorage: new Store('logs'),
    
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
TrackerApp.Models.LogFormData = Backbone.Model.extend({
    defaults: {
        id: 0,
        startTime: '',
        duration: '',
        title: '',
        description: 'Work description',
    },
    localStorage: new Store('logFormData'),
    initialize: function(){
        this.fetch();
    },
});
////Settings
TrackerApp.Models.Settings = Backbone.Model.extend({
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
    localStorage: new Store('settings'),
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

//Collection
////Tracker
TrackerApp.Collections.Logs = Backbone.Collection.extend({
    
    fieldForSort: 'startTime',
    sortMode: 1, //desc type
    dateRange: '7_days', //format: 'Number string' e.g. '5 years'
    groupType: 'day', // 'day' or 'week'
    appSettings: null,
    
    localStorage: new Store('logs'),
    
    initialize: function(options){
        this.appSettings = options.appSettings;
        this.moment = this.appSettings.moment;
        this._groupedData = this._regroup(),
        this.listenTo(this, 'add remove sync', this._regroup);
    },
        
    comparator: function(modelOne, modelTwo){
        firstModelData = modelOne.get(this.fieldForSort);
        secondModelData = modelTwo.get(this.fieldForSort);

        if (firstModelData > secondModelData) return (-1 * this.sortMode);
        if (secondModelData > firstModelData) return (1 * this.sortMode);
        return 0; //if equal
    },
    
    changeSortField: function (fieldName) {
        this.fieldForSort = fieldName;
    },
    
    _regroup: function() {
        var that = this;
        switch(this.groupType){
            case 'week':
                that._groupedData = _.groupBy(this.models, function(model){
                    return this.moment(model.get('startTime')).format('w');
                });
                break;
            case 'day':
            default:
                that._groupedData = _.groupBy(this.models, function(model){
                    return this.moment(model.get('startTime')).format(this.appSettings.get('currentLocal').dateFormat);
                }, this);
                break;
        };
    },
    
    analyticsStartDateInMilis: function(){
        var fromDate = (new String(this.dateRange)).split('_');
        return this.moment().subtract(fromDate[0], fromDate[1]).valueOf(); 
    },
    
    _prepareModelsInGroupForAnalyticsView: function(){
        var dateFormat = this.appSettings.get('currentLocal').dateFormat;
        var preparedModels = [];
        _.each(
            this._groupedData, 
            function(groupOfModels, index){
                //check if index are in required period of date
                if(this.moment(index, this.groupType == 'week' ? 'w' : dateFormat).valueOf() > this.analyticsStartDateInMilis()){
                    var analyticsModel = {
                        indexForSort: index,
                        period: '',
                        duration: 0,
                        timeSpent: '',
                    };

                    //set period of analytics row
                    switch(this.groupType){
                        case 'week':
                            analyticsModel.period = 
                                this.moment(this.moment(index, 'w').startOf('week').valueOf()).format(dateFormat) + ' - ' + 
                                this.moment(this.moment(index, 'w').endOf('week').valueOf()).format(dateFormat) +
                                (this.moment(index, 'w').endOf('week').valueOf() > this.moment().valueOf() ? '(*)' : '');
                            break;
                        case 'day':
                        default:
                            analyticsModel.period = index;
                            break;
                    };

                    //count total duration
                    _.each(groupOfModels, function(model){
                        analyticsModel.duration += model.get('duration');
                    });

                    //set duration in time format
                    analyticsModel.timeSpent = TimeHelper.getFormattedTimeFromMilis(
                        analyticsModel.duration
                    );

                    preparedModels.push(new Backbone.Model(analyticsModel));
                }
            }, 
            this
        );
        return preparedModels;
    },
    
    getModelsForAnalitycsView: function() {
        this._regroup();
        return this._prepareModelsInGroupForAnalyticsView();
    },
    
    getSortedModelsForAnalitycsView: function() {
        return (this.getModelsForAnalitycsView()).sort(function(a, b){
            if(a.indexForSort < b.indexForSort) return 1;
            if(a.indexForSort > b.indexForSort) return -1;
            return 0;
        });
    },
    
    setPeriod: function(period){
        this.dateRange = period;
    },
    setGroupBy: function(groupBy){
        this.groupType = groupBy;
    },
    
});

//Views
////Tracker
TrackerApp.Views.LogList = Backbone.View.extend({
    
    tagName: 'tbody',
    appSettings: null,
    
    events: {
        "click .data-sort": "sortBy",
    },
    
    initialize: function(options){
        this.listenTo(this.collection, "add remove sort", this.render);
        this.listenTo( Backbone, 'changes-in-log-row', function () {
            this.render();
        }, this );
        this.appSettings = options.appSettings;
    },
    
    render: function(){
        this.$el.html(''); //clear all previos logs rows
        this.collection.each(function(log){
            var logView = new TrackerApp.Views.Log({
                model: log,
                appSettings: this.appSettings,
                collection: this.collection,
            });
            this.$el.append(logView.render().el);
        }, this);
        return this;
    },
});
TrackerApp.Views.Log = Backbone.View.extend({
    tagName: 'tr',
    appSettings: null,
    
    events: {
        "mouseover": "showControlButton",
        "mouseout": "hideControlButton",
        "click #edit-log-row": "setLogRowAsEditable",
        "click #save-log-row": "saveChanges",
        "click #cansel-changes-log-row": "canselChanges",
        "click #delete-log-row": "delete",
    },
    
    initialize: function(options){
        this.template = _.template( $('#log-list-row').html() );
        this.appSettings = options.appSettings;
        this.moment = this.appSettings.moment;
    },
    
    render: function(){
        this.model.set('startTimeFormatted', this.moment(this.model.get('startTime')).format(this.appSettings.get('currentLocal').dateTimeFormat));
        this.model.set('durationFormatted', TimeHelper.getFormattedTimeFromMilis(this.model.get('duration')));
        var json = this.model.toJSON();
        var view = this.template(json);
        this.$el.html(view);
        return this;
    },
    
    setLogRowAsEditable: function(e){
        window.onEditLogRowElement = e;
        this.$el.find('#on-hover-buttons').hide();
        this.$el.find('#on-edit-buttons').show();
        this.$el.find('.log-row-data').each(function(){
            $(this).replaceWith('<textarea class="form-control" id="' + $(this).attr('id') + '" row="1">' + $(this).html() + '</textarea>');
        });
    },
    
    saveChanges: function(){
        var that = this;
        var hasError = false;
        this.$el.find('.form-control').each(function(index, field){
            if(!that._validateField(field)){
                hasError = true;
                $(field).addClass('has-error');
            }
        });
        if(!hasError){
            this.model.set({
                description: this.$el.find('#descriptionField').val().replace(/\n\r?/g, '<br />'),
                startTime: this.moment(this.$el.find('#startTimeField').val(), this.appSettings.get('currentLocal').dateTimeFormat).valueOf(),
                duration: this.moment.duration(this.$el.find('#durationField').val()).valueOf(),
                title: this.$el.find('#titleField').val(),            
            });
            if(this.model.isValid(true)){
                this.model.save();
                window.onEditLogRowElement = null;
                Backbone.trigger('changes-in-log-row');
            }
        }
    },
    
    _validateField: function(data){
        var value = $(data).val();
        var type = $(data).attr('id');
        switch(type){
            case 'startTimeField':
                if(!this.moment(value, this.appSettings.get('currentLocal').dateTimeFormat).isValid()){
                    return false;
                }
                break;
            case 'durationField':
                if(
                    !this.moment(value, 'HH:mm:ss').isValid() || 
                    this.moment.duration(value, 'HH:mm:ss').valueOf() == 0
                ){
                    return false;
                }
                break;
            case 'titleField':
                if(value.length == 0){
                    return false;
                }
                break;
            default:
                break;
        };
        return true;
    },
    
    canselChanges: function(){
        window.onEditLogRowElement = null;
        Backbone.trigger('changes-in-log-row');
    },
    
    showControlButton: function(){
        if(!window.onEditLogRowElement){
            this.$el.find('#log-row-control-buttons').show();
        }
    },
    
    hideControlButton: function(){
        if(!window.onEditLogRowElement){
            this.$el.find('#log-row-control-buttons').hide();
        }
    },
    
    delete: function(){
        this.model.destroy();
        this.render();
    },
});
TrackerApp.Views.LogForm = Backbone.View.extend({
    
    timer: 0,
    timerHandler: null,
    isTimerOn: false,
    formModel: null, //for storage form data after refresh or leave page
    
    events: {
        "click #save-tracker-form": function (e) {
            e.preventDefault();
            this.addNewLog();
        },
        "click #tracker-start-button": "startTracking",
        "click #tracker-pause-button": "pauseTracking",
        "click #tracker-stop-button": "stopTracking",
        "click #reset-tracker-form": "resetTrackingForm",
    },
    
    initialize: function(options){
        var that = this;
        
        this.appSettings = options.appSettings;
        this.formModel = options.formModel;
        this.moment = this.appSettings.moment;
        this.modelConstrutor = options.modelConstrutor;
        
        this.setStoredFormData();
        setInterval(function(){
            that.saveFormInputData();
        }, 5000);
    },
    
    render: function(){
        this.$el.find('#start_time_container').datetimepicker({
            format: this.appSettings.get('currentLocal').dateTimeFormat,
        });
        this.$el.find('#duration').datetimepicker({
            format: 'HH:mm:ss',
        });
    },
    
    addNewLog: function () {
        this.model = new this.modelConstrutor();
        Backbone.Validation.bind(this);
        this.model.set({
            description: this.$('#description').val().replace(/\n\r?/g, '<br />'),
            startTime: this.$('#start_time').val() ? 
                this.moment(this.$('#start_time').val(), this.appSettings.get('currentLocal').dateTimeFormat).valueOf() :
                0,
            duration: this.moment.duration(this.$('#duration').val()).valueOf(),
            title: this.$('#item_title').val(),
        });
        if(this.model.isValid(true)){
            this.collection.create(this.model);
            this.clearLogForm();
        }
    },
    
    saveFormInputData: function(){
        this.formModel.set({
            'description': this.$('#description').val().replace(/\n\r?/g, '<br />'),
            'startTime': this.$('#start_time').val(),
            'duration': this.$('#duration').val(),
            'title': this.$('#item_title').val(),
        });
        this.formModel.save();
    },
    
    setStoredFormData: function(){ 
        this.$('#description').val(this.formModel.get('description'));
        this.$('#start_time').val(this.formModel.get('startTime'));
        if(this.formModel.get('startTime') != '' || this.formModel.get('startTime') != false){
            this.$('#duration').val(TimeHelper.getFormattedTimeFromMilis(
                this.moment().valueOf() - this.moment(
                    this.formModel.get('startTime'), this.appSettings.get('currentLocal').dateTimeFormat
                ).valueOf()
            ));
        }
        this.$('#item_title').val(this.formModel.get('title'));
    },
    
    startTracking: function(e){
        this.timerStart();
        this.setStartDateInputFieldValue();
        $('.spent-time-container').hide();
        $('.spent-time-controller').show();
    },
    
    pauseTracking: function(){
        if(this.isTimerOn){
            $('#tracker-pause-icon').attr('class', 'glyphicon glyphicon-play');
            this.timerOff();
        } else {
            $('#tracker-pause-icon').attr('class', 'glyphicon glyphicon-pause');
            this.timerOn();
        }
    },
    
    stopTracking: function(){
        this.timerStop();
        this.setDurationInputFieldValue();
        $('#tracker-pause-icon').attr('class', 'glyphicon glyphicon-pause'); //if pause was activated
        this.hideTimeController();
    },
    
    resetTrackingForm: function(){
        this.resetTrackerLogForm();
        this.timerStop();
        $('.spent-time-container').show();
        $('.spent-time-controller').hide();
    },
    
    clearLogForm: function(){
        this.$el.find('#tracker-form').trigger("reset");
    },
    

    timerOn: function(){
        if(!this.isTimerOn){
            var that = this;
            this.timerHandler = setInterval(
                function(self){
                    that.timer++;
                    that.timerDisplay();
                }, 
                1000
            );
            this.isTimerOn = true;
        }
    },

    timerOff: function(){
        var that = this;
        clearInterval(that.timerHandler);
        this.isTimerOn = false;
    },

    timerStart: function(){
        //clearing previous result of tracking
        this.timerClear();
        this.timerDisplay(); 
        this.timerOn();
    },

    timerStop: function(){
        this.timerOff();
    },

    timerDisplay: function(){
        var hours = Math.floor(this.timer / 3600) % 24;      
        var minutes = Math.floor(this.timer / 60) % 60;
        var seconds = this.timer % 60;
        $('#timer').html(
            TimeHelper.pad(hours,2) + ':' + 
            TimeHelper.pad(minutes,2) + ':' + 
            TimeHelper.pad(seconds,2)
        );
    },

    timerClear: function(){
        this.timer = 0;
    },

    setStartDateInputFieldValue: function(){
        $('#start_time').val(moment().format(this.appSettings.get('currentLocal').dateTimeFormat));
    },

    hideTimeController: function(){
        $('.spent-time-container').show();
        $('.spent-time-controller').hide();
    },

    setDurationInputFieldValue: function(){
        $('#duration').val($('#timer').text());
    },

    resetTrackerLogForm: function (){
        $('#tracker-form').trigger("reset");
    },
});
TrackerApp.Views.LogListHeader = Backbone.View.extend({
    
    events: {
        "click [data-sort]": "sortBy",
    },
    
    initialize: function(){
        this.listenTo(this.collection, "change", this.render);
    },
    
    sortBy: function(e){
        $('.sort-type').each(function(){
            $(this).attr('class', 'sort-type');
        });
        var field = $(e.target).attr('data-sort');
        if(field != this.collection.fieldForSort){   
            this.collection.changeSortField(field);
            this.collection.sortMode = -1; //set mode as desc type
        } else {
            this.collection.sortMode = -1 * this.collection.sortMode;
        }
        
        if(this.collection.sortMode == 1)
            $(e.target).find('.sort-type').addClass('caret');
        if(this.collection.sortMode == -1)
            $(e.target).find('.sort-type').addClass('caret caret-reversed');
        
        this.collection.sort();
    },
});
////Analytics
TrackerApp.Views.AnalyticsContainer = Backbone.View.extend({
    
    modelsForView: [],
    
    events: {
        "click #analytics-table": "showAnalyticsTable",
        "click #analytics-graph": "showAnalyticsGraph",
    },
    
    initialize: function(options){
        this.appSettings = options.appSettings;
        this.listenTo(this.collection, 'all', this.render);
        this.render();
    },
    
    render: function(){
        this.$el.find('#analytics-rows-container').html('');
        this.modelsForView = this.collection.getSortedModelsForAnalitycsView();
        _.each(this.modelsForView, function(modelForView){ 
            var analyticRowView = new TrackerApp.Views.Analytics({
                model: modelForView,
            });
            this.$el.find('#analytics-rows-container').append(analyticRowView.render().el);
        },this);
        
        var that = this;
        google.load('visualization', '1', {
            callback: function(){ that.drawGraph(that) }, 
            packages: ['corechart', 'bar']
        });
        return this;
    },
    
    drawGraph: function(analyticsData){ 

        var data = new google.visualization.DataTable();
        data.addColumn('string', 'Motivation Level');
        data.addColumn('number', 'Time logged');
        
        _.each(
            analyticsData.modelsForView,
            function(model){
                data.addRow([
                    model.get('period'), 
                    {
                        v: (model.get('duration') / analyticsData.appSettings.hourValueInMilis), 
                        f: model.get('durationFormatted')
                    }
                ]);
            }
        );

        var options = {
            hAxis: {
                title: 'Date/Period',
            },
            vAxis: {
                title: 'Logged time (in hours)',
                viewWindow: {
                    min: 0
                }
            }
        };

        var chart = new google.visualization.ColumnChart(
            document.getElementById('chart_div')
        );

        chart.draw(data, options);
    },
    
    showAnalyticsTable: function(){
        this.$el.find('#analytics-graph-container').hide();
        this.$el.find('#analytics-table-container').show();
    },
    
    showAnalyticsGraph: function(){
        this.$el.find('#analytics-table-container').hide();
        this.$el.find('#analytics-graph-container').show();
    },
});
TrackerApp.Views.Analytics = Backbone.View.extend({
    tagName: 'tr',
    
    initialize: function(){
        this.template = _.template( $('#analytic-data-row').html() );
    },
    
    render: function(){
        this.model.set('durationFormatted', TimeHelper.getFormattedTimeFromMilis(this.model.get('duration')));
        var json = this.model.toJSON();
        var view = this.template(json);
        this.$el.html(view);
        return this;
    },
});
////Settings
TrackerApp.Views.Settings = Backbone.View.extend({
    events: {
        "change #time-format-selecter": "changeLocal"
    },
    
    initialize: function(){
        this.template = _.template( $('#settings-template').html() );
    },
    
    render: function(){
        this.model.set('availableLocals', this.model.availableLocals);
        var json = this.model.toJSON();
        var view = this.template(json);
        this.$el.html(view);
        this.displayLocalExample(this.model.get('currentLocal').local);
        return this;
    },
    
    displayLocalExample: function(local){
        this.$el.find('#time-example').html(
            this.model.availableLocals[local].example
        );
    }, 
    
    changeLocal: function(e){
        var selectedLocal = this.model.availableLocals[$(e.target).val()];
        this.displayLocalExample(selectedLocal.local);
        this.model.set('currentLocal', selectedLocal);
        this.model.save();
        this.render();
    },
});

//Router
TrackerApp.Routers.Router = Backbone.Router.extend({
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
        this.appSettings = new TrackerApp.Models.Settings({
            id: 1, //for getting single settings model
        });

        this.collections.timeLogs = new TrackerApp.Collections.Logs({
            model: TrackerApp.Models.Log,
            appSettings: this.appSettings,
        });
        this.collections.timeLogs.fetch();
        
        this.trackerViews = {
            timeLogList: new TrackerApp.Views.LogList({
                el: '#list-of-tracker-logs',
                collection: this.collections.timeLogs,
                appSettings: this.appSettings,
            }),
            timeLogForm: new TrackerApp.Views.LogForm({
                el: '#time_tracker',
                modelConstrutor: TrackerApp.Models.Log,
                collection: this.collections.timeLogs,
                appSettings: this.appSettings,
                formModel: new TrackerApp.Models.LogFormData(),
            }),
            timeLogListHeader: new TrackerApp.Views.LogListHeader({
                el: '#log-list-header',
                collection: this.collections.timeLogs,
            }),
        };
        
        this.analyticsViews = {
            analyticsTable: new TrackerApp.Views.AnalyticsContainer({
                el: '#analytics-container',
                collection: this.collections.timeLogs,
                appSettings: this.appSettings,
            }),
            analyticsRow: new TrackerApp.Views.Analytics({
                el: '#analytics-rows-container',
            }),
        };
        
        this.settingsViews.settings = new TrackerApp.Views.Settings({
            el: '#settings-container',
            model: this.appSettings,
            collection: this.collections.timeLogs,
        });
    },
});