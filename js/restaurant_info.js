//Registering the Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(registration => {
        //console.log('Service worker successfully registered on scope', registration.scope);
      }).catch(error => {
        //console.log('Service worker failed to register');
      });
    });
  }
  
let restaurant;
let reviews;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {  
  initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {      
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
      L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
        mapboxToken: 'pk.eyJ1IjoiYW1qb3MiLCJhIjoiY2prOW1sODhjMDN4ZjN2cWowY3lsZG5hdiJ9.0an4zaXRGvadh0UfDtqIMw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'    
      }).addTo(newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}  
 
/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  name.setAttribute('aria-label', ''+ restaurant.name);

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  address.setAttribute('aria-label', ''+ restaurant.address);


  const image = document.getElementById('restaurant-img');
  image.setAttribute('alt', 'Image of ' + restaurant.name + ' Restaurant');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  cuisine.setAttribute('aria-label', '' + restaurant.cuisine_type);
  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  hours.setAttribute('role', 'presentation');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    row.setAttribute('aria-label', ''+ operatingHours[key]);
    const day = document.createElement('td');
    day.innerHTML = key;
    day.setAttribute('aria-label', ''+ day.innerHTML);
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

// fetch reviews from the server
let REVIEWS_URL = "http://localhost:1337/reviews";

fetchReviewsFromServerbyid = (id,callback) => {
  let url=REVIEWS_URL+'?restaurant_id='+id;   //`?restaurant_id=${id}`;
    fetch(url).then(response => {
      let review= response.json();
      review.then(function(reviewValue) {
        callback(null,reviewValue);
        console.log (reviewValue);
      });      
    }).catch(error =>{
      callback(error, null);
    });
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.reviewValue) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    noReviews.setAttribute('aria-label', 'No reviews yet');
    container.appendChild(noReviews);

    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}



/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  li.setAttribute('aria-label', 'Reviews');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  name.setAttribute('aria-label', ''+ review.name);
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = review.date;
  date.setAttribute('aria-label', ''+ review.date);
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.setAttribute('aria-label', 'Rating: ' + review.rating);
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.setAttribute('aria-label', '' + review.comments);
  li.appendChild(comments);

  return li;
}



// Add Review 
const form = document.querySelector('form');
form.addEventListener('submit', function(event) {
  event.preventDefault();

  // Getting the data from the review form
  const restaurantId = self.restaurant.id;
  let reviewAuthor = document.getElementById('name').value;
  let reviewRating = document.getElementById('rating').value;
  let reviewComment = document.getElementById('comment').value;
  let createdAt = new Date();



  const postedReview = {
    "restaurant_id": parseInt(restaurantId),
    "name": reviewAuthor,
    "rating": parseInt(reviewRating),
    "comments": reviewComment,
    "createdAt": createdAt,
  };


  fetch('http://localhost:1337/reviews', { 
    method: 'post', 
    headers: { "Content-type": "application/json; charset=UTF-8" }, 
    body: JSON.stringify(postedReview) 
  }) 
  .then(function (data) { 
    console.log('Request succeeded with JSON response', data); 
  }).catch(function (error) { 
    console.log('Request failed', error); 
  });

  // post data to database

  failedPostListener = () => {
    navigator.serviceWorker.addEventListener('message', event => {
      var form = document.getElementById('form');

      // Alert displays the message sent from our service worker
      alert(event.data.msg);

      // Assuming personal-details database have been created with
      // form_data object store.
      // We simply write to form_data.
      idb.open('review-personal-details', 1).then(function(db) {
        const tx = db.transaction('form_data', 'readwrite');
        const store = tx.objectStore('form_data');
        store.put({name: `${form[0].value}`});
        console.log('Posted to database successfully');
      })
    });
  }
})

addReviewHTML = (review) => {
  if (document.getElementById('no-review')) {
    document.getElementById('no-review').remove();
  }
  const container = document.getElementById('reviews-container');
  const ul = document.getElementById('reviews-list');

  //insert the new review on top
  ul.insertBefore(createReviewHTML(review), ul.firstChild);
  container.appendChild(ul);
}

/* listen to the network status by adding a listener to the window global object
document.addEventListener('online', handleConnectionChange);

handleConnectionChange = (event) => {
  if(event.type == "online"){
    // Setup the request
    console.log ('online');
    var headers = new Headers();
    // Set some Headers
    headers.set('Accept', 'application/json');
  }
}*/

  

  /* Get Data from indexedDB
  idb.open('review-personal-details', 1).then(function(db) {
    var tx = db.transaction(['form_data'], 'readonly');
    var store = tx.objectStore('form_data');
    return store.getAll();
  })

  // Post data to server
  name
  .then(function(data) {
    formData.append('name', data['name']);

    var response = fetch('http://localhost:1337/reviews/', {
      method: 'POST',
      headers,
      body: formData
    });

    // If Post succeeds, delete data from IndexedDB
    response
    .then(function(){
        // Delete locally stored data after successful post to server
        idb.open('restaurant', 1).then(function(db) {
          const tx = db.transaction('form_data', 'readwrite');
          const store = tx.objectStore('form_data');
          store.clear();
        })
      })
    })


/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
