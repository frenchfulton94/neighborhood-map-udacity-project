 var marker;
 var infoWindow;
 var map;
 var model;
 var eventIDs = [
            "416684592024124",
            "248732562199286",
            "1898255727093448",
            "144302939447887",
            "1843955289178024",
            "1715694788728873",
            "1916049402017980",
            "245494989254770",
            "122692371654560",
            "662584573930584",
            "650723261801441",
            "109548779712645"
        ];
 var eventObj = function (obj) {
     this.title = obj.name;
     this.category = obj.category;
     this.description = obj.description;
     this.locationName = obj.place.name;
     this.latitude = obj.place.location.latitude;
     this.longitude = obj.place.location.longitude;
     this.id = obj.id;
     this.image = obj.cover.source;
     this.UTCDate = obj.start_time;
     this.date = function () {
         var newDate = new Date(this.UTCDate);
         return newDate.toLocaleDateString();
     };
 };

 // Facebook API Functionality
 (function (d, s, id) {
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {
         return;
     }
     js = d.createElement(s);
     js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
 }(document, 'script', 'facebook-jssdk'));

 $(function (ready) {
     model = new viewModel();
     ko.applyBindings(model);

     // Prevents default event for form submission via return key
     $(window).keydown(function (e) {
         if (e.keyCode == 13) {
             e.preventDefault();
             return false;
         }
     });
 });

 // When a user logins, grab the facebook event IDs and grab relevant data from API
 function login() {
     eventIDs.forEach(function (id) {
         getData(id);
     });
 }

 // Grab event information from facebook API
 function getData(id) {
     FB.api(
         '/' + id,
         function (response) {
             if (response && !response.error) {
                 var tempEvent = new eventObj(response);

                 model.addEvents(tempEvent);
                 if (map) {
                     model.addMarkers(tempEvent);
                 }
             } else {
                 console.log(response.error.message);
                 window.alert("Sorry could not load events.");
             }
         }, {
             scope: "user_events",
             fields: "cover, category, description, name, place, start_time",
             access_token: "1954861288122349|stY_aKUPtSl9_hRo0EKVbmFPE40"
         }
     );
 }


 function infoWindowInit() {
     infoWindow = new google.maps.InfoWindow();
     infoWindow.setWidth = 300;
     google.maps.event.addListener(infoWindow, 'closeclick', function () {
         model.stopAnimation();
         model.selectedID("");
     });
 }

 function initMap() {
     map = new google.maps.Map(document.getElementById('map'), {
         center: {
             lat: 40.7202778,
             lng: -74.0055556
         },
         zoom: 12
     });
     infoWindowInit();
 }

 window.fbAsyncInit = function () {
     FB.init({
         appId: '1954861288122349',
         autoLogAppEvents: true,
         xfbml: true,
         version: 'v2.10'
     });
     FB.AppEvents.logPageView();

     login();
 };

 function error() {
     window.alert("Could not load google maps. Please Refresh.");
 }

 function viewModel() {
     var self = this;
     self.previousObj;
     self.previousMarker = ko.observable();
     self.events = ko.observableArray();
     self.markers = ko.observableArray();
     self.userInput = ko.observable("");
     self.selectedID = ko.observable("");

     // Searches through the events array for events matching user input and returns results in an array
     self.filterEvents = ko.computed(function () {
         if (!self.userInput()) {
             return self.events();
         } else {
             return ko.utils.arrayFilter(self.events(), function (e) {
                 return e.title.toLowerCase().includes(self.userInput().toLowerCase());
             });
         }
     });

     self.addEvents = function (tempEvent) {
         self.events.push(tempEvent);
     };

     self.addMarkers = function (tempEvent) {
         marker = new google.maps.Marker({
             title: tempEvent.id,
             position: {
                 lat: tempEvent.latitude,
                 lng: tempEvent.longitude
             },
             map: map
         });
         marker.addListener('click', function () {
             self.stopAnimation();
             self.startAnimation(this);
             if (!self.checkedIsSelected(this.title)) {
                 self.addInfoWindow(this);
                 self.selectedID(this.title);
             } else {
                 self.clearPreviousInfoWindow();
                 self.selectedID("");
             }
             self.previousMarker(this);
         });

         self.markers.push(marker);
     };

     self.getMarkers = function getMarkers(filter = self.userInput()) {
         self.markers().forEach(function (marker) {
             var result = self.events().find(function (event) {
                 return event.id == marker.title;
             });
             if (result.title.toLowerCase().includes(filter.toLowerCase())) {
                 marker.setMap(map);
             }
         });
     };

     self.clearMarkers = function () {
         for (var i = 0; i < self.markers().length; i++) {
             self.markers()[i].setMap(null);
         }
     };

     self.addInfoWindow = function (obj) {

         var found = ko.utils.arrayFilter(self.events(), function (e) {
             return e.id == obj.title;
         })[0];

         var content = '<style> .markerWrapper { text-align: center; width:300px; z-index: 5;} .markerImage {width: 300px; height: 200px; }.markerTitle { margin-top: 15px; } .markerDate {margin: 0;} .markerCategory{margin: 0;} .markerDescription{ margin-top: 15px; height: 100px; text-align: justify; width: inherit;}</style> <div class="markerWrapper"><img class="markerImage" src="' + found.image + '" alt="' + found.title + ' Event Image">' + '<h5 class="markerTitle">' + found.title + '</h5>' + '<p class="markerCategory">' + found.category + '</p>' + '<p class="markerDate">' + found.date() + '</p>' + '<p class="markerDescription">' + found.description + '</p></div>';
         infoWindow.setContent(content);

         infoWindow.open(map, obj);
     };

     self.clearPreviousInfoWindow = function () {
         infoWindow.close();
     };

     self.startAnimation = function (marker) {
         marker.setAnimation(google.maps.Animation.BOUNCE);
     };

     self.stopAnimation = function () {
         if (self.previousMarker() !== undefined) {
             self.previousMarker().setAnimation(null);
         }
     };

     self.checkedIsSelected = function (id) {
         return self.selectedID() == id;
     };
     
     self.clickEvent = function (obj) {
         self.clearPreviousInfoWindow();
         self.stopAnimation();
         if (!self.checkedIsSelected(obj.id) || previousObj != obj) {
             var filter = obj.id;
             self.selectedID(filter);
             var selected = ko.utils.arrayFilter(self.markers(), function (marker) {
                 return marker.title == filter;
             })[0];
             self.startAnimation(selected);
             self.addInfoWindow(selected);
             self.previousMarker(selected);
         } else {
             self.selectedID("");
         }
         previousObj = obj;
     };
     
     // For every change in the search bar, the events and markers are filtered based on current input
     self.updateView = function (obj) {
         self.selectedID("");
         self.clearPreviousInfoWindow();
         self.clearMarkers();
         self.getMarkers(self.userInput());
     };
 }

