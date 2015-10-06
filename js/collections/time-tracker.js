require([
        'underscore',
        'backbone',
        'backbone.localStorage'
    ],
    function(_, Backbone){
        var Collections = {};
        Collections.Logs = Backbone.Collection.extend({

            fieldForSort: 'startTime',
            sortMode: 1, //desc type
            dateRange: '7_days', //format: 'Number string' e.g. '5 years'
            groupType: 'day', // 'day' or 'week'
            appSettings: null,

            localStorage: new Backbone.LocalStorage('logs'),

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
        return Collections;
    }
);
