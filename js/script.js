"use strict";

// Selecting elements
const inputCompanyName = document.getElementById("companyInput");
const searchBtn = document.getElementById("searchBtn");
const cardsContainer = document.querySelector(".cards-container");
console.log(cardsContainer);
// Clearing Card container
cardsContainer.innerHTML = "";

document.addEventListener("DOMContentLoaded", function () {
  const storedFavorites = JSON.parse(localStorage.getItem("favorites")) || [];
  storedFavorites.forEach((fav) => renderFavoriteCard(fav));
});

function renderFavoriteCard(favData) {
  const favoritesContainer = document.querySelector("#favorites");
  const { name, rating, reviewCount } = favData;

  let starRating = "★☆☆☆☆".slice(5 - Math.round(rating)) + "☆☆☆☆".slice(Math.round(rating));
  if (Math.round(rating) === 1) {
    starRating = "★☆☆☆☆";
  }
  if (Math.round(rating) === 2) {
    starRating = "★★☆☆☆";
  }
  if (Math.round(rating) === 3) {
    starRating = "★★★☆☆";
  }
  if (Math.round(rating) === 4) {
    starRating = "★★★★☆";
  }
  if (Math.round(rating) === 5) {
    starRating = "★★★★★";
  }

  const html = `
    <div class="company-card">
      <div class="card-header">
        <h2 class='company-name'>${name}</h2>
      </div>
      <div class="card-body">
        <div class="rating">
          <span class="stars">${starRating}</span>
          <span class="score">${rating} / 5</span>
        </div>
        <p>Reviews: ${reviewCount}</p>
      </div>
    </div>
  `;

  favoritesContainer.insertAdjacentHTML("beforeend", html);
}
///////////////////////////////////////
searchBtn.addEventListener("click", function () {
  const companyNameInput = inputCompanyName.value.trim().toLowerCase();
  inputCompanyName.value = "";
  // Guard clause
  if (!companyNameInput) return alert("Please input a company");
  // Fetching the company's data
  const options = {
    method: "GET",
    headers: {
      "x-rapidapi-host": "trustpilot-company-and-reviews-data.p.rapidapi.com",
      "x-rapidapi-key": "86d4481681msh3c6b1a35c12579cp1a712djsn3be74ecbe3ba",
    },
  };

  const getCompany = async function () {
    const companyInfo = await fetch(
      `https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-search?query=${companyNameInput}`,
      options
    );
    console.log(companyInfo);
    const companyData = await companyInfo.json();
    console.log(companyData);
    console.log(companyData.data.companies[0]);

    const companyName = companyData.data.companies[0].name;
    const rating = companyData.data.companies[0].trust_score;
    const reviewCount = companyData.data.companies[0].review_count;
    const companyDomain = companyData.data.companies[0].domain;
    console.log(companyDomain);

    let starRating = "";
    if (Math.round(rating) === 1) {
      starRating = "★☆☆☆☆";
    }
    if (Math.round(rating) === 2) {
      starRating = "★★☆☆☆";
    }
    if (Math.round(rating) === 3) {
      starRating = "★★★☆☆";
    }
    if (Math.round(rating) === 4) {
      starRating = "★★★★☆";
    }
    if (Math.round(rating) === 5) {
      starRating = "★★★★★";
    }

    const html = ` <div class="company-card">
  <div class="card-header">
    <h2 class='company-name'>${companyName}</h2>
    <button class="favorite-btn">★</button>
  </div>
  <div class="card-body">
    <div class="rating">
      <span class="stars">${starRating}</span>
      <span class="score">${rating} / 5</span>
    </div>
    <p>Reviews: ${reviewCount}</p>
  </div>
</div>`;
    cardsContainer.insertAdjacentHTML("afterbegin", html);
    const favoriteBtn = document.querySelector(".favorite-btn");
    favoriteBtn.addEventListener("click", function (e) {
      e.stopPropagation();
    
      const favoriteData = {
        name: companyName,
        rating: rating,
        reviewCount: reviewCount,
      };
    
      let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
      const isDuplicate = favorites.some((fav) => fav.name === companyName);
      if (isDuplicate) return;
    
      favorites.push(favoriteData);
      localStorage.setItem("favorites", JSON.stringify(favorites));
    
      renderFavoriteCard(favoriteData);
    });

    // Get company name on click
    const companyCard = document.querySelector(".company-card");
    companyCard.addEventListener("click", function () {
      const company = companyCard.querySelector(".company-name").textContent;
      console.log(company);
      // get company review
      const fetchReviews = async function () {
        const getReviews = await fetch(
          `https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-reviews?company_domain=${companyDomain}`,
          options
        );
        console.log(getReviews);
        const reviewsData = await getReviews.json();
        console.log(reviewsData.data.reviews);
        const reviewsContainer = document.querySelector(".reviews-container");
        const main = document.querySelector("main");
        main.classList.add("blur");
        reviewsContainer.innerHTML = `<h3 >Reviews <button class="close-button">X</button></h3>`;
        reviewsContainer.classList.remove("hidden");
        reviewsData.data.reviews.forEach((review) => {
          const reviewText = review.review_title;
          const reviewRating = review.review_rating;
          let reviewRatingInsert = "";
          if (Math.round(reviewRating) === 1) {
            reviewRatingInsert = "★☆☆☆☆";
          }
          if (Math.round(reviewRating) === 2) {
            reviewRatingInsert = "★★☆☆☆";
          }
          if (Math.round(reviewRating) === 3) {
            reviewRatingInsert = "★★★☆☆";
          }
          if (Math.round(reviewRating) === 4) {
            reviewRatingInsert = "★★★★☆";
          }
          if (Math.round(reviewRating) === 5) {
            reviewRatingInsert = "★★★★★";
          }

          reviewsContainer.insertAdjacentHTML(
            "beforeend",
            `
            <div class="review-card">
    <div class="review-rating">${reviewRatingInsert}</div>
    <p class="review-comment">${reviewText}</p>
  </div>
            
            `
          );
        });
        const closeReview = document.querySelector(".close-button");
        closeReview.addEventListener("click", function () {
          reviewsContainer.classList.add("hidden");
          main.classList.remove("blur");
        });
      };
      fetchReviews();
    });
  };
  getCompany();
});

("https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-reviews?company_domain=gossby.com");
