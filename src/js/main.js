 var currentUser;
 var marker;
 var previousMarker;
 var currentMarker;
 var infoWindow;
 var map;
 var isSelected = false;
 var previousObj;
 var eventIDs = [
            "41668459202412/",
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
 var event = function (obj) {
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

 function viewModel() {
     var self = this;
     self.events = ko.observableArray();
     self.filter = ko.observable("");
     self.markers = ko.observableArray();

     // Searches through the events array for events matching user input and returns results in an array
     self.filterEvents = ko.computed(function () {
         if (!self.filter) {
             return self.events();
         } else {
             return ko.utils.arrayFilter(self.events(), function (event) {
                 return event.title.toLowerCase().includes(self.filter().toLowerCase());
             });
         }
     });
 }
 var model = new viewModel();

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
     ko.applyBindings(model);

     // For every change in the search bar, the events and markers are filtered based on current input
     $('#search').on('input', function () {
         getLoginStatus(function () {
             var filter = input();
             clearMarkers();
             getMarkers(filter);
             model.filter(filter);
         }, function () {
             window.alert("Please login into Facebook");
             input('');
         });

     });

     // When a user clicks on an event in the list view, the event is selected and map updated with
     // the relevant marker and infoWindow
     $('#events').on('click', 'article', function (obj) {
         deselectListItem();
         clearPreviousInfoWindow();
         clearMarkers();

         var filter = input();
         var elem = obj.currentTarget;
         if (!isSelected || previousObj != elem) {

             filter = String(elem.children[0].innerHTML);
             var selected = ko.utils.arrayFilter(model.markers(), function (marker) {
                 return marker.title == filter;
             })[0];
             selected.setMap(map);
             startAnimation(selected);
             previousMarker = selected;
             addInfoWindow(selected);
             $(elem).addClass('selected');
             isSelected = true;
         } else {
             isSelected = false;
             model.filter(input());
         }
         getMarkers(filter);
         previousObj = elem;
     });

     // Prevents default event for form submission via return key
     $(window).keydown(function (event) {
         if (event.keyCode == 13) {
             event.preventDefault();
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

 function getLoginStatus(callback, errorHandler) {
     FB.getLoginStatus(function (response) {
         if (response.status == "connected") {
             callback();
         } else {
             errorHandler();
         }
     });
 }

 // Grab event information from facebook API
 function getData(id) {
     FB.api(
         '/' + id,
         function (response) {
             if (response && !response.error) {
                 var tempEvent = new event(response);

                 addEventToModel(tempEvent);
                 addMarkerToModel(tempEvent);
             }
         }, {
             scope: "user_events",
             fields: "cover, category, description, name, place, start_time"
         }
     );
 }

 function addEventToModel(tempEvent) {
     model.events.push(tempEvent);
 }

 function addMarkerToModel(tempEvent) {
     marker = new google.maps.Marker({
         title: tempEvent.title,
         position: {
             lat: tempEvent.latitude,
             lng: tempEvent.longitude
         },
         map: map
     });
     marker.addListener('click', function () {
         stopAnimation();

         startAnimation(this);
         if (!isSelected || previousMarker != this) {
             addInfoWindow(this);
             selectListItem(this);
             isSelected = true;
         } else {
             clearPreviousInfoWindow();
             deselectListItem();
             model.filter(input());
             isSelected = false;
         }

         previousMarker = this;
     });
     model.markers.push(marker);
 }

 function clearMarkers() {
     for (var i = 0; i < model.markers().length; i++) {
         model.markers()[i].setMap(null);
     }
 }

 function clearPreviousInfoWindow() {
     infoWindow.close();
 }

 function startAnimation(marker) {
     marker.setAnimation(google.maps.Animation.BOUNCE);
 }

 function stopAnimation() {
     if (previousMarker != undefined) {
         previousMarker.setAnimation(null);
     }
 }

 function getMarkers(filter) {
     for (var i = 0; i < model.markers().length; i++) {
         var curMarker = model.markers()[i];
         if (curMarker.title.toLowerCase().includes(filter.toLowerCase())) {
             curMarker.setMap(map);
         }
     }
 }

 function selectListItem(selectedMarker) {
     model.filter(selectedMarker.title);
     $('.events').addClass('selected');
 }

 function deselectListItem() {
     $('.events').removeClass('selected');
 }

 function addInfoWindow(obj) {

     var found = ko.utils.arrayFilter(model.events(), function (event) {
         return event.title == obj.title;

     })[0];

     var content = '<style> .markerWrapper { text-align: center; width:300px; z-index: 5;} .markerImage {width: 300px; height: 200px; }.markerTitle { margin-top: 15px; } .markerDate {margin: 0;} .markerCategory{margin: 0;} .markerDescription{ margin-top: 15px; height: 100px; text-align: justify; width: inherit;}</style> <div class="markerWrapper"><img class="markerImage" src="' + found.image + '" alt="' + found.title + ' Event Image">' + '<h5 class="markerTitle">' + found.title + '</h5>' + '<p class="markerCategory">' + found.category + '</p>' + '<p class="markerDate">' + found.date() + '</p>' + '<p class="markerDescription">' + found.description + '</p></div>';
     infoWindow.setContent(content);

     infoWindow.open(map, obj);
 }

 function input(filter = null) {
     var obj = $('#search');
     if (filter != null) {
         obj.val(filter);
         return;
     }
     return obj.val();
 }

 function infoWindowInit() {
     infoWindow = new google.maps.InfoWindow();
     infoWindow.setWidth = 300;
     google.maps.event.addListener(infoWindow, 'closeclick', function () {
         deselectListItem();
         clearMarkers();
         var val = input();
         getMarkers(val);
         model.filter(val);
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
     getLoginStatus(login, function () {
         window.alert("Please login to Facebook");
     });
     FB.Event.subscribe('auth.logout', function () {
         clearMarkers();
         isSelected = false;
         location.reload();
     });

 };
