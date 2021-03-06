/**
 * @author Mino Togna
 */
var mapStyle = require('./../map-style/map-style.js')
var EventBus = require('../event/event-bus')
var Events   = require('../event/events')

var GoogleMapsLoader       = require('google-maps')
GoogleMapsLoader.LIBRARIES = ['drawing']

var map = null

var checkApiKey = function (callback) {
  // console.log(GoogleMapsLoader.KEY)
  // if ( GoogleMapsLoader.KEY ) {
  //     callback()
  // } else {
  var params = {
    url      : '/api/data/google-maps-api-key'
    , success: function (response) {
      GoogleMapsLoader.KEY = response.apiKey
      callback()
    }
  }
  EventBus.dispatch(Events.AJAX.REQUEST, null, params)
  // }
}

var load = function (callback) {
  GoogleMapsLoader.load(function (google) {
    if (callback) {
      callback(google)
    }
  })
}

var loadMap = function (domId, callback) {
  checkApiKey(function () {
    load(function (google) {
      map = new google.maps.Map(document.getElementById(domId), {
        zoom             : 3,
        minZoom          : 3,
        maxZoom          : 15,
        center           : new google.maps.LatLng(16.7794913, 9.6771556),
        mapTypeId        : google.maps.MapTypeId.ROADMAP,
        zoomControl      : false,
        mapTypeControl   : false,
        scaleControl     : false,
        streetViewControl: false,
        rotateControl    : false,
        fullscreenControl: false,
        backgroundColor  : '#131314',
        gestureHandling: 'greedy'
      })
      
      map.setOptions({styles: mapStyle.defaultStyle})
      
      if (callback) {
        callback(map, google)
      }
    })
    
  })
}

var getApiKey = function (callback) {
  checkApiKey(callback(GoogleMapsLoader.KEY))
}

var setDefaultStyle = function (e) {
  map.setOptions({styles: mapStyle.defaultStyle})
}

var setDrawingStyle = function (e) {
  map.setOptions({styles: mapStyle.drawingStyle})
}

EventBus.addEventListener(Events.MAP.POLYGON_DRAW, setDrawingStyle)
EventBus.addEventListener(Events.SECTION.SHOW, setDefaultStyle)

module.exports = {
  loadMap    : loadMap
  , load     : load
  , getApiKey: getApiKey
}
