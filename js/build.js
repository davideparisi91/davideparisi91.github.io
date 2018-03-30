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

  $scope.post = function(){
    $scope.advise = "";
    if($scope.postStatus){
      SocialService.post($scope.postStatus, $scope.postLat, $scope.postLong, function(response){
        if(response.twitter && response.twitter.resp && response.twitter.resp.statusCode == '200')
          $scope.advise = "pubblicato correttamente!"
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
    param = "?q="+encodeURIComponent(q)
    param += (lat && long && radius) ? '&geocode="'+lat+' '+long+' '+radius+'km"' : "";
    param += (dictionary) ? "&dictionary="+encodeURIComponent(dictionary) : "";
    param += "&tweet_mode=extended";
    API.send( "https://emergencyfinder.now.sh/search"+param,
            "GET",
            null,
            null,
            callback);
  }

  var post = function(status, lat, long, callback){
    obj = {
      "status":status
    }
    if(lat)
      obj["lat"] = parseFloat(lat);
    if(long)
      obj["long"] = parseFloat(long);
    API.send( "https://emergencyfinder.now.sh/status",
            "POST",
            null,
            obj,
            callback);
  }

  return {
    loginFacebook,
    search,
    post
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvY29udHJvbGxlcnMuanMiLCJjbGllbnQvanMvaW5kZXguanMiLCJjbGllbnQvanMvc2VydmljZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ2FwcC5zZXJ2aWNlcyddKVxyXG5cclxuLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc2NlLCAkdGltZW91dCwgTWFwU2VydmljZSwgU29jaWFsU2VydmljZSl7XHJcblxyXG5cdG1hcCA9IE1hcFNlcnZpY2U7XHJcbiAgbWFwLmluaXQoKTtcclxuXHJcbiAgJHNjb3BlLmRpY3Rpb25hcnkgPSBcIlZWRlwiO1xyXG4gICRzY29wZS5xID0gXCJJbmNlbmRpb1wiO1xyXG4gICRzY29wZS5sYXQgPSA0Ni4wODtcclxuICAkc2NvcGUubG9uZyA9IDExLjA1O1xyXG4gICRzY29wZS5yYWRpdXMgPSA1MDtcclxuXHJcbiAgJHNjb3BlLnNlYXJjaCA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZigkc2NvcGUucSl7XHJcbiAgICAgIFNvY2lhbFNlcnZpY2Uuc2VhcmNoKCRzY29wZS5xLCAkc2NvcGUubGF0LCAkc2NvcGUubG9uZywgJHNjb3BlLnJhZGl1cywgJHNjb3BlLmRpY3Rpb25hcnksIGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAkc2NvcGUudHdlZXRzID0gcmVzcG9uc2UudHdpdHRlclxyXG4gICAgICAgICRzY29wZS5mYWNlYm9vayA9IHJlc3BvbnNlLmZhY2Vib29rO1xyXG5cclxuICAgICAgICBtYXAuZGVsZXRlQWxsKCk7XHJcbiAgICAgICAgbWFwLmFkZE1hcmtlcnMoICRzY29wZS50d2VldHMsIG51bGwgKTtcclxuICAgICAgICBtYXAuY2VudGVyKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgJHNjb3BlLnBvc3QgPSBmdW5jdGlvbigpe1xyXG4gICAgJHNjb3BlLmFkdmlzZSA9IFwiXCI7XHJcbiAgICBpZigkc2NvcGUucG9zdFN0YXR1cyl7XHJcbiAgICAgIFNvY2lhbFNlcnZpY2UucG9zdCgkc2NvcGUucG9zdFN0YXR1cywgJHNjb3BlLnBvc3RMYXQsICRzY29wZS5wb3N0TG9uZywgZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgIGlmKHJlc3BvbnNlLnR3aXR0ZXIgJiYgcmVzcG9uc2UudHdpdHRlci5yZXNwICYmIHJlc3BvbnNlLnR3aXR0ZXIucmVzcC5zdGF0dXNDb2RlID09ICcyMDAnKVxyXG4gICAgICAgICAgJHNjb3BlLmFkdmlzZSA9IFwicHViYmxpY2F0byBjb3JyZXR0YW1lbnRlIVwiXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufSk7IiwidmFyIHNlciA9IHJlcXVpcmUoJy4vc2VydmljZXMuanMnKTtcclxudmFyIGZvbyA9IHJlcXVpcmUoJy4vY29udHJvbGxlcnMuanMnKTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5zZXJ2aWNlcycsIFtdKVxyXG5cclxuLnNlcnZpY2UoJ0FQSScsIGZ1bmN0aW9uKCAkaHR0cCApe1xyXG4gIHJldHVybiB7XHJcblxyXG4gICAgc2VuZDogZnVuY3Rpb24odXJsLCBtZXRob2QsIGhlYWRlcnMsIG1ldGhvZF9kYXRhLCBjYWxsYmFjayl7XHJcblxyXG4gICAgICB2YXIgZGF0YSAgICA9ICggbWV0aG9kID09IFwiUE9TVFwiICkgPyBcImRhdGFcIiA6IFwicGFyYW1zXCI7XHJcblxyXG4gICAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgICBtZXRob2Q6ICAgbWV0aG9kLFxyXG4gICAgICAgIHVybDogICAgICB1cmwsXHJcbiAgICAgICAgaGVhZGVyczogIGhlYWRlcnNcclxuICAgICAgfVxyXG4gICAgICBvcHRpb25zW2RhdGFdID0gbWV0aG9kX2RhdGE7XHJcblxyXG4gICAgICAkaHR0cChvcHRpb25zKVxyXG4gICAgICAudGhlbihcclxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soIHJlc3BvbnNlICkge1xyXG4gICAgICAgICAgaWYocmVzcG9uc2UuZGF0YSlcclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3BvbnNlLmRhdGEgKTtcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3BvbnNlICk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayggcmVzcG9uc2UgKSB7XHJcbiAgICAgICAgICAvLyBnZXN0aXJlIGVycm9yZSFcclxuICAgICAgICAgIHJlc3BvbnNlLmVycm9yID0gdHJ1ZTtcclxuICAgICAgICAgIGNhbGxiYWNrKCByZXNwb25zZSApO1xyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcbn0pXHJcblxyXG4uc2VydmljZSgnU29jaWFsU2VydmljZScsIGZ1bmN0aW9uKEFQSSl7XHJcblxyXG4gIHRoaXMuZmFjZVRva2VuID0gbnVsbDtcclxuXHJcbiAgdmFyIGxvZ2luRmFjZWJvb2sgPSBmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS5sb2coXCJmYWNlYm9vayBsb2dpblwiKTtcclxuICAgIHRoaXMuZmFjZVRva2VuID0gMjtcclxuICB9XHJcblxyXG4gIHZhciBnZXRUb2tlbiA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5mYWNlVG9rZW47XHJcbiAgfVxyXG5cclxuICB2YXIgc2VhcmNoID0gZnVuY3Rpb24ocSwgbGF0LCBsb25nLCByYWRpdXMsIGRpY3Rpb25hcnksIGNhbGxiYWNrKXtcclxuICAgIHBhcmFtID0gXCI/cT1cIitlbmNvZGVVUklDb21wb25lbnQocSlcclxuICAgIHBhcmFtICs9IChsYXQgJiYgbG9uZyAmJiByYWRpdXMpID8gJyZnZW9jb2RlPVwiJytsYXQrJyAnK2xvbmcrJyAnK3JhZGl1cysna21cIicgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gKGRpY3Rpb25hcnkpID8gXCImZGljdGlvbmFyeT1cIitlbmNvZGVVUklDb21wb25lbnQoZGljdGlvbmFyeSkgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gXCImdHdlZXRfbW9kZT1leHRlbmRlZFwiO1xyXG4gICAgQVBJLnNlbmQoIFwiaHR0cHM6Ly9lbWVyZ2VuY3lmaW5kZXIubm93LnNoL3NlYXJjaFwiK3BhcmFtLFxyXG4gICAgICAgICAgICBcIkdFVFwiLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICB2YXIgcG9zdCA9IGZ1bmN0aW9uKHN0YXR1cywgbGF0LCBsb25nLCBjYWxsYmFjayl7XHJcbiAgICBvYmogPSB7XHJcbiAgICAgIFwic3RhdHVzXCI6c3RhdHVzXHJcbiAgICB9XHJcbiAgICBpZihsYXQpXHJcbiAgICAgIG9ialtcImxhdFwiXSA9IHBhcnNlRmxvYXQobGF0KTtcclxuICAgIGlmKGxvbmcpXHJcbiAgICAgIG9ialtcImxvbmdcIl0gPSBwYXJzZUZsb2F0KGxvbmcpO1xyXG4gICAgQVBJLnNlbmQoIFwiaHR0cHM6Ly9lbWVyZ2VuY3lmaW5kZXIubm93LnNoL3N0YXR1c1wiLFxyXG4gICAgICAgICAgICBcIlBPU1RcIixcclxuICAgICAgICAgICAgbnVsbCxcclxuICAgICAgICAgICAgb2JqLFxyXG4gICAgICAgICAgICBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbG9naW5GYWNlYm9vayxcclxuICAgIHNlYXJjaCxcclxuICAgIHBvc3RcclxuICB9XHJcbn0pXHJcblxyXG4uc2VydmljZSgnTWFwU2VydmljZScsIGZ1bmN0aW9uKCl7XHJcblxyXG5cdHRoaXMubWFwID0gbnVsbDtcclxuXHR0aGlzLmJvdW5kcyA9IG51bGw7XHJcblx0dGhpcy5pbmZvd2luZG93ID0gbnVsbDtcclxuXHR0aGlzLmNsaWNrd2luZG93ID0gbnVsbDtcclxuICB0aGlzLm1hcmtlcnMgPSBudWxsO1xyXG5cclxuXHR2YXIgaW5pdCA9IGZ1bmN0aW9uKCl7XHJcblx0XHR2YXIgbWFwT3B0aW9ucyA9IHtcclxuICAgICAgLy8gSG93IHpvb21lZCBpbiB5b3Ugd2FudCB0aGUgbWFwIHRvIHN0YXJ0IGF0IChhbHdheXMgcmVxdWlyZWQpXHJcbiAgICAgIHpvb206IDEwLFxyXG5cclxuICAgICAgLy8gVGhlIGxhdGl0dWRlIGFuZCBsb25naXR1ZGUgdG8gY2VudGVyIHRoZSBtYXAgKGFsd2F5cyByZXF1aXJlZClcclxuICAgICAgY2VudGVyOiBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKDQ1Ljg5NDYyOTUsIDExLjA0MzkxNCksIC8vIGluaXRpYWwgcG9zaXRpb25cclxuICAgIH1cclxuXHJcbiAgICB2YXIgbWFwRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXAnKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIEdvb2dsZSBNYXAgdXNpbmcgb3VyIGVsZW1lbnQgYW5kIG9wdGlvbnMgZGVmaW5lZCBhYm92ZVxyXG4gICAgdGhpcy5tYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKG1hcEVsZW1lbnQsIG1hcE9wdGlvbnMpO1xyXG4gICAgdGhpcy5ib3VuZHMgPSBuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nQm91bmRzKCk7XHJcblx0XHR0aGlzLmluZm93aW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdygpO1xyXG5cdFx0dGhpcy5jbGlja3dpbmRvdyA9IG5ldyBnb29nbGUubWFwcy5JbmZvV2luZG93KCk7XHJcblxyXG4gICAgdGhpcy5tYXJrZXJzID0gW11cclxuXHR9XHJcblxyXG4gIHZhciBnZXRMb2NhdGlvbiA9IGZ1bmN0aW9uKCB0d2VldCApe1xyXG4gICAgdmFyIGxvY2F0aW9uID0gdHdlZXQubG9jYXRpb25cclxuICAgIHZhciB1c2VyID0gdHdlZXQudXNlcjtcclxuICAgIGlmKGxvY2F0aW9uKXtcclxuICAgICAgaWYobG9jYXRpb24uZ2VvICYmIGxvY2F0aW9uLmdlby5jb29yZGluYXRlcyl7XHJcbiAgICAgICAgcmV0dXJuIGxvY2F0aW9uLmdlby5jb29yZGluYXRlcztcclxuICAgICAgfVxyXG4gICAgICBpZihsb2NhdGlvbi5jb29yZGluYXRlcyAmJiBsb2NhdGlvbi5jb29yZGluYXRlcy5jb29yZGluYXRlcyl7XHJcbiAgICAgICAgcmV0dXJuIGxvY2F0aW9uLmNvb3JkaW5hdGVzLmNvb3JkaW5hdGVzO1xyXG4gICAgICB9XHJcbiAgICAgIGlmKGxvY2F0aW9uLnBsYWNlICYmIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveCAmJiBsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3guY29vcmRpbmF0ZXMgJiYgbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94LmNvb3JkaW5hdGVzWzBdKXtcclxuICAgICAgICByZXR1cm4gW2xvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlc1swXVswXVsxXSwgbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94LmNvb3JkaW5hdGVzWzBdWzBdWzBdXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZWxzZSBpZih1c2VyLmxvY2F0aW9uKXtcclxuXHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuXHR2YXIgYWRkTWFya2VycyA9IGZ1bmN0aW9uKCBwbGFjZXMsIGNhbGxiYWNrTGlzdGVuZXIgKXtcclxuXHJcblx0XHRzZWxmID0gdGhpcztcclxuXHRcdGFuZ3VsYXIuZm9yRWFjaChwbGFjZXMsIGZ1bmN0aW9uKCB0d2VldCApe1xyXG4gICAgICBwbGFjZSA9IHNlbGYuZ2V0TG9jYXRpb24odHdlZXQpXHJcbiAgICAgIGlmKHBsYWNlKXtcclxuICBcdFx0XHR2YXIgbWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiB7bGF0OiBwYXJzZUZsb2F0KHBsYWNlWzBdKSwgbG5nOiBwYXJzZUZsb2F0KHBsYWNlWzFdKX0sXHJcbiAgICAgICAgICAgIG1hcDogc2VsZi5tYXBcclxuICAgICAgICB9KTtcclxuICAgICAgICBzZWxmLm1hcmtlcnMucHVzaChtYXJrZXIpO1xyXG5cclxuICAgICAgICB2YXIgY29udGVudFN0cmluZyA9ICc8ZGl2IGNsYXNzPVwicGFkZDUgd2JcIj4nK1xyXG4gICAgICAgIFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwib3A2IGZvbnQ4MFwiPicrXHJcbiAgICAgICAgXHRcdFx0XHRcdFx0XHR0d2VldC51c2VyLm5hbWUrXHJcbiAgICAgICAgXHRcdFx0XHRcdFx0JzwvZGl2PicrXHJcbiAgICAgICAgXHRcdFx0XHRcdCc8L2Rpdj4nO1xyXG5cclxuICAgICAgICBzZWxmLmJvdW5kcy5leHRlbmQobWFya2VyLnBvc2l0aW9uKTtcclxuXHJcbiAgICAgICAgdmFyIGNsb3NlUG9wVXAgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgIFx0aWYgKHNlbGYuaW5mb3dpbmRvdylcclxuICBcdCAgICAgICAgc2VsZi5pbmZvd2luZG93LmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgb3BlblBvcFVwID0gZnVuY3Rpb24odGhpc3dpbmRvdyl7XHJcbiAgICAgICAgICB0aGlzd2luZG93LnNldENvbnRlbnQoY29udGVudFN0cmluZyk7XHJcbiAgICAgICAgXHQvLyBhcHJvIGlsIHBvcHVwXHJcbiAgICAgICAgXHR0aGlzd2luZG93Lm9wZW4oc2VsZi5tYXAsIG1hcmtlcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtYXJrZXIuYWRkTGlzdGVuZXIoJ21vdXNlb3ZlcicsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIFx0Y2xvc2VQb3BVcCgpO1xyXG4gICAgICAgIFx0b3BlblBvcFVwKHNlbGYuaW5mb3dpbmRvdyk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1hcmtlci5hZGRMaXN0ZW5lcignbW91c2VvdXQnLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdGNsb3NlUG9wVXAoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbWFya2VyLmFkZExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICBvcGVuUG9wVXAoc2VsZi5jbGlja3dpbmRvdyk7XHJcbiAgICAgIFx0ICAgIC8vIGNoaWFtbyBsYSBmdW56aW9uZSBpbiBjb250cm9sbGVyXHJcbiAgICAgIFx0ICAgIGNhbGxiYWNrTGlzdGVuZXIoIHBsYWNlICk7XHJcbiAgICBcdFx0fSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcblx0fVxyXG5cclxuXHR2YXIgY2VudGVyVG8gPSBmdW5jdGlvbiggcG9zICl7XHJcblx0XHR0aGlzLm1hcC5wYW5UbyggcG9zICk7XHJcblx0XHR0aGlzLm1hcC5zZXRab29tKDE1KTtcclxuXHR9XHJcblxyXG5cdHZhciBjZW50ZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgaWYodGhpcy5ib3VuZHMubGVuZ3RoKXtcclxuICBcdFx0dGhpcy5tYXAuZml0Qm91bmRzKHRoaXMuYm91bmRzKTtcclxuICAgICAgdGhpcy5tYXAuc2V0Wm9vbSgxMCk7XHJcbiAgICB9XHJcblx0fVxyXG5cclxuXHR2YXIgcmVzZXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0dGhpcy5jZW50ZXIoKTtcclxuICAgIHRoaXMuaW5mb3dpbmRvdy5jbG9zZSgpO1xyXG4gICAgdGhpcy5jbGlja3dpbmRvdy5jbG9zZSgpO1xyXG5cdH1cclxuXHJcbiAgdmFyIGRlbGV0ZUFsbCA9IGZ1bmN0aW9uKCl7XHJcbiAgICAvLyB0aGlzLmNlbnRlcigpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLm1hcmtlcnMubGVuZ3RoOyBpKysgKSB7XHJcbiAgICAgIHRoaXMubWFya2Vyc1tpXS5zZXRNYXAobnVsbCk7XHJcbiAgICB9XHJcbiAgICB0aGlzLm1hcmtlcnMgPSBbXTtcclxuICAgIHRoaXMuYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xyXG4gICAgdGhpcy5pbmZvd2luZG93LmNsb3NlKCk7XHJcbiAgICB0aGlzLmNsaWNrd2luZG93LmNsb3NlKCk7XHJcbiAgfVxyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0YWRkTWFya2VyczogYWRkTWFya2VycyxcclxuXHRcdGluaXQ6IGluaXQsXHJcblx0XHRjZW50ZXI6IGNlbnRlcixcclxuXHRcdGNlbnRlclRvOiBjZW50ZXJUbyxcclxuXHRcdHJlc2V0OiByZXNldCxcclxuICAgIGRlbGV0ZUFsbDogZGVsZXRlQWxsLFxyXG4gICAgZ2V0TG9jYXRpb246IGdldExvY2F0aW9uXHJcblx0fVxyXG5cclxufSlcclxuIl19
