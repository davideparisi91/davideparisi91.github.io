(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app', ['app.services'])

.controller('UserController', function($scope, $sce, $timeout, MapService, SocialService){

	map = MapService;
  map.init();

  $scope.dictionary = "VVF";
  $scope.q = "Incendio";
  $scope.lat = 46.08;
  $scope.long = 11.05;
  $scope.radius = 50;

  $scope.search = function(){
    if($scope.q){
      SocialService.search($scope.q, $scope.lat, $scope.long, $scope.radius, $scope.dictionary, function(response){
        $scope.tweets = response.twitter
        $scope.facebook = response.facebook;

        map.deleteAll();
        map.addMarkers( $scope.tweets, null );
        map.center();
      });
    }
  }
});
},{}],2:[function(require,module,exports){
var ser = require('./services.js');
var foo = require('./controllers.js');

},{"./controllers.js":1,"./services.js":3}],3:[function(require,module,exports){
angular.module('app.services', [])

.service('API', function( $http ){
  return {

    send: function(url, method, headers, method_data, callback){

      var data    = ( method == "POST" ) ? "data" : "params";

      var options = {
        method:   method,
        url:      url,
        headers:  headers
      }
      options[data] = method_data;

      $http(options)
      .then(
        function successCallback( response ) {
          if(response.data)
            callback( response.data );
          else
            callback( response );
        }, function errorCallback( response ) {
          // gestire errore!
          response.error = true;
          callback( response );
        }
      );
    }
  }
})

.service('SocialService', function(API){

  this.faceToken = null;

  var loginFacebook = function(){
    console.log("facebook login");
    this.faceToken = 2;
  }

  var getToken = function(){
    return this.faceToken;
  }

  var search = function(q, lat, long, radius, dictionary, callback){
    param = "?q="+q
    param += (lat && long && radius) ? '&geocode="'+lat+' '+long+' '+radius+'km"' : "";
    param += (dictionary) ? "&dictionary="+encodeURIComponent(dictionary) : "";
    param += "&tweet_mode=extended";
    API.send( "https://emergencyfinder.now.sh/search"+param,
            "GET",
            null,
            null,
            callback);
  }

  return {
    loginFacebook,
    search
  }
})

.service('MapService', function(){

	this.map = null;
	this.bounds = null;
	this.infowindow = null;
	this.clickwindow = null;
  this.markers = null;

	var init = function(){
		var mapOptions = {
      // How zoomed in you want the map to start at (always required)
      zoom: 10,

      // The latitude and longitude to center the map (always required)
      center: new google.maps.LatLng(45.8946295, 11.043914), // initial position
    }

    var mapElement = document.getElementById('map');

    // Create the Google Map using our element and options defined above
    this.map = new google.maps.Map(mapElement, mapOptions);
    this.bounds = new google.maps.LatLngBounds();
		this.infowindow = new google.maps.InfoWindow();
		this.clickwindow = new google.maps.InfoWindow();

    this.markers = []
	}

  var getLocation = function( tweet ){
    var location = tweet.location
    var user = tweet.user;
    if(location){
      if(location.geo && location.geo.coordinates){
        return location.geo.coordinates;
      }
      if(location.coordinates && location.coordinates.coordinates){
        return location.coordinates.coordinates;
      }
      if(location.place && location.place.bounding_box && location.place.bounding_box.coordinates && location.place.bounding_box.coordinates[0]){
        return [location.place.bounding_box.coordinates[0][0][1], location.place.bounding_box.coordinates[0][0][0]];
      }
    }
    else if(user.location){

    }
    return false;
  }

	var addMarkers = function( places, callbackListener ){

		self = this;
		angular.forEach(places, function( tweet ){
      place = self.getLocation(tweet)
      if(place){
  			var marker = new google.maps.Marker({
            position: {lat: parseFloat(place[0]), lng: parseFloat(place[1])},
            map: self.map
        });
        self.markers.push(marker);

        var contentString = '<div class="padd5 wb">'+
        						'<div class="op6 font80">'+
        							tweet.user.name+
        						'</div>'+
        					'</div>';

        self.bounds.extend(marker.position);

        var closePopUp = function(){
        	if (self.infowindow)
  	        self.infowindow.close();
        }

        var openPopUp = function(thiswindow){
          thiswindow.setContent(contentString);
        	// apro il popup
        	thiswindow.open(self.map, marker);
        }

        marker.addListener('mouseover', function() {
        	closePopUp();
        	openPopUp(self.infowindow);
        });

        marker.addListener('mouseout', function() {
        	closePopUp();
        });

        marker.addListener('click', function() {
            openPopUp(self.clickwindow);
      	    // chiamo la funzione in controller
      	    callbackListener( place );
    		});
      }
    })
	}

	var centerTo = function( pos ){
		this.map.panTo( pos );
		this.map.setZoom(15);
	}

	var center = function(){
    if(this.bounds.length){
  		this.map.fitBounds(this.bounds);
      this.map.setZoom(10);
    }
	}

	var reset = function(){
		this.center();
    this.infowindow.close();
    this.clickwindow.close();
	}

  var deleteAll = function(){
    // this.center();
    for (var i = 0; i < this.markers.length; i++ ) {
      this.markers[i].setMap(null);
    }
    this.markers = [];
    this.bounds = new google.maps.LatLngBounds();
    this.infowindow.close();
    this.clickwindow.close();
  }

	return {
		addMarkers: addMarkers,
		init: init,
		center: center,
		centerTo: centerTo,
		reset: reset,
    deleteAll: deleteAll,
    getLocation: getLocation
	}

})

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvY29udHJvbGxlcnMuanMiLCJjbGllbnQvanMvaW5kZXguanMiLCJjbGllbnQvanMvc2VydmljZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiYW5ndWxhci5tb2R1bGUoJ2FwcCcsIFsnYXBwLnNlcnZpY2VzJ10pXHJcblxyXG4uY29udHJvbGxlcignVXNlckNvbnRyb2xsZXInLCBmdW5jdGlvbigkc2NvcGUsICRzY2UsICR0aW1lb3V0LCBNYXBTZXJ2aWNlLCBTb2NpYWxTZXJ2aWNlKXtcclxuXHJcblx0bWFwID0gTWFwU2VydmljZTtcclxuICBtYXAuaW5pdCgpO1xyXG5cclxuICAkc2NvcGUuZGljdGlvbmFyeSA9IFwiVlZGXCI7XHJcbiAgJHNjb3BlLnEgPSBcIkluY2VuZGlvXCI7XHJcbiAgJHNjb3BlLmxhdCA9IDQ2LjA4O1xyXG4gICRzY29wZS5sb25nID0gMTEuMDU7XHJcbiAgJHNjb3BlLnJhZGl1cyA9IDUwO1xyXG5cclxuICAkc2NvcGUuc2VhcmNoID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKCRzY29wZS5xKXtcclxuICAgICAgU29jaWFsU2VydmljZS5zZWFyY2goJHNjb3BlLnEsICRzY29wZS5sYXQsICRzY29wZS5sb25nLCAkc2NvcGUucmFkaXVzLCAkc2NvcGUuZGljdGlvbmFyeSwgZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgICRzY29wZS50d2VldHMgPSByZXNwb25zZS50d2l0dGVyXHJcbiAgICAgICAgJHNjb3BlLmZhY2Vib29rID0gcmVzcG9uc2UuZmFjZWJvb2s7XHJcblxyXG4gICAgICAgIG1hcC5kZWxldGVBbGwoKTtcclxuICAgICAgICBtYXAuYWRkTWFya2VycyggJHNjb3BlLnR3ZWV0cywgbnVsbCApO1xyXG4gICAgICAgIG1hcC5jZW50ZXIoKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59KTsiLCJ2YXIgc2VyID0gcmVxdWlyZSgnLi9zZXJ2aWNlcy5qcycpO1xyXG52YXIgZm9vID0gcmVxdWlyZSgnLi9jb250cm9sbGVycy5qcycpO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLnNlcnZpY2VzJywgW10pXHJcblxyXG4uc2VydmljZSgnQVBJJywgZnVuY3Rpb24oICRodHRwICl7XHJcbiAgcmV0dXJuIHtcclxuXHJcbiAgICBzZW5kOiBmdW5jdGlvbih1cmwsIG1ldGhvZCwgaGVhZGVycywgbWV0aG9kX2RhdGEsIGNhbGxiYWNrKXtcclxuXHJcbiAgICAgIHZhciBkYXRhICAgID0gKCBtZXRob2QgPT0gXCJQT1NUXCIgKSA/IFwiZGF0YVwiIDogXCJwYXJhbXNcIjtcclxuXHJcbiAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgIG1ldGhvZDogICBtZXRob2QsXHJcbiAgICAgICAgdXJsOiAgICAgIHVybCxcclxuICAgICAgICBoZWFkZXJzOiAgaGVhZGVyc1xyXG4gICAgICB9XHJcbiAgICAgIG9wdGlvbnNbZGF0YV0gPSBtZXRob2RfZGF0YTtcclxuXHJcbiAgICAgICRodHRwKG9wdGlvbnMpXHJcbiAgICAgIC50aGVuKFxyXG4gICAgICAgIGZ1bmN0aW9uIHN1Y2Nlc3NDYWxsYmFjayggcmVzcG9uc2UgKSB7XHJcbiAgICAgICAgICBpZihyZXNwb25zZS5kYXRhKVxyXG4gICAgICAgICAgICBjYWxsYmFjayggcmVzcG9uc2UuZGF0YSApO1xyXG4gICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBjYWxsYmFjayggcmVzcG9uc2UgKTtcclxuICAgICAgICB9LCBmdW5jdGlvbiBlcnJvckNhbGxiYWNrKCByZXNwb25zZSApIHtcclxuICAgICAgICAgIC8vIGdlc3RpcmUgZXJyb3JlIVxyXG4gICAgICAgICAgcmVzcG9uc2UuZXJyb3IgPSB0cnVlO1xyXG4gICAgICAgICAgY2FsbGJhY2soIHJlc3BvbnNlICk7XHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufSlcclxuXHJcbi5zZXJ2aWNlKCdTb2NpYWxTZXJ2aWNlJywgZnVuY3Rpb24oQVBJKXtcclxuXHJcbiAgdGhpcy5mYWNlVG9rZW4gPSBudWxsO1xyXG5cclxuICB2YXIgbG9naW5GYWNlYm9vayA9IGZ1bmN0aW9uKCl7XHJcbiAgICBjb25zb2xlLmxvZyhcImZhY2Vib29rIGxvZ2luXCIpO1xyXG4gICAgdGhpcy5mYWNlVG9rZW4gPSAyO1xyXG4gIH1cclxuXHJcbiAgdmFyIGdldFRva2VuID0gZnVuY3Rpb24oKXtcclxuICAgIHJldHVybiB0aGlzLmZhY2VUb2tlbjtcclxuICB9XHJcblxyXG4gIHZhciBzZWFyY2ggPSBmdW5jdGlvbihxLCBsYXQsIGxvbmcsIHJhZGl1cywgZGljdGlvbmFyeSwgY2FsbGJhY2spe1xyXG4gICAgcGFyYW0gPSBcIj9xPVwiK3FcclxuICAgIHBhcmFtICs9IChsYXQgJiYgbG9uZyAmJiByYWRpdXMpID8gJyZnZW9jb2RlPVwiJytsYXQrJyAnK2xvbmcrJyAnK3JhZGl1cysna21cIicgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gKGRpY3Rpb25hcnkpID8gXCImZGljdGlvbmFyeT1cIitlbmNvZGVVUklDb21wb25lbnQoZGljdGlvbmFyeSkgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gXCImdHdlZXRfbW9kZT1leHRlbmRlZFwiO1xyXG4gICAgQVBJLnNlbmQoIFwiaHR0cHM6Ly9lbWVyZ2VuY3lmaW5kZXIubm93LnNoL3NlYXJjaFwiK3BhcmFtLFxyXG4gICAgICAgICAgICBcIkdFVFwiLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbG9naW5GYWNlYm9vayxcclxuICAgIHNlYXJjaFxyXG4gIH1cclxufSlcclxuXHJcbi5zZXJ2aWNlKCdNYXBTZXJ2aWNlJywgZnVuY3Rpb24oKXtcclxuXHJcblx0dGhpcy5tYXAgPSBudWxsO1xyXG5cdHRoaXMuYm91bmRzID0gbnVsbDtcclxuXHR0aGlzLmluZm93aW5kb3cgPSBudWxsO1xyXG5cdHRoaXMuY2xpY2t3aW5kb3cgPSBudWxsO1xyXG4gIHRoaXMubWFya2VycyA9IG51bGw7XHJcblxyXG5cdHZhciBpbml0ID0gZnVuY3Rpb24oKXtcclxuXHRcdHZhciBtYXBPcHRpb25zID0ge1xyXG4gICAgICAvLyBIb3cgem9vbWVkIGluIHlvdSB3YW50IHRoZSBtYXAgdG8gc3RhcnQgYXQgKGFsd2F5cyByZXF1aXJlZClcclxuICAgICAgem9vbTogMTAsXHJcblxyXG4gICAgICAvLyBUaGUgbGF0aXR1ZGUgYW5kIGxvbmdpdHVkZSB0byBjZW50ZXIgdGhlIG1hcCAoYWx3YXlzIHJlcXVpcmVkKVxyXG4gICAgICBjZW50ZXI6IG5ldyBnb29nbGUubWFwcy5MYXRMbmcoNDUuODk0NjI5NSwgMTEuMDQzOTE0KSwgLy8gaW5pdGlhbCBwb3NpdGlvblxyXG4gICAgfVxyXG5cclxuICAgIHZhciBtYXBFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcCcpO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgR29vZ2xlIE1hcCB1c2luZyBvdXIgZWxlbWVudCBhbmQgb3B0aW9ucyBkZWZpbmVkIGFib3ZlXHJcbiAgICB0aGlzLm1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAobWFwRWxlbWVudCwgbWFwT3B0aW9ucyk7XHJcbiAgICB0aGlzLmJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcclxuXHRcdHRoaXMuaW5mb3dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KCk7XHJcblx0XHR0aGlzLmNsaWNrd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTtcclxuXHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXVxyXG5cdH1cclxuXHJcbiAgdmFyIGdldExvY2F0aW9uID0gZnVuY3Rpb24oIHR3ZWV0ICl7XHJcbiAgICB2YXIgbG9jYXRpb24gPSB0d2VldC5sb2NhdGlvblxyXG4gICAgdmFyIHVzZXIgPSB0d2VldC51c2VyO1xyXG4gICAgaWYobG9jYXRpb24pe1xyXG4gICAgICBpZihsb2NhdGlvbi5nZW8gJiYgbG9jYXRpb24uZ2VvLmNvb3JkaW5hdGVzKXtcclxuICAgICAgICByZXR1cm4gbG9jYXRpb24uZ2VvLmNvb3JkaW5hdGVzO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKGxvY2F0aW9uLmNvb3JkaW5hdGVzICYmIGxvY2F0aW9uLmNvb3JkaW5hdGVzLmNvb3JkaW5hdGVzKXtcclxuICAgICAgICByZXR1cm4gbG9jYXRpb24uY29vcmRpbmF0ZXMuY29vcmRpbmF0ZXM7XHJcbiAgICAgIH1cclxuICAgICAgaWYobG9jYXRpb24ucGxhY2UgJiYgbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94ICYmIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlcyAmJiBsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3guY29vcmRpbmF0ZXNbMF0pe1xyXG4gICAgICAgIHJldHVybiBbbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94LmNvb3JkaW5hdGVzWzBdWzBdWzFdLCBsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3guY29vcmRpbmF0ZXNbMF1bMF1bMF1dO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBlbHNlIGlmKHVzZXIubG9jYXRpb24pe1xyXG5cclxuICAgIH1cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG5cdHZhciBhZGRNYXJrZXJzID0gZnVuY3Rpb24oIHBsYWNlcywgY2FsbGJhY2tMaXN0ZW5lciApe1xyXG5cclxuXHRcdHNlbGYgPSB0aGlzO1xyXG5cdFx0YW5ndWxhci5mb3JFYWNoKHBsYWNlcywgZnVuY3Rpb24oIHR3ZWV0ICl7XHJcbiAgICAgIHBsYWNlID0gc2VsZi5nZXRMb2NhdGlvbih0d2VldClcclxuICAgICAgaWYocGxhY2Upe1xyXG4gIFx0XHRcdHZhciBtYXJrZXIgPSBuZXcgZ29vZ2xlLm1hcHMuTWFya2VyKHtcclxuICAgICAgICAgICAgcG9zaXRpb246IHtsYXQ6IHBhcnNlRmxvYXQocGxhY2VbMF0pLCBsbmc6IHBhcnNlRmxvYXQocGxhY2VbMV0pfSxcclxuICAgICAgICAgICAgbWFwOiBzZWxmLm1hcFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNlbGYubWFya2Vycy5wdXNoKG1hcmtlcik7XHJcblxyXG4gICAgICAgIHZhciBjb250ZW50U3RyaW5nID0gJzxkaXYgY2xhc3M9XCJwYWRkNSB3YlwiPicrXHJcbiAgICAgICAgXHRcdFx0XHRcdFx0JzxkaXYgY2xhc3M9XCJvcDYgZm9udDgwXCI+JytcclxuICAgICAgICBcdFx0XHRcdFx0XHRcdHR3ZWV0LnVzZXIubmFtZStcclxuICAgICAgICBcdFx0XHRcdFx0XHQnPC9kaXY+JytcclxuICAgICAgICBcdFx0XHRcdFx0JzwvZGl2Pic7XHJcblxyXG4gICAgICAgIHNlbGYuYm91bmRzLmV4dGVuZChtYXJrZXIucG9zaXRpb24pO1xyXG5cclxuICAgICAgICB2YXIgY2xvc2VQb3BVcCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgXHRpZiAoc2VsZi5pbmZvd2luZG93KVxyXG4gIFx0ICAgICAgICBzZWxmLmluZm93aW5kb3cuY2xvc2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBvcGVuUG9wVXAgPSBmdW5jdGlvbih0aGlzd2luZG93KXtcclxuICAgICAgICAgIHRoaXN3aW5kb3cuc2V0Q29udGVudChjb250ZW50U3RyaW5nKTtcclxuICAgICAgICBcdC8vIGFwcm8gaWwgcG9wdXBcclxuICAgICAgICBcdHRoaXN3aW5kb3cub3BlbihzZWxmLm1hcCwgbWFya2VyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1hcmtlci5hZGRMaXN0ZW5lcignbW91c2VvdmVyJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHRjbG9zZVBvcFVwKCk7XHJcbiAgICAgICAgXHRvcGVuUG9wVXAoc2VsZi5pbmZvd2luZG93KTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbWFya2VyLmFkZExpc3RlbmVyKCdtb3VzZW91dCcsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Y2xvc2VQb3BVcCgpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtYXJrZXIuYWRkTGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIG9wZW5Qb3BVcChzZWxmLmNsaWNrd2luZG93KTtcclxuICAgICAgXHQgICAgLy8gY2hpYW1vIGxhIGZ1bnppb25lIGluIGNvbnRyb2xsZXJcclxuICAgICAgXHQgICAgY2FsbGJhY2tMaXN0ZW5lciggcGxhY2UgKTtcclxuICAgIFx0XHR9KTtcclxuICAgICAgfVxyXG4gICAgfSlcclxuXHR9XHJcblxyXG5cdHZhciBjZW50ZXJUbyA9IGZ1bmN0aW9uKCBwb3MgKXtcclxuXHRcdHRoaXMubWFwLnBhblRvKCBwb3MgKTtcclxuXHRcdHRoaXMubWFwLnNldFpvb20oMTUpO1xyXG5cdH1cclxuXHJcblx0dmFyIGNlbnRlciA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZih0aGlzLmJvdW5kcy5sZW5ndGgpe1xyXG4gIFx0XHR0aGlzLm1hcC5maXRCb3VuZHModGhpcy5ib3VuZHMpO1xyXG4gICAgICB0aGlzLm1hcC5zZXRab29tKDEwKTtcclxuICAgIH1cclxuXHR9XHJcblxyXG5cdHZhciByZXNldCA9IGZ1bmN0aW9uKCl7XHJcblx0XHR0aGlzLmNlbnRlcigpO1xyXG4gICAgdGhpcy5pbmZvd2luZG93LmNsb3NlKCk7XHJcbiAgICB0aGlzLmNsaWNrd2luZG93LmNsb3NlKCk7XHJcblx0fVxyXG5cclxuICB2YXIgZGVsZXRlQWxsID0gZnVuY3Rpb24oKXtcclxuICAgIC8vIHRoaXMuY2VudGVyKCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubWFya2Vycy5sZW5ndGg7IGkrKyApIHtcclxuICAgICAgdGhpcy5tYXJrZXJzW2ldLnNldE1hcChudWxsKTtcclxuICAgIH1cclxuICAgIHRoaXMubWFya2VycyA9IFtdO1xyXG4gICAgdGhpcy5ib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XHJcbiAgICB0aGlzLmluZm93aW5kb3cuY2xvc2UoKTtcclxuICAgIHRoaXMuY2xpY2t3aW5kb3cuY2xvc2UoKTtcclxuICB9XHJcblxyXG5cdHJldHVybiB7XHJcblx0XHRhZGRNYXJrZXJzOiBhZGRNYXJrZXJzLFxyXG5cdFx0aW5pdDogaW5pdCxcclxuXHRcdGNlbnRlcjogY2VudGVyLFxyXG5cdFx0Y2VudGVyVG86IGNlbnRlclRvLFxyXG5cdFx0cmVzZXQ6IHJlc2V0LFxyXG4gICAgZGVsZXRlQWxsOiBkZWxldGVBbGwsXHJcbiAgICBnZXRMb2NhdGlvbjogZ2V0TG9jYXRpb25cclxuXHR9XHJcblxyXG59KVxyXG4iXX0=
