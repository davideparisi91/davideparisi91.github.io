(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
angular.module('app', ['app.services'])

.controller('UserController', function($scope, $sce, $timeout, MapService, SocialService){


  SocialService.wakeup();

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

  var wakeup = function(){
    API.send( "https://emergencyfinder.now.sh/",
            "GET",
            null,
            null,
            null);
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
    post,
    wakeup
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjbGllbnQvanMvY29udHJvbGxlcnMuanMiLCJjbGllbnQvanMvaW5kZXguanMiLCJjbGllbnQvanMvc2VydmljZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImFuZ3VsYXIubW9kdWxlKCdhcHAnLCBbJ2FwcC5zZXJ2aWNlcyddKVxyXG5cclxuLmNvbnRyb2xsZXIoJ1VzZXJDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLCAkc2NlLCAkdGltZW91dCwgTWFwU2VydmljZSwgU29jaWFsU2VydmljZSl7XHJcblxyXG5cclxuICBTb2NpYWxTZXJ2aWNlLndha2V1cCgpO1xyXG5cclxuXHRtYXAgPSBNYXBTZXJ2aWNlO1xyXG4gIG1hcC5pbml0KCk7XHJcblxyXG4gICRzY29wZS5kaWN0aW9uYXJ5ID0gXCJWVkZcIjtcclxuICAkc2NvcGUucSA9IFwiSW5jZW5kaW9cIjtcclxuICAkc2NvcGUubGF0ID0gNDYuMDg7XHJcbiAgJHNjb3BlLmxvbmcgPSAxMS4wNTtcclxuICAkc2NvcGUucmFkaXVzID0gNTA7XHJcblxyXG4gICRzY29wZS5zZWFyY2ggPSBmdW5jdGlvbigpe1xyXG4gICAgaWYoJHNjb3BlLnEpe1xyXG4gICAgICBTb2NpYWxTZXJ2aWNlLnNlYXJjaCgkc2NvcGUucSwgJHNjb3BlLmxhdCwgJHNjb3BlLmxvbmcsICRzY29wZS5yYWRpdXMsICRzY29wZS5kaWN0aW9uYXJ5LCBmdW5jdGlvbihyZXNwb25zZSl7XHJcbiAgICAgICAgJHNjb3BlLnR3ZWV0cyA9IHJlc3BvbnNlLnR3aXR0ZXJcclxuICAgICAgICAkc2NvcGUuZmFjZWJvb2sgPSByZXNwb25zZS5mYWNlYm9vaztcclxuXHJcbiAgICAgICAgbWFwLmRlbGV0ZUFsbCgpO1xyXG4gICAgICAgIG1hcC5hZGRNYXJrZXJzKCAkc2NvcGUudHdlZXRzLCBudWxsICk7XHJcbiAgICAgICAgbWFwLmNlbnRlcigpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gICRzY29wZS5wb3N0ID0gZnVuY3Rpb24oKXtcclxuICAgICRzY29wZS5hZHZpc2UgPSBcIlwiO1xyXG4gICAgaWYoJHNjb3BlLnBvc3RTdGF0dXMpe1xyXG4gICAgICBTb2NpYWxTZXJ2aWNlLnBvc3QoJHNjb3BlLnBvc3RTdGF0dXMsICRzY29wZS5wb3N0TGF0LCAkc2NvcGUucG9zdExvbmcsIGZ1bmN0aW9uKHJlc3BvbnNlKXtcclxuICAgICAgICBpZihyZXNwb25zZS50d2l0dGVyICYmIHJlc3BvbnNlLnR3aXR0ZXIucmVzcCAmJiByZXNwb25zZS50d2l0dGVyLnJlc3Auc3RhdHVzQ29kZSA9PSAnMjAwJylcclxuICAgICAgICAgICRzY29wZS5hZHZpc2UgPSBcInB1YmJsaWNhdG8gY29ycmV0dGFtZW50ZSFcIlxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcbn0pOyIsInZhciBzZXIgPSByZXF1aXJlKCcuL3NlcnZpY2VzLmpzJyk7XHJcbnZhciBmb28gPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzLmpzJyk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuc2VydmljZXMnLCBbXSlcclxuXHJcbi5zZXJ2aWNlKCdBUEknLCBmdW5jdGlvbiggJGh0dHAgKXtcclxuICByZXR1cm4ge1xyXG5cclxuICAgIHNlbmQ6IGZ1bmN0aW9uKHVybCwgbWV0aG9kLCBoZWFkZXJzLCBtZXRob2RfZGF0YSwgY2FsbGJhY2spe1xyXG5cclxuICAgICAgdmFyIGRhdGEgICAgPSAoIG1ldGhvZCA9PSBcIlBPU1RcIiApID8gXCJkYXRhXCIgOiBcInBhcmFtc1wiO1xyXG5cclxuICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgbWV0aG9kOiAgIG1ldGhvZCxcclxuICAgICAgICB1cmw6ICAgICAgdXJsLFxyXG4gICAgICAgIGhlYWRlcnM6ICBoZWFkZXJzXHJcbiAgICAgIH1cclxuICAgICAgb3B0aW9uc1tkYXRhXSA9IG1ldGhvZF9kYXRhO1xyXG5cclxuICAgICAgJGh0dHAob3B0aW9ucylcclxuICAgICAgLnRoZW4oXHJcbiAgICAgICAgZnVuY3Rpb24gc3VjY2Vzc0NhbGxiYWNrKCByZXNwb25zZSApIHtcclxuICAgICAgICAgIGlmKHJlc3BvbnNlLmRhdGEpXHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCByZXNwb25zZS5kYXRhICk7XHJcbiAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGNhbGxiYWNrKCByZXNwb25zZSApO1xyXG4gICAgICAgIH0sIGZ1bmN0aW9uIGVycm9yQ2FsbGJhY2soIHJlc3BvbnNlICkge1xyXG4gICAgICAgICAgLy8gZ2VzdGlyZSBlcnJvcmUhXHJcbiAgICAgICAgICByZXNwb25zZS5lcnJvciA9IHRydWU7XHJcbiAgICAgICAgICBjYWxsYmFjayggcmVzcG9uc2UgKTtcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgfVxyXG59KVxyXG5cclxuLnNlcnZpY2UoJ1NvY2lhbFNlcnZpY2UnLCBmdW5jdGlvbihBUEkpe1xyXG5cclxuICB0aGlzLmZhY2VUb2tlbiA9IG51bGw7XHJcblxyXG4gIHZhciBsb2dpbkZhY2Vib29rID0gZnVuY3Rpb24oKXtcclxuICAgIGNvbnNvbGUubG9nKFwiZmFjZWJvb2sgbG9naW5cIik7XHJcbiAgICB0aGlzLmZhY2VUb2tlbiA9IDI7XHJcbiAgfVxyXG5cclxuICB2YXIgZ2V0VG9rZW4gPSBmdW5jdGlvbigpe1xyXG4gICAgcmV0dXJuIHRoaXMuZmFjZVRva2VuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHdha2V1cCA9IGZ1bmN0aW9uKCl7XHJcbiAgICBBUEkuc2VuZCggXCJodHRwczovL2VtZXJnZW5jeWZpbmRlci5ub3cuc2gvXCIsXHJcbiAgICAgICAgICAgIFwiR0VUXCIsXHJcbiAgICAgICAgICAgIG51bGwsXHJcbiAgICAgICAgICAgIG51bGwsXHJcbiAgICAgICAgICAgIG51bGwpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlYXJjaCA9IGZ1bmN0aW9uKHEsIGxhdCwgbG9uZywgcmFkaXVzLCBkaWN0aW9uYXJ5LCBjYWxsYmFjayl7XHJcbiAgICBwYXJhbSA9IFwiP3E9XCIrZW5jb2RlVVJJQ29tcG9uZW50KHEpXHJcbiAgICBwYXJhbSArPSAobGF0ICYmIGxvbmcgJiYgcmFkaXVzKSA/ICcmZ2VvY29kZT1cIicrbGF0KycgJytsb25nKycgJytyYWRpdXMrJ2ttXCInIDogXCJcIjtcclxuICAgIHBhcmFtICs9IChkaWN0aW9uYXJ5KSA/IFwiJmRpY3Rpb25hcnk9XCIrZW5jb2RlVVJJQ29tcG9uZW50KGRpY3Rpb25hcnkpIDogXCJcIjtcclxuICAgIHBhcmFtICs9IFwiJnR3ZWV0X21vZGU9ZXh0ZW5kZWRcIjtcclxuICAgIEFQSS5zZW5kKCBcImh0dHBzOi8vZW1lcmdlbmN5ZmluZGVyLm5vdy5zaC9zZWFyY2hcIitwYXJhbSxcclxuICAgICAgICAgICAgXCJHRVRcIixcclxuICAgICAgICAgICAgbnVsbCxcclxuICAgICAgICAgICAgbnVsbCxcclxuICAgICAgICAgICAgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgdmFyIHBvc3QgPSBmdW5jdGlvbihzdGF0dXMsIGxhdCwgbG9uZywgY2FsbGJhY2spe1xyXG4gICAgb2JqID0ge1xyXG4gICAgICBcInN0YXR1c1wiOnN0YXR1c1xyXG4gICAgfVxyXG4gICAgaWYobGF0KVxyXG4gICAgICBvYmpbXCJsYXRcIl0gPSBwYXJzZUZsb2F0KGxhdCk7XHJcbiAgICBpZihsb25nKVxyXG4gICAgICBvYmpbXCJsb25nXCJdID0gcGFyc2VGbG9hdChsb25nKTtcclxuICAgIEFQSS5zZW5kKCBcImh0dHBzOi8vZW1lcmdlbmN5ZmluZGVyLm5vdy5zaC9zdGF0dXNcIixcclxuICAgICAgICAgICAgXCJQT1NUXCIsXHJcbiAgICAgICAgICAgIG51bGwsXHJcbiAgICAgICAgICAgIG9iaixcclxuICAgICAgICAgICAgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGxvZ2luRmFjZWJvb2ssXHJcbiAgICBzZWFyY2gsXHJcbiAgICBwb3N0LFxyXG4gICAgd2FrZXVwXHJcbiAgfVxyXG59KVxyXG5cclxuLnNlcnZpY2UoJ01hcFNlcnZpY2UnLCBmdW5jdGlvbigpe1xyXG5cclxuXHR0aGlzLm1hcCA9IG51bGw7XHJcblx0dGhpcy5ib3VuZHMgPSBudWxsO1xyXG5cdHRoaXMuaW5mb3dpbmRvdyA9IG51bGw7XHJcblx0dGhpcy5jbGlja3dpbmRvdyA9IG51bGw7XHJcbiAgdGhpcy5tYXJrZXJzID0gbnVsbDtcclxuXHJcblx0dmFyIGluaXQgPSBmdW5jdGlvbigpe1xyXG5cdFx0dmFyIG1hcE9wdGlvbnMgPSB7XHJcbiAgICAgIC8vIEhvdyB6b29tZWQgaW4geW91IHdhbnQgdGhlIG1hcCB0byBzdGFydCBhdCAoYWx3YXlzIHJlcXVpcmVkKVxyXG4gICAgICB6b29tOiAxMCxcclxuXHJcbiAgICAgIC8vIFRoZSBsYXRpdHVkZSBhbmQgbG9uZ2l0dWRlIHRvIGNlbnRlciB0aGUgbWFwIChhbHdheXMgcmVxdWlyZWQpXHJcbiAgICAgIGNlbnRlcjogbmV3IGdvb2dsZS5tYXBzLkxhdExuZyg0NS44OTQ2Mjk1LCAxMS4wNDM5MTQpLCAvLyBpbml0aWFsIHBvc2l0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgdmFyIG1hcEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFwJyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBHb29nbGUgTWFwIHVzaW5nIG91ciBlbGVtZW50IGFuZCBvcHRpb25zIGRlZmluZWQgYWJvdmVcclxuICAgIHRoaXMubWFwID0gbmV3IGdvb2dsZS5tYXBzLk1hcChtYXBFbGVtZW50LCBtYXBPcHRpb25zKTtcclxuICAgIHRoaXMuYm91bmRzID0gbmV3IGdvb2dsZS5tYXBzLkxhdExuZ0JvdW5kcygpO1xyXG5cdFx0dGhpcy5pbmZvd2luZG93ID0gbmV3IGdvb2dsZS5tYXBzLkluZm9XaW5kb3coKTtcclxuXHRcdHRoaXMuY2xpY2t3aW5kb3cgPSBuZXcgZ29vZ2xlLm1hcHMuSW5mb1dpbmRvdygpO1xyXG5cclxuICAgIHRoaXMubWFya2VycyA9IFtdXHJcblx0fVxyXG5cclxuICB2YXIgZ2V0TG9jYXRpb24gPSBmdW5jdGlvbiggdHdlZXQgKXtcclxuICAgIHZhciBsb2NhdGlvbiA9IHR3ZWV0LmxvY2F0aW9uXHJcbiAgICB2YXIgdXNlciA9IHR3ZWV0LnVzZXI7XHJcbiAgICBpZihsb2NhdGlvbil7XHJcbiAgICAgIGlmKGxvY2F0aW9uLmdlbyAmJiBsb2NhdGlvbi5nZW8uY29vcmRpbmF0ZXMpe1xyXG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5nZW8uY29vcmRpbmF0ZXM7XHJcbiAgICAgIH1cclxuICAgICAgaWYobG9jYXRpb24uY29vcmRpbmF0ZXMgJiYgbG9jYXRpb24uY29vcmRpbmF0ZXMuY29vcmRpbmF0ZXMpe1xyXG4gICAgICAgIHJldHVybiBsb2NhdGlvbi5jb29yZGluYXRlcy5jb29yZGluYXRlcztcclxuICAgICAgfVxyXG4gICAgICBpZihsb2NhdGlvbi5wbGFjZSAmJiBsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3ggJiYgbG9jYXRpb24ucGxhY2UuYm91bmRpbmdfYm94LmNvb3JkaW5hdGVzICYmIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlc1swXSl7XHJcbiAgICAgICAgcmV0dXJuIFtsb2NhdGlvbi5wbGFjZS5ib3VuZGluZ19ib3guY29vcmRpbmF0ZXNbMF1bMF1bMV0sIGxvY2F0aW9uLnBsYWNlLmJvdW5kaW5nX2JveC5jb29yZGluYXRlc1swXVswXVswXV07XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2UgaWYodXNlci5sb2NhdGlvbil7XHJcblxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcblx0dmFyIGFkZE1hcmtlcnMgPSBmdW5jdGlvbiggcGxhY2VzLCBjYWxsYmFja0xpc3RlbmVyICl7XHJcblxyXG5cdFx0c2VsZiA9IHRoaXM7XHJcblx0XHRhbmd1bGFyLmZvckVhY2gocGxhY2VzLCBmdW5jdGlvbiggdHdlZXQgKXtcclxuICAgICAgcGxhY2UgPSBzZWxmLmdldExvY2F0aW9uKHR3ZWV0KVxyXG4gICAgICBpZihwbGFjZSl7XHJcbiAgXHRcdFx0dmFyIG1hcmtlciA9IG5ldyBnb29nbGUubWFwcy5NYXJrZXIoe1xyXG4gICAgICAgICAgICBwb3NpdGlvbjoge2xhdDogcGFyc2VGbG9hdChwbGFjZVswXSksIGxuZzogcGFyc2VGbG9hdChwbGFjZVsxXSl9LFxyXG4gICAgICAgICAgICBtYXA6IHNlbGYubWFwXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2VsZi5tYXJrZXJzLnB1c2gobWFya2VyKTtcclxuXHJcbiAgICAgICAgdmFyIGNvbnRlbnRTdHJpbmcgPSAnPGRpdiBjbGFzcz1cInBhZGQ1IHdiXCI+JytcclxuICAgICAgICBcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cIm9wNiBmb250ODBcIj4nK1xyXG4gICAgICAgIFx0XHRcdFx0XHRcdFx0dHdlZXQudXNlci5uYW1lK1xyXG4gICAgICAgIFx0XHRcdFx0XHRcdCc8L2Rpdj4nK1xyXG4gICAgICAgIFx0XHRcdFx0XHQnPC9kaXY+JztcclxuXHJcbiAgICAgICAgc2VsZi5ib3VuZHMuZXh0ZW5kKG1hcmtlci5wb3NpdGlvbik7XHJcblxyXG4gICAgICAgIHZhciBjbG9zZVBvcFVwID0gZnVuY3Rpb24oKXtcclxuICAgICAgICBcdGlmIChzZWxmLmluZm93aW5kb3cpXHJcbiAgXHQgICAgICAgIHNlbGYuaW5mb3dpbmRvdy5jbG9zZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIG9wZW5Qb3BVcCA9IGZ1bmN0aW9uKHRoaXN3aW5kb3cpe1xyXG4gICAgICAgICAgdGhpc3dpbmRvdy5zZXRDb250ZW50KGNvbnRlbnRTdHJpbmcpO1xyXG4gICAgICAgIFx0Ly8gYXBybyBpbCBwb3B1cFxyXG4gICAgICAgIFx0dGhpc3dpbmRvdy5vcGVuKHNlbGYubWFwLCBtYXJrZXIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWFya2VyLmFkZExpc3RlbmVyKCdtb3VzZW92ZXInLCBmdW5jdGlvbigpIHtcclxuICAgICAgICBcdGNsb3NlUG9wVXAoKTtcclxuICAgICAgICBcdG9wZW5Qb3BVcChzZWxmLmluZm93aW5kb3cpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBtYXJrZXIuYWRkTGlzdGVuZXIoJ21vdXNlb3V0JywgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgXHRjbG9zZVBvcFVwKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG1hcmtlci5hZGRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgb3BlblBvcFVwKHNlbGYuY2xpY2t3aW5kb3cpO1xyXG4gICAgICBcdCAgICAvLyBjaGlhbW8gbGEgZnVuemlvbmUgaW4gY29udHJvbGxlclxyXG4gICAgICBcdCAgICBjYWxsYmFja0xpc3RlbmVyKCBwbGFjZSApO1xyXG4gICAgXHRcdH0pO1xyXG4gICAgICB9XHJcbiAgICB9KVxyXG5cdH1cclxuXHJcblx0dmFyIGNlbnRlclRvID0gZnVuY3Rpb24oIHBvcyApe1xyXG5cdFx0dGhpcy5tYXAucGFuVG8oIHBvcyApO1xyXG5cdFx0dGhpcy5tYXAuc2V0Wm9vbSgxNSk7XHJcblx0fVxyXG5cclxuXHR2YXIgY2VudGVyID0gZnVuY3Rpb24oKXtcclxuICAgIGlmKHRoaXMuYm91bmRzLmxlbmd0aCl7XHJcbiAgXHRcdHRoaXMubWFwLmZpdEJvdW5kcyh0aGlzLmJvdW5kcyk7XHJcbiAgICAgIHRoaXMubWFwLnNldFpvb20oMTApO1xyXG4gICAgfVxyXG5cdH1cclxuXHJcblx0dmFyIHJlc2V0ID0gZnVuY3Rpb24oKXtcclxuXHRcdHRoaXMuY2VudGVyKCk7XHJcbiAgICB0aGlzLmluZm93aW5kb3cuY2xvc2UoKTtcclxuICAgIHRoaXMuY2xpY2t3aW5kb3cuY2xvc2UoKTtcclxuXHR9XHJcblxyXG4gIHZhciBkZWxldGVBbGwgPSBmdW5jdGlvbigpe1xyXG4gICAgLy8gdGhpcy5jZW50ZXIoKTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5tYXJrZXJzLmxlbmd0aDsgaSsrICkge1xyXG4gICAgICB0aGlzLm1hcmtlcnNbaV0uc2V0TWFwKG51bGwpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5tYXJrZXJzID0gW107XHJcbiAgICB0aGlzLmJvdW5kcyA9IG5ldyBnb29nbGUubWFwcy5MYXRMbmdCb3VuZHMoKTtcclxuICAgIHRoaXMuaW5mb3dpbmRvdy5jbG9zZSgpO1xyXG4gICAgdGhpcy5jbGlja3dpbmRvdy5jbG9zZSgpO1xyXG4gIH1cclxuXHJcblx0cmV0dXJuIHtcclxuXHRcdGFkZE1hcmtlcnM6IGFkZE1hcmtlcnMsXHJcblx0XHRpbml0OiBpbml0LFxyXG5cdFx0Y2VudGVyOiBjZW50ZXIsXHJcblx0XHRjZW50ZXJUbzogY2VudGVyVG8sXHJcblx0XHRyZXNldDogcmVzZXQsXHJcbiAgICBkZWxldGVBbGw6IGRlbGV0ZUFsbCxcclxuICAgIGdldExvY2F0aW9uOiBnZXRMb2NhdGlvblxyXG5cdH1cclxuXHJcbn0pXHJcbiJdfQ==
