"use strict";

// State
let currentCompanyDomain = "";

// DOM refs
const input = document.getElementById("companyInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");
const favoritesContainer = document.getElementById("favorites");
const modalOverlay = document.getElementById("modalOverlay");
const reviewsList = document.getElementById("reviewsList");
const reviewsEmpty = document.getElementById("reviewsEmpty");
const closeModal = document.getElementById("closeModal");
const spinner = document.getElementById("spinner");
const resultsCount = document.getElementById("resultsCount");
const main = document.querySelector("main");

const API_OPTIONS = {
  method: "GET",
  headers: {
    "x-rapidapi-host": "trustpilot-company-and-reviews-data.p.rapidapi.com",
    "x-rapidapi-key": "86d4481681msh3c6b1a35c12579cp1a712djsn3be74ecbe3ba",
  },
};

function starString(rating) {
  const r = Math.round(rating);
  return "★★★★★☆☆☆☆☆".slice(5 - r, 10 - r);
}

function renderCard({ name, rating, reviewCount, showFavBtn }) {
  return `
    <div class="company-card" data-domain="">
      <div class="card-header">
        <h3 class="company-name">${name}</h3>
        ${showFavBtn ? '<button class="favorite-btn" title="Save to favorites">★</button>' : ""}
      </div>
      <div class="card-body">
        <div class="rating">
          <span class="stars">${starString(rating)}</span>
          <span class="score">${rating} / 5</span>
        </div>
        <p class="review-count">${reviewCount.toLocaleString()} reviews</p>
      </div>
    </div>`;
}

function renderFavoriteCard(data) {
  const html = renderCard({ ...data, showFavBtn: false });
  favoritesContainer.insertAdjacentHTML("beforeend", html);
}

function showSpinner() {
  spinner.classList.remove("hidden");
}

function hideSpinner() {
  spinner.classList.add("hidden");
}

function openModal() {
  modalOverlay.classList.remove("hidden");
  requestAnimationFrame(() => modalOverlay.classList.add("visible"));
  main.classList.add("blur");
}

function closeModalFn() {
  modalOverlay.classList.remove("visible");
  main.classList.remove("blur");
  setTimeout(() => modalOverlay.classList.add("hidden"), 250);
}

closeModal.addEventListener("click", closeModalFn);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModalFn();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
    closeModalFn();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const stored = JSON.parse(localStorage.getItem("favorites")) || [];
  stored.forEach((fav) => renderFavoriteCard(fav));
});

searchBtn.addEventListener("click", async () => {
  const query = input.value.trim();
  input.value = "";
  if (!query) return alert("Please enter a company name");

  showSpinner();

  try {
    const res = await fetch(
      `https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-search?query=${encodeURIComponent(query)}`,
      API_OPTIONS
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    hideSpinner();

    const companies = data.data?.companies;
    if (!companies || companies.length === 0) {
      resultsContainer.innerHTML = "";
      resultsCount.textContent = "No results found";
      return;
    }

    resultsContainer.innerHTML = "";
    resultsCount.textContent = `${companies.length} result${companies.length > 1 ? "s" : ""}`;

    companies.forEach((company) => {
      const domain = company.domain || "";
      const html = renderCard({
        name: company.name,
        rating: company.trust_score,
        reviewCount: company.review_count,
        showFavBtn: true,
      });
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      const card = wrapper.firstElementChild;
      card.dataset.domain = domain;
      resultsContainer.appendChild(card);
    });
  } catch (err) {
    hideSpinner();
    resultsContainer.innerHTML =
      '<p style="text-align:center;color:#ef4444;grid-column:1/-1;padding:2rem 0;">Something went wrong. Please try again.</p>';
    resultsCount.textContent = "";
    console.error(err);
  }
});

// Event delegation on results container
resultsContainer.addEventListener("click", (e) => {
  const card = e.target.closest(".company-card");
  if (!card) return;

  if (e.target.closest(".favorite-btn")) {
    const name = card.querySelector(".company-name").textContent;
    const scoreEl = card.querySelector(".score");
    const countEl = card.querySelector(".review-count");
    const rating = parseFloat(scoreEl.textContent);
    const reviewCount = parseInt(countEl.textContent.replace(/,/g, ""));

    const favData = { name, rating, reviewCount };
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    if (favorites.some((f) => f.name === name)) return;
    favorites.push(favData);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavoriteCard(favData);
    e.target.classList.add("active");
    return;
  }

  // Open reviews
  const domain = card.dataset.domain;
  if (!domain) return;
  currentCompanyDomain = domain;
  fetchAndShowReviews(domain);
});

async function fetchAndShowReviews(domain) {
  showSpinner();

  try {
    const res = await fetch(
      `https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-reviews?company_domain=${domain}`,
      API_OPTIONS
    );
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    hideSpinner();

    const reviews = data.data?.reviews || [];
    reviewsList.innerHTML = "";
    reviewsEmpty.classList.add("hidden");

    if (reviews.length === 0) {
      reviewsEmpty.classList.remove("hidden");
    } else {
      reviews.forEach((review) => {
        const rating = review.review_rating || 0;
        const text = review.review_title || "No comment";
        const div = document.createElement("div");
        div.className = "review-card";
        div.innerHTML = `
          <div class="review-rating">${starString(rating)}</div>
          <p class="review-comment">${text}</p>`;
        reviewsList.appendChild(div);
      });
    }

    openModal();
  } catch (err) {
    hideSpinner();
    console.error(err);
    reviewsList.innerHTML =
      '<p style="color:#ef4444;">Failed to load reviews.</p>';
    openModal();
  }
}
