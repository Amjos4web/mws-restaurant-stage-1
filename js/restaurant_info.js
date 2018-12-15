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
let newMap;

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
    console.log(error);
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
      console.log(error);
      return;
    }
    fillRestaurantHTML();
    callback(null, restaurant)
  });
}
}

/**
* Create all reviews HTML and add them to the webpage.
*/
fillReviewsHTML = () => {
const container = document.getElementById('reviews-container');
const title = document.createElement('h2');
title.innerHTML = 'Reviews';
container.appendChild(title);
DBHelper.fetchReviewsFromServer(self.restaurant.id)
.then(reviews => {
  console.log(reviews);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    noReviews.setAttribute('aria-label', 'No reviews yet');
    container.appendChild(noReviews);
  
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.reverse().forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}).catch(error =>{
  console.log("Error has occured", error);
});

}

/**
* Create restaurant HTML and add it to the webpage
*/
fillRestaurantHTML = (restaurant = self.restaurant) => {
const name = document.getElementById('restaurant-name');
name.innerHTML = restaurant.name;
name.setAttribute('aria-label', `${restaurant.name}`);

const address = document.getElementById('restaurant-address');
address.innerHTML = restaurant.address;
address.setAttribute('aria-label', `${restaurant.address}`);


const image = document.getElementById('restaurant-img');
image.setAttribute('alt', `Image of ${restaurant.name} Restaurant`);
image.className = 'restaurant-img'
image.src = DBHelper.imageUrlForRestaurant(restaurant);

const cuisine = document.getElementById('restaurant-cuisine');
cuisine.innerHTML = restaurant.cuisine_type;
cuisine.setAttribute('aria-label', `${restaurant.cuisine_type}`);
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
  row.setAttribute('aria-label', `${operatingHours[key]}`);
  const day = document.createElement('td');
  day.innerHTML = key;
  day.setAttribute('aria-label', `${day.innerHTML}`);
  row.appendChild(day);

  const time = document.createElement('td');
  time.innerHTML = operatingHours[key];
  row.appendChild(time);

  hours.appendChild(row);
}
}

/**
* Create review HTML and add it to the webpage.
*/
createReviewHTML = (review) => {
const li = document.createElement('li');
li.setAttribute('aria-label', 'Reviews');
const name = document.createElement('p');
name.innerHTML = review.name;
name.setAttribute('aria-label', `${review.name}`);
li.appendChild(name);

const date = document.createElement('p');
date.innerHTML = review.createdAt;
date.setAttribute('aria-label', `${review.createdAt}`);
li.appendChild(date);

const rating = document.createElement('p');
rating.innerHTML = `Rating: ${review.rating}`;
rating.setAttribute('aria-label', `Rating: ${review.rating}`);
li.appendChild(rating);

const comments = document.createElement('p');
comments.innerHTML = review.comments;
comments.setAttribute('aria-label', `${review.comments}`);
li.appendChild(comments);

return li;
}

// Add Review 

const form = document.querySelector('form');
form.addEventListener('submit', event => {
  event.preventDefault();

  // Getting the data from the review form
  let formData = new FormData(form);
    let postedReview = {
        "restaurant_id": self.restaurant.id,
        "name": formData.get('name'),
        "rating": formData.get('rating'),
        "comments": formData.get('comments'),
        "createdAt": new Date()
  };

  console.log(postedReview);

  if (postedReview.reviewAuthor === undefined && postedReview.reviewComment === undefined){
    return alert("Please add your review");
  }
  fetch('http://localhost:1337/reviews', { 
    method: 'post', 
    headers: { "Content-type": "application/json; charset=UTF-8" }, 
    body: JSON.stringify(postedReview) 
  }) 
  .then(() => { 
    fillReviewsHTML();
  }).catch(
    // post data to database.
    dbPromise
    .then(dbObj => {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      store.put(postedReview);
      console.log('Review Posted to database successfully');
    }).catch(error => {
      callback(null, error);
    })
  );
});


// Check if there's network and send the review
window.addEventListener('message', event => {
 DBHelper.fetchAllReviewsFromDB().then((reviews) => {
  // Post data to server
  reviews
  .then(() => {
  
    fetch('http://localhost:1337/reviews', { 
      method: 'post', 
      headers: { "Content-type": "application/json; charset=UTF-8" }, 
      body: JSON.stringify(reviews) 
   }) 
   
    // If Post succeeds, delete data from IndexedDB
    response
    .then((review) => {
        // Delete locally stored data after successful post to server
        dbPromise.then(dbObj => {
          const tx = db.transaction('reviews', 'readwrite');
          const store = tx.objectStore('reviews');
          store.delete(review.id);
        });
      });
    });
 });
});



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
const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`);
const results = regex.exec(url);
if (!results)
  return null;
if (!results[2])
  return '';
return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

