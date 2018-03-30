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
    API.send( "https://localhost:8080/status",
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvY29udHJvbGxlcnMuanMiLCJjbGllbnQvanMvaW5kZXguanMiLCJjbGllbnQvanMvc2VydmljZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ2FwcC5zZXJ2aWNlcyddKVxyXG5cclxuLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc2NlLCAkdGltZW91dCwgTWFwU2VydmljZSwgU29jaWFsU2VydmljZSl7XHJcblxyXG5cdG1hcCA9IE1hcFNlcnZpY2U7XHJcbiAgbWFwLmluaXQoKTtcclxuXHJcbiAgJHNjb3BlLmRpY3Rpb25hcnkgPSBcIlZWRlwiO1xyXG4gICRzY29wZS5xID0gXCJJbmNlbmRpb1wiO1xyXG4gICRzY29wZS5sYXQgPSA0Ni4wODtcclxuICAkc2NvcGUubG9uZyA9IDExLjA1O1xyXG4gICRzY29wZS5yYWRpdXMgPSA1MDtcclxuXHJcbiAgJHNjb3BlLnNlYXJjaCA9IGZ1bmN0aW9uKCl7XHJcbiAgICBpZigkc2NvcGUucSl7XHJcbiAgICAgIFNvY2lhbFNlcnZpY2Uuc2VhcmNoKCRzY29wZS5xLCAkc2NvcGUubGF0LCAkc2NvcGUubG9uZywgJHNjb3BlLnJhZGl1cywgJHNjb3BlLmRpY3Rpb25hcnksIGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICAkc2NvcGUudHdlZXRzID0gcmVzcG9uc2UudHdpdHRlclxyXG4gICAgICAgICRzY29wZS5mYWNlYm9vayA9IHJlc3BvbnNlLmZhY2Vib29rO1xyXG5cclxuICAgICAgICBtYXAuZGVsZXRlQWxsKCk7XHJcbiAgICAgICAgbWFwLmFkZE1hcmtlcnMoICRzY29wZS50d2VldHMsIG51bGwgKTtcclxuICAgICAgICBtYXAuY2VudGVyKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgJHNjb3BlLnBvc3QgPSBmdW5jdGlvbigpe1xyXG4gICAgJHNjb3BlLmFkdmlzZSA9IFwiXCI7XHJcbiAgICBpZigkc2NvcGUucG9zdFN0YXR1cyl7XHJcbiAgICAgIFNvY2lhbFNlcnZpY2UucG9zdCgkc2NvcGUucG9zdFN0YXR1cywgJHNjb3BlLnBvc3RMYXQsICRzY29wZS5wb3N0TG9uZywgZnVuY3Rpb24ocmVzcG9uc2Upe1xyXG4gICAgICAgIGlmKHJlc3BvbnNlLnR3aXR0ZXIgJiYgcmVzcG9uc2UudHdpdHRlci5yZXNwICYmIHJlc3BvbnNlLnR3aXR0ZXIucmVzcC5zdGF0dXNDb2RlID09ICcyMDAnKVxyXG4gICAgICAgICAgJHNjb3BlLmFkdmlzZSA9IFwicHViYmxpY2F0byBjb3JyZXR0YW1lbnRlIVwiXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxufSk7IiwidmFyIHNlciA9IHJlcXVpcmUoJy4vc2VydmljZXMuanMnKTtcclxudmFyIGZvbyA9IHJlcXVpcmUoJy4vY29udHJvbGxlcnMuanMnKTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5zZXJ2aWNlcycsIFtdKVxyXG5cclxuLnNlcnZpY2UoJ0FQSScsIGZ1bmN0aW9uKCAkaHR0cCApe1xyXG4gIHJldHVybiB7XHJcblxyXG4gICAgc2VuZDogZnVuY3Rpb24odXJsLCBtZXRob2QsIGhlYWRlcnMsIG1ldGhvZF9kYXRhLCBjYWxsYmFjayl7XHJcblxyXG4gICAgICB2YXIgZGF0YSAgICA9ICggbWV0aG9kID09IFwiUE9TVFwiICkgPyBcImRhdGFcIiA6IFwicGFyYW1zXCI7XHJcblxyXG4gICAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgICBtZXRob2Q6ICAgbWV0aG9kLFxyXG4gICAgICAgIHVybDogICAgICB1cmwsXHJcbiAgICAgICAgaGVhZGVyczogIGhlYWRlcnNcclxuICAgICAgfVxyXG4gICAgICBvcHRpb25zW2RhdGFdID0gbWV0aG9kX2RhdGE7XHJcblxyXG4gICAgICAkaHR0cChvcHRpb25zKVxyXG4gICAgICAudGhlbihcclxuICAgICAgICBmdW5jdGlvbiBzdWNjZXNzQ2FsbGJhY2soIHJlc3BvbnNlICkge1xyXG4gICAgICAgICAgaWYocmVzcG9uc2UuZGF0YSlcclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3BvbnNlLmRhdGEgKTtcclxuICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgY2FsbGJhY2soIHJlc3BvbnNlICk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gZXJyb3JDYWxsYmFjayggcmVzcG9uc2UgKSB7XHJcbiAgICAgICAgICAvLyBnZXN0aXJlIGVycm9yZSFcclxuICAgICAgICAgIHJlc3BvbnNlLmVycm9yID0gdHJ1ZTtcclxuICAgICAgICAgIGNhbGxiYWNrKCByZXNwb25zZSApO1xyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH1cclxuICB9XHJcbn0pXHJcblxyXG4uc2VydmljZSgnU29jaWFsU2VydmljZScsIGZ1bmN0aW9uKEFQSSl7XHJcblxyXG4gIHRoaXMuZmFjZVRva2VuID0gbnVsbDtcclxuXHJcbiAgdmFyIGxvZ2luRmFjZWJvb2sgPSBmdW5jdGlvbigpe1xyXG4gICAgY29uc29sZS5sb2coXCJmYWNlYm9vayBsb2dpblwiKTtcclxuICAgIHRoaXMuZmFjZVRva2VuID0gMjtcclxuICB9XHJcblxyXG4gIHZhciBnZXRUb2tlbiA9IGZ1bmN0aW9uKCl7XHJcbiAgICByZXR1cm4gdGhpcy5mYWNlVG9rZW47XHJcbiAgfVxyXG5cclxuICB2YXIgc2VhcmNoID0gZnVuY3Rpb24ocSwgbGF0LCBsb25nLCByYWRpdXMsIGRpY3Rpb25hcnksIGNhbGxiYWNrKXtcclxuICAgIHBhcmFtID0gXCI/cT1cIitlbmNvZGVVUklDb21wb25lbnQocSlcclxuICAgIHBhcmFtICs9IChsYXQgJiYgbG9uZyAmJiByYWRpdXMpID8gJyZnZW9jb2RlPVwiJytsYXQrJyAnK2xvbmcrJyAnK3JhZGl1cysna21cIicgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gKGRpY3Rpb25hcnkpID8gXCImZGljdGlvbmFyeT1cIitlbmNvZGVVUklDb21wb25lbnQoZGljdGlvbmFyeSkgOiBcIlwiO1xyXG4gICAgcGFyYW0gKz0gXCImdHdlZXRfbW9kZT1leHRlbmRlZFwiO1xyXG4gICAgQVBJLnNlbmQoIFwiaHR0cHM6Ly9lbWVyZ2VuY3lmaW5kZXIubm93LnNoL3NlYXJjaFwiK3BhcmFtLFxyXG4gICAgICAgICAgICBcIkdFVFwiLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBudWxsLFxyXG4gICAgICAgICAgICBjYWxsYmFjayk7XHJcbiAgfVxyXG5cclxuICB2YXIgcG9zdCA9IGZ1bmN0aW9uKHN0YXR1cywgbGF0LCBsb25nLCBjYWxsYmFjayl7XHJcbiAgICBvYmogPSB7XHJcbiAgICAgIFwic3RhdHVzXCI6c3RhdHVzXHJcbiAgICB9XHJcbiAgICBpZihsYXQpXHJcbiAgICAgIG9ialtcImxhdFwiXSA9IHBhcnNlRmxvYXQobGF0KTtcclxuICAgIGlmKGxvbmcpXHJcbiAgICAgIG9ialtcImxvbmdcIl0gPSBwYXJzZUZsb2F0KGxvbmcpO1xyXG4gICAgQVBJLnNlbmQoIFwiaHR0cHM6Ly9sb2NhbGhvc3Q6ODA4MC9zdGF0dXNcIixcclxuICAgICAgICAgICAgXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIG51bGwsXHJcbiAgICAgICAgICAgIG9iaixcclxuICAgICAgICAgICAgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGxvZ2luRmFjZWJvb2ssXHJcbiAgICBzZWFyY2gsXHJcbiAgICBwb3N0XHJcbiAgfVxyXG59KVxyXG5cclxuLnNlcnZpY2UoJ01hcFNlcnZpY2UnLCBmdW5jdGlvbigpe1xyXG5cclxuXHR0aGlzLm1hcCA9IG51bGw7XHJcblx0dGhpcy5ib3VuZHMgPSBudWxsO1xyXG5cdHRoaXMuaW5mb3dpbmRvdyA9IG51bGw7XHJcblx0dGhpcy5jbGlja3dpbmRvdyA9IG51bGw7XHJcbiAgdGhpcy5tYXJrZXJzID0gbnVsbDtcclxuXHJcblx0dmFyIGluaXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICAgIC8vIEhvdyB6b29tZWQgaW4geW91IHdhbnQgdGhlIG1hcCB0byBzdGFydCBhdCAoYWx3YXlzIHJlcXVpcmVkKVxyXG4gICAgICB6b29tOiAxMCxcclxuXHJcbiAgICAgIC8vIFRoZSBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIHRvIGNlbnRlciB0aGUgbWFwIChhbHdheXMgcmVxdWlyZWQpXHJcbiAgICAgIGNlbnRlcjogbmV3IGdvb2dsZS5tYXBzLkxhdExuZyg0NS44OTQ2Mjk1LCAxMS4wNDM5MTQpLCAvLyBpbml0aWFsIHBvc2l0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hcEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBHb29nbGUgTWFwIHVzaW5nIG91ciBlbGVtZW50IGFuZCBvcHRpb25zIGRlZmluZWQgYWJvdmVcclxuICAgIHRoaXMubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChtYXBFbGVtZW50LCBtYXBPcHRpb25zKTtcclxuICAgIHRoaXMuYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xyXG5cdFx0dGhpcy5pbmZvd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTtcclxuXHRcdHRoaXMuY2xpY2t3aW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdygpO1xyXG5cclxuICAgIHRoaXMubWFya2VycyA9IFtdXHJcblx0fVxyXG5cclxuICB2YXIgZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiggdHdlZXQgKXtcclxuICAgIHZhciBsb2NhdGlvbiA9IHR3ZWV0LmxvY2F0aW9uXHJcbiAgICB2YXIgdXNlciA9IHR3ZWV0LnVzZXI7XHJcbiAgICBpZihsb2NhdGlvbil7XHJcbiAgICAgIGlmKGxvY2F0aW9uLmdlbyAmJiBsb2NhdGlvbi5nZW8uY29vcmRpbmF0ZXMpe1xyXG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5nZW8uY29vcmRpbmF0ZXM7XHJcbiAgICAgIH1cclxuICAgICAgaWYobG9jYXRpb24uY29vcmRpbmF0ZXMgJiYgbG9jYXRpb24uY29vcmRpbmF0ZXMuY29vcmRpbmF0ZXMpe1xyXG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5jb29yZGluYXRlcy5jb29yZGluYXRlcztcclxuICAgICAgfVxyXG4gICAgICBpZihsb2NhdGlvbi5wbGFjZSAmJiBsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3ggJiYgbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94LmNvb3JkaW5hdGVzICYmIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlc1swXSl7XHJcbiAgICAgICAgcmV0dXJuIFtsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3guY29vcmRpbmF0ZXNbMF1bMF1bMV0sIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlc1swXVswXVswXV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYodXNlci5sb2NhdGlvbil7XHJcblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcblx0dmFyIGFkZE1hcmtlcnMgPSBmdW5jdGlvbiggcGxhY2VzLCBjYWxsYmFja0xpc3RlbmVyICl7XHJcblxyXG5cdFx0c2VsZiA9IHRoaXM7XHJcblx0XHRhbmd1bGFyLmZvckVhY2gocGxhY2VzLCBmdW5jdGlvbiggdHdlZXQgKXtcclxuICAgICAgcGxhY2UgPSBzZWxmLmdldExvY2F0aW9uKHR3ZWV0KVxyXG4gICAgICBpZihwbGFjZSl7XHJcbiAgXHRcdFx0dmFyIG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjoge2xhdDogcGFyc2VGbG9hdChwbGFjZVswXSksIGxuZzogcGFyc2VGbG9hdChwbGFjZVsxXSl9LFxyXG4gICAgICAgICAgICBtYXA6IHNlbGYubWFwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2VsZi5tYXJrZXJzLnB1c2gobWFya2VyKTtcclxuXHJcbiAgICAgICAgdmFyIGNvbnRlbnRTdHJpbmcgPSAnPGRpdiBjbGFzcz1cInBhZGQ1IHdiXCI+JytcclxuICAgICAgICBcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cIm9wNiBmb250ODBcIj4nK1xyXG4gICAgICAgIFx0XHRcdFx0XHRcdFx0dHdlZXQudXNlci5uYW1lK1xyXG4gICAgICAgIFx0XHRcdFx0XHRcdCc8L2Rpdj4nK1xyXG4gICAgICAgIFx0XHRcdFx0XHQnPC9kaXY+JztcclxuXHJcbiAgICAgICAgc2VsZi5ib3VuZHMuZXh0ZW5kKG1hcmtlci5wb3NpdGlvbik7XHJcblxyXG4gICAgICAgIHZhciBjbG9zZVBvcFVwID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBcdGlmIChzZWxmLmluZm93aW5kb3cpXHJcbiAgXHQgICAgICAgIHNlbGYuaW5mb3dpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG9wZW5Qb3BVcCA9IGZ1bmN0aW9uKHRoaXN3aW5kb3cpe1xyXG4gICAgICAgICAgdGhpc3dpbmRvdy5zZXRDb250ZW50KGNvbnRlbnRTdHJpbmcpO1xyXG4gICAgICAgIFx0Ly8gYXBybyBpbCBwb3B1cFxyXG4gICAgICAgIFx0dGhpc3dpbmRvdy5vcGVuKHNlbGYubWFwLCBtYXJrZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFya2VyLmFkZExpc3RlbmVyKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdGNsb3NlUG9wVXAoKTtcclxuICAgICAgICBcdG9wZW5Qb3BVcChzZWxmLmluZm93aW5kb3cpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtYXJrZXIuYWRkTGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHRjbG9zZVBvcFVwKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1hcmtlci5hZGRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgb3BlblBvcFVwKHNlbGYuY2xpY2t3aW5kb3cpO1xyXG4gICAgICBcdCAgICAvLyBjaGlhbW8gbGEgZnVuemlvbmUgaW4gY29udHJvbGxlclxyXG4gICAgICBcdCAgICBjYWxsYmFja0xpc3RlbmVyKCBwbGFjZSApO1xyXG4gICAgXHRcdH0pO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cdH1cclxuXHJcblx0dmFyIGNlbnRlclRvID0gZnVuY3Rpb24oIHBvcyApe1xyXG5cdFx0dGhpcy5tYXAucGFuVG8oIHBvcyApO1xyXG5cdFx0dGhpcy5tYXAuc2V0Wm9vbSgxNSk7XHJcblx0fVxyXG5cclxuXHR2YXIgY2VudGVyID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKHRoaXMuYm91bmRzLmxlbmd0aCl7XHJcbiAgXHRcdHRoaXMubWFwLmZpdEJvdW5kcyh0aGlzLmJvdW5kcyk7XHJcbiAgICAgIHRoaXMubWFwLnNldFpvb20oMTApO1xyXG4gICAgfVxyXG5cdH1cclxuXHJcblx0dmFyIHJlc2V0ID0gZnVuY3Rpb24oKXtcclxuXHRcdHRoaXMuY2VudGVyKCk7XHJcbiAgICB0aGlzLmluZm93aW5kb3cuY2xvc2UoKTtcclxuICAgIHRoaXMuY2xpY2t3aW5kb3cuY2xvc2UoKTtcclxuXHR9XHJcblxyXG4gIHZhciBkZWxldGVBbGwgPSBmdW5jdGlvbigpe1xyXG4gICAgLy8gdGhpcy5jZW50ZXIoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXJrZXJzLmxlbmd0aDsgaSsrICkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbaV0uc2V0TWFwKG51bGwpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgICB0aGlzLmJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcclxuICAgIHRoaXMuaW5mb3dpbmRvdy5jbG9zZSgpO1xyXG4gICAgdGhpcy5jbGlja3dpbmRvdy5jbG9zZSgpO1xyXG4gIH1cclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdGFkZE1hcmtlcnM6IGFkZE1hcmtlcnMsXHJcblx0XHRpbml0OiBpbml0LFxyXG5cdFx0Y2VudGVyOiBjZW50ZXIsXHJcblx0XHRjZW50ZXJUbzogY2VudGVyVG8sXHJcblx0XHRyZXNldDogcmVzZXQsXHJcbiAgICBkZWxldGVBbGw6IGRlbGV0ZUFsbCxcclxuICAgIGdldExvY2F0aW9uOiBnZXRMb2NhdGlvblxyXG5cdH1cclxuXHJcbn0pXHJcbiJdfQ==
