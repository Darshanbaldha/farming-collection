# Farming Collection

A farm-produce marketplace built with HTML, CSS, Bootstrap, vanilla JavaScript, Node.js, Express and MongoDB. The original website layout and image assets are retained and refined with a consistent responsive storefront design.

## Features

- Account registration and login with bcrypt password hashing.
- Server-side sessions persisted in MongoDB (`connect-mongo`).
- Protected Buy, Sell, Cart and Profile Setup pages; direct URL access requires login.
- One consistent navigation menu generated from the current server session.
- Home, Buy and Sell product carousels with page-based next/previous controls and a stationary decorative background.
- Farmer crop listings with crop name, description, price per kg, stock in kg, image upload and availability.
- Sellers can update listing price, stock and availability, or delete their own listings.
- Buyers can add catalogue products and farmer listings to a MongoDB-backed cart.
- Cart contents persist across logout/login. Quantity changes and removals are saved in MongoDB.
- Checkout creates a MongoDB order, reserves/decrements farmer listing stock, clears the cart and displays an order confirmation.
- Responsive cart layout with INR pricing and kilogram units.
- Redesigned Home page focused on the hero carousel, category discovery, benefits, testimonials, calls to action and recent articles (the About, Services and Products content is kept on its dedicated pages).
- A searchable Blog page with six farming articles and individual article detail pages.
- Required profile completion after signup, including name, mobile number, delivery address, farm address, city, state and PIN code.
- Farmer listings are categorized as vegetables, fruits, grains or other and are grouped accordingly on the Buy page.
- Standardized footer links across legacy pages, Bootstrap card layouts and lazy-loaded images.

> Checkout currently creates a demo order record and marks payment as pending. No payment gateway or real payment processing is connected.

## Requirements

- Node.js 18 or newer
- MongoDB local instance or MongoDB Atlas

## Setup and run

Requirements:
- Node.js 18 or newer (includes npm)
- MongoDB running locally, or a MongoDB Atlas connection string

1. Extract the project and open the `FarmingCollection` folder in VS Code or a terminal.
2. Copy `.env.example` and rename the copy to `.env`.
3. Set `MONGODB_URI` to your local MongoDB URL or MongoDB Atlas connection string.
4. Replace `SESSION_SECRET` with a long random secret. Generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. Install dependencies:

   ```bash
   npm install
   ```

6. Start the application:

   ```bash
   npm run dev
   ```

7. Open `http://localhost:3000`.

### Example local environment

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/farming_collection_text
SESSION_SECRET=replace-with-a-long-random-secret
```

MongoDB creates the `farming_collection_text` database and collections automatically when the application first writes data. If you prefer Docker for your local database, the included `docker-compose.yml` is optional; run `docker compose up -d mongodb` before `npm run dev`.

Do not commit your `.env` file or use a development session secret in production.

## Main project structure

```text
FarmingCollection/
├── controllers/
│   ├── auth.controller.js
│   ├── cart.controller.js
│   ├── contact.controller.js
│   ├── crop.controller.js
│   ├── listing.controller.js
│   └── userInfo.controller.js
├── database/
│   ├── connection.js
│   └── models/
│       ├── Account.js
│       ├── Cart.js
│       ├── Contact.js
│       ├── CropEntry.js
│       ├── Listing.js
│       ├── Order.js
│       └── UserInfo.js
├── middleware/
│   ├── auth.middleware.js
│   └── error.middleware.js
├── public/
│   ├── css/style.css
│   ├── img/
│   ├── js/main.js
│   ├── js/marketplace.js
│   ├── js/blog.js
│   ├── js/profile.js
│   ├── uploads/
│   ├── blog-detail.html
│   ├── profile-setup.html
│   └── *.html
├── routes/
│   ├── auth.routes.js
│   ├── cart.routes.js
│   ├── contact.routes.js
│   ├── crop.routes.js
│   ├── listing.routes.js
│   └── userInfo.routes.js
├── .env.example
├── package.json
└── server.js
```

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/signup` | Create an account and session |
| POST | `/api/login` | Verify credentials and create a session |
| GET | `/api/session` | Check the current session |
| POST | `/api/logout` | Destroy the session (cart remains saved) |
| GET | `/api/cart` | Read the signed-in user's cart |
| POST | `/api/cart/items` | Add a catalogue product or farmer listing |
| PATCH | `/api/cart/items/:itemId` | Update quantity in kg |
| DELETE | `/api/cart/items/:itemId` | Remove an item |
| POST | `/api/cart/checkout` | Create an order and clear the cart |
| GET | `/api/listings` | Get available farmer listings |
| GET | `/api/listings?mine=true` | Get the current seller's listings |
| POST | `/api/listings` | Publish a crop listing with an image |
| PATCH | `/api/listings/:id` | Update the seller's price, stock or availability |
| DELETE | `/api/listings/:id` | Delete the seller's listing |
| POST | `/api/contacts` | Save a contact message |
| POST | `/api/user-info` | Save user/farm information |
| GET | `/health` | Server health check |

All cart and listing routes require a valid server session. The HTML pages `/buy.html`, `/sell.html` and `/cart.html` are also protected on the server, not only hidden in the navigation.

## Image uploads

Crop images accept JPG, PNG or WEBP up to 5 MB. Files are saved under `public/uploads`. For deployment, use persistent disk storage or move uploads to object storage (for example S3 or Cloudinary); do not rely on ephemeral hosting filesystems.

## Data and security notes

- Passwords are stored as bcrypt hashes, never as plain text.
- Sessions are stored in MongoDB's `sessions` collection.
- Cart data is associated with the account record and is not deleted on logout.
- Orders preserve a snapshot of item name, price, quantity and totals at checkout.
- Farmer listing updates and deletes are restricted to the listing owner.
- Catalogue demo prices are currently supplied by the static Buy page. For a production store, move the full catalogue into MongoDB and calculate all prices exclusively on the server.
- The current checkout is a demo order flow; integrate a payment provider and verified payment webhooks before accepting real payments.

## Original SQL conversion

The supplied MySQL schema tables (`login_form`, `info_form`, `connect_form`, and `apple_form`) are represented by Mongoose models (`Account`, `UserInfo`, `Contact`, and `CropEntry`). Additional `Cart`, `Listing`, and `Order` collections support the marketplace functionality added later.


## Verification checklist

After setting up MongoDB and installing dependencies, verify the following in a browser:

1. Register an account, log in, and confirm the same navigation appears on Home, Buy, Sell and Cart.
2. Log out and try opening `/buy.html`, `/sell.html`, `/cart.html` and `/api/cart` directly; the pages should redirect to Login and the API should return HTTP 401.
3. Add a catalogue product, log out, log in again and confirm the item is still in the cart.
4. Complete the required profile after signup. Publish a crop listing with category, image, price per kg, quantity in kg and availability. Confirm it appears under the correct Fruits, Vegetables or Grains section on Buy.
5. Edit the listing price, stock and status; confirm the Buy page reflects the changes.
6. Add a farmer listing to the cart, adjust its quantity, and complete checkout. Confirm an Order document is created, available stock decreases and the database cart is empty.
7. Try the carousels at desktop, tablet and mobile widths; next/previous controls should move by a viewport page while the decorative background remains stationary.

JavaScript syntax, HTML parsing, local script paths, CSS parsing and ZIP integrity are checked for this delivery. A live end-to-end test still requires your own MongoDB connection and installed npm dependencies.


## Latest marketplace refinements
- Farmer listings are merged into the matching Vegetables, Fruits, or Grains category on the Buy page; there is no separate listings section.
- The Sell page shows only the signed-in farmer's own listings through the authenticated `mine=true` endpoint.
- Buy page now uses a farm-themed photographic banner matching the Sell page.
- Added a dedicated banana illustration and aligned product imagery for tomato, potato, apple, rice, and corn.
- Refined seller listing status, price, quantity, and action controls for desktop and mobile.
- Footer account links now reflect the current session.
- Checkout continues to create a demo order, clear the MongoDB cart, and show an Order Confirmed popup; no payment gateway is connected.


## Latest account and catalogue refinements

- Signup creates an authenticated session and sends new users to `profile-setup.html`.
- Saving the profile returns the user to the home page.
- Signed-in users with a completed profile can open `account.html` to view their saved contact and address details.
- The profile page reads data from `GET /api/user-info/me`; profile updates continue through `POST /api/user-info`.
- Product catalogue photos use a consistent set of generated WebP assets in `public/img/*-fresh.webp`.
- The Buy catalogue uses separate rice and wheat images, a matching image for each produce card, consistent Add to Cart buttons, and farm-themed category backgrounds.
- The homepage carousel uses updated farmer portraits with additional headroom so faces remain visible below the navigation.
