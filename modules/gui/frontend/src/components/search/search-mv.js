/**
 * @author Mino Togna
 */
// var moment   = require( 'moment' )
var EventBus           = require('../event/event-bus')
var Events             = require('../event/events')
var Loader             = require('../loader/loader')
var View               = require('./search-v')
var Model              = require('./model/search-model')
var SearchRequestUtils = require('./search-request-utils')
var moment             = require('moment')

require('../scene-areas/scene-areas-mv')
require('../scenes-selection/scenes-selection-mv')
require('../search-retrieve/search-retrieve-mv')
require('../scene-area-mosaics/scene-area-mosaics-mv')

var show = function (e, type) {
  if (type == 'search') {
    View.init()
  }
  View.showList()
}

var requestSceneAreas = function (e, state) {
  var data     = {}
  data.dataSet = state.sensorGroup
  SearchRequestUtils.addAoiRequestParameter(state, data)
  
  var params = {
    url         : '/api/data/sceneareas'
    , data      : data
    , beforeSend: function () {
      // EventBus.dispatch( Events.SCENE_AREAS.INIT )
      Loader.show()
    }
    , success   : function (response) {
      state.sceneAreas = {}
      $.each(response, function (i, sceneArea) {
        state.sceneAreas[sceneArea.sceneAreaId] = {polygon: sceneArea.polygon, selection: []}
      })
      state.mosaicPreviewBand = null
      
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, state, {resetSceneAreas: true})
      EventBus.dispatch(Events.SECTION.REDUCE)
      Loader.hide({delay: 300})
    }
  }
  EventBus.dispatch(Events.AJAX.POST, null, params)
  
}

EventBus.addEventListener(Events.SECTION.SHOW, show)
EventBus.addEventListener(Events.SECTION.SEARCH.REQUEST_SCENE_AREAS, requestSceneAreas)

EventBus.addEventListener(Events.SECTION.SEARCH.STATE.LIST_LOAD, function (e) {
  var params = {
    url    : '/api/mosaics/list',
    success: function (response) {
      EventBus.dispatch(Events.SECTION.SEARCH.STATE.LIST_CHANGED, null, response)
    }
  }
  EventBus.dispatch(Events.AJAX.GET, null, params)
})

var guid = function () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)
  }
  
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4()
}

var showList = function () {
  View.showList()
}

// add mosaics
var addMosaic = function () {
  
  var getDefaultState = function () {
    var date         = moment(new Date()).format('YYYY-MM-DD')
    var defaultState = {
      id         : guid(),
      type       : Model.TYPES.MOSAIC,
      name       : 'mosaic-' + date,
      aoiCode    : null,
      aoiName    : null,
      sensorGroup: Model.getSensorGroups()[0],
      targetDate : date,
      
      sortWeight       : 0.5,
      sensors          : Object.keys(Model.getSensors(Model.getSensorGroups()[0])),
      offsetToTargetDay: 0,
      minScenes        : 1,
      maxScenes        : null
    }
    return defaultState
  }
  View.showMosaic()
  EventBus.dispatch(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGE, null, getDefaultState())
}

EventBus.addEventListener(Events.SECTION.SEARCH.VIEW.SHOW_LIST, showList)
EventBus.addEventListener(Events.SECTION.SEARCH.VIEW.SHOW_MOSAIC, addMosaic)