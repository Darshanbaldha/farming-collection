(() => {
  "use strict";

  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  const api = async (url, options = {}) => {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
    const type = response.headers.get("content-type") || "";
    const data = type.includes("application/json") ? await response.json() : { message: await response.text() };
    if (!response.ok) throw new Error(data.message || "The request could not be completed.");
    return data;
  };
  const popup = (message, title = "Farming Collection") => {
    if (window.FCUI?.showPopup) window.FCUI.showPopup(message, title);
    else window.alert(`${title}\n\n${message}`);
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const slug = (value) => String(value).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");


  // Render Bootstrap catalogue cards for the fixed product selection.
  const catalogRoots = { vegetables: document.getElementById("vegetable-catalog"), fruits: document.getElementById("fruit-catalog"), grains: document.getElementById("grain-catalog") };
  Object.entries(catalogRoots).forEach(([category, root]) => {
    if (!root) return;
    const products = window.FC_CATALOG?.[category] || [];
    root.innerHTML = products.map(([name, image, price]) => `<div class="col-6 col-md-4 col-xl-2"><article class="card h-100 border-0 shadow-sm fc-catalog-card"><div class="fc-catalog-image"><img src="/img/${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy"></div><div class="card-body text-center d-flex flex-column"><h3 class="h6">${escapeHtml(name)}</h3><p class="text-primary fw-bold mb-3">${money.format(price)} <small class="text-muted">/ kg</small></p><button type="button" class="btn btn-outline-primary btn-sm mt-auto fc-add-to-cart" data-product-key="${escapeHtml(slug(name))}">Add to Cart</button></div></article></div>`).join("");
  });

  // Product cards on Buy page add directly to the signed-in user's MongoDB cart.
  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".fc-add-to-cart");
    if (!button) return;
    const card = button.closest(".product-item, .fc-catalog-card");
    const name = card?.querySelector("h6, h3")?.textContent?.trim();
    const priceText = card?.querySelector("h5")?.textContent || "";
    const selectedKey = button.dataset.productKey || slug(name || "");
    const priceFromCatalog = Object.values(window.FC_CATALOG || {}).flat().find((item) => slug(item[0]) === selectedKey)?.[2];
    const pricePerKg = Number(priceFromCatalog || priceText.replace(/[^0-9.]/g, ""));
    const imageUrl = card?.querySelector("img")?.getAttribute("src") || "/img/tomato-fresh.webp";
    if (!name || !Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      popup("This product does not have valid pricing information.", "Unable to Add Product");
      return;
    }
    button.disabled = true;
    try {
      await api("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey: selectedKey, name, pricePerKg, imageUrl }),
      });
      popup(`${name} has been added to your cart.`, "Added to Cart");
    } catch (error) { popup(error.message, "Unable to Add Product"); }
    finally { button.disabled = false; }
  });

  // A crop listing form: crop name, price/kg, stock in kg, image and availability.
  function openListingDialog(defaultCrop = "") {
    let dialog = document.getElementById("fc-listing-dialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "fc-listing-dialog";
      dialog.className = "fc-listing-dialog";
      dialog.innerHTML = `
        <form id="fc-listing-form" class="fc-listing-form" enctype="multipart/form-data">
          <div class="fc-listing-dialog-head"><div><span class="fc-eyebrow">SELL YOUR HARVEST</span><h2>Publish a crop listing</h2><p>Share fresh produce with customers in your area.</p></div><button type="button" class="fc-dialog-close" aria-label="Close">&times;</button></div>
          <label>Crop name <input class="form-control" name="cropName" maxlength="80" required placeholder="e.g. Fresh tomatoes"></label>
          <label>Category <select class="form-select" name="category" required><option value="vegetables">Vegetables</option><option value="fruits">Fruits</option><option value="grains">Crops &amp; Grains</option></select></label>
          <label>Description <textarea class="form-control" name="description" rows="3" maxlength="1000" placeholder="Quality, variety, harvest date or other details"></textarea></label>
          <div class="fc-form-grid"><label>Price per kg (₹)<input class="form-control" type="number" name="pricePerKg" min="0.01" step="0.01" required placeholder="e.g. 35"></label><label>Available quantity (kg)<input class="form-control" type="number" name="quantityKg" min="0.25" step="0.25" required placeholder="e.g. 100"></label></div>
          <label>Crop image <input class="form-control" type="file" name="image" accept="image/jpeg,image/png,image/webp" required><small>JPG, PNG or WEBP · Maximum 5 MB</small></label>
          <label>Availability <select class="form-select" name="availability"><option value="available">Available</option><option value="limited">Limited stock</option><option value="sold_out">Sold out</option></select></label>
          <div class="fc-listing-form-actions"><button type="button" class="btn btn-outline-secondary fc-dialog-cancel">Cancel</button><button type="submit" class="btn btn-primary">Publish listing</button></div>
          <p class="fc-form-error" role="alert" hidden></p>
        </form>`;
      document.body.append(dialog);
      dialog.querySelectorAll(".fc-dialog-close, .fc-dialog-cancel").forEach((button) => button.addEventListener("click", () => dialog.close()));
      dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
      dialog.querySelector("form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector('[type="submit"]');
        const errorBox = form.querySelector(".fc-form-error");
        errorBox.hidden = true;
        submit.disabled = true;
        submit.textContent = "Publishing...";
        try {
          const data = await api("/api/listings", { method: "POST", body: new FormData(form) });
          dialog.close();
          form.reset();
          popup(data.message || "Your crop listing is now published.", "Listing Published");
          await loadMyListings();
        } catch (error) {
          errorBox.textContent = error.message;
          errorBox.hidden = false;
        } finally {
          submit.disabled = false;
          submit.textContent = "Publish listing";
        }
      });
    }
    const form = dialog.querySelector("form");
    form.reset();
    form.elements.cropName.value = defaultCrop;
    const cropKey = String(defaultCrop).trim().toLowerCase();
    const fruitNames = ["apple", "banana", "grapes", "grape", "kiwi", "pear", "dragon fruit", "mango", "orange", "papaya"];
    const vegetableNames = ["tomato", "potato", "onion", "cabbage", "capsicum", "lemon", "carrot", "cucumber"];
    form.elements.category.value = fruitNames.includes(cropKey)
      ? "fruits"
      : vegetableNames.includes(cropKey)
        ? "vegetables"
        : "grains";
    form.querySelector(".fc-form-error").hidden = true;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else popup("Your browser does not support the listing form dialog. Please use a recent browser.", "Browser Not Supported");
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".fc-sell-crop");
    if (!button) return;
    const name = button.dataset.cropName
      || button.closest(".product-item, .fc-sell-product-card")?.querySelector("h6, h3")?.textContent?.trim()
      || "";
    openListingDialog(name);
  });

  // Match missing listing photos to a consistent produce image.
  function fallbackCropImage(cropName) {
    const name = String(cropName || "").toLowerCase();
    const images = {
      tomato: "tomato-fresh.webp", potato: "potato-fresh.webp", apple: "apple-fresh.webp",
      banana: "banana-fresh.webp", rice: "rice-fresh.webp", wheat: "wheat-fresh.webp",
      corn: "corn-fresh.webp", capsicum: "capsicum-fresh.webp", onion: "onion-fresh.webp",
      cabbage: "cabbage-fresh.webp", lemon: "lemon-fresh.webp", grapes: "grapes-fresh.webp",
      kiwi: "kiwi-fresh.webp", pear: "pear-fresh.webp", "dragon fruit": "dragon-fruit-fresh.webp",
    };
    const match = Object.keys(images).find((key) => name.includes(key));
    return `/img/${images[match] || "tomato-fresh.webp"}`;
  }

  // Buy page: merge all available farmer listings into the matching product category.
  async function loadMarketplaceListings() {
    const roots = {
      vegetables: document.getElementById("vegetable-catalog"),
      fruits: document.getElementById("fruit-catalog"),
      grains: document.getElementById("grain-catalog"),
    };
    if (!Object.values(roots).some(Boolean)) return;
    const classify = (item) => {
      if (["vegetables", "fruits", "grains"].includes(item.category)) return item.category;
      const name = String(item.cropName || "").trim().toLowerCase();
      if (["apple", "apples", "banana", "bananas", "grape", "grapes", "kiwi", "pear", "dragon fruit", "orange", "mango", "papaya", "pomegranate", "watermelon", "guava", "pineapple"].includes(name)) return "fruits";
      if (["tomato", "tomatoes", "potato", "potatoes", "onion", "cabbage", "capsicum", "lemon", "limbu", "carrot", "cucumber", "brinjal", "cauliflower", "okra", "spinach"].includes(name)) return "vegetables";
      return "grains";
    };
    try {
      const { listings } = await api("/api/listings");
      listings.forEach((item) => {
        const root = roots[classify(item)];
        if (!root) return;
        const card = document.createElement("div");
        card.className = "col-6 col-md-4 col-xl-2";
        card.innerHTML = `
          <article class="card h-100 border-0 shadow-sm fc-catalog-card fc-farmer-catalog-card">
            <div class="fc-catalog-image"><img src="${escapeHtml(item.imageUrl || fallbackCropImage(item.cropName))}" alt="${escapeHtml(item.cropName)}" loading="lazy"></div>
            <div class="card-body text-center d-flex flex-column">
              <h3 class="h6">${escapeHtml(item.cropName)}</h3>
              <p class="text-primary fw-bold mb-2">${money.format(Number(item.pricePerKg))} <small class="text-muted">/ kg</small></p>
              <small class="text-muted mb-3">${Number(item.quantityKg).toLocaleString("en-IN")} kg available</small>
              <button type="button" class="btn btn-primary btn-sm mt-auto fc-add-listing" data-listing-id="${escapeHtml(item._id)}">Add to Cart</button>
            </div>
          </article>`;
        root.append(card);
      });
    } catch (error) {
      Object.values(roots).filter(Boolean).forEach((root) => {
        const message = document.createElement("div");
        message.className = "col-12";
        message.innerHTML = `<p class="fc-inline-error">${escapeHtml(error.message)}</p>`;
        root.append(message);
      });
    }
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest(".fc-add-listing");
    if (!button) return;
    button.disabled = true;
    try {
      await api("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: button.dataset.listingId }) });
      popup("This farmer's crop has been added to your cart.", "Added to Cart");
    } catch (error) { popup(error.message, "Unable to Add Product"); }
    finally { button.disabled = false; }
  });

  // Sell page: seller can view, update stock/status and remove their own listings.
  async function loadMyListings() {
    const root = document.getElementById("my-listings");
    if (!root) return;

    try {
      const { listings } = await api("/api/listings?mine=true");
      if (!listings.length) {
        root.innerHTML = '<div class="fc-no-listings"><i class="bi bi-basket"></i><h3>You have not published any crops yet</h3><p>Choose a crop category above and publish your first listing.</p></div>';
        return;
      }

      const categories = [
        { key: "vegetables", title: "My Vegetables", icon: "bi-flower1" },
        { key: "fruits", title: "My Fruits", icon: "bi-apple" },
        { key: "grains", title: "My Crops & Grains", icon: "bi-wheat" },
      ];
      const categoryFor = (item) => item.category === "fruits"
        ? "fruits"
        : item.category === "vegetables"
          ? "vegetables"
          : "grains";

      root.innerHTML = categories.map((category) => {
        const grouped = listings.filter((item) => categoryFor(item) === category.key);
        if (!grouped.length) return "";

        const cards = grouped.map((item) => `
          <article class="fc-own-listing">
            <img src="${escapeHtml(item.imageUrl || fallbackCropImage(item.cropName))}" alt="${escapeHtml(item.cropName)}" loading="lazy">
            <div class="fc-own-listing-info">
              <h3>${escapeHtml(item.cropName)}</h3>
              <span class="fc-stock-badge ${escapeHtml(item.availability)}">${escapeHtml(item.availability.replace("_", " "))}</span>
              <small>${money.format(Number(item.pricePerKg))} / kg · ${Number(item.quantityKg).toLocaleString("en-IN")} kg</small>
            </div>
            <div class="fc-own-listing-actions">
              <label>Price / kg (₹)<input class="form-control form-control-sm fc-edit-price" type="number" min="0.01" step="0.01" value="${Number(item.pricePerKg)}" aria-label="Price per kilogram"></label>
              <label>Stock (kg)<input class="form-control form-control-sm fc-edit-quantity" type="number" min="0.25" step="0.25" value="${Number(item.quantityKg)}" aria-label="Available stock in kilograms"></label>
              <label>Category<select class="form-select form-select-sm fc-edit-category" aria-label="Listing category">
                <option value="vegetables" ${item.category === "vegetables" ? "selected" : ""}>Vegetables</option>
                <option value="fruits" ${item.category === "fruits" ? "selected" : ""}>Fruits</option>
                <option value="grains" ${categoryFor(item) === "grains" ? "selected" : ""}>Crops &amp; Grains</option>
              </select></label>
              <label>Status<select class="form-select form-select-sm fc-edit-status" aria-label="Listing availability">
                <option value="available" ${item.availability === "available" ? "selected" : ""}>Available</option>
                <option value="limited" ${item.availability === "limited" ? "selected" : ""}>Limited</option>
                <option value="sold_out" ${item.availability === "sold_out" ? "selected" : ""}>Sold out</option>
              </select></label>
              <button class="btn btn-primary btn-sm fc-save-listing" data-id="${escapeHtml(item._id)}">Save</button>
              <button class="btn btn-outline-danger btn-sm fc-delete-listing" data-id="${escapeHtml(item._id)}">Delete</button>
            </div>
          </article>`).join("");

        return `<section class="fc-own-listing-group mb-4">
          <h3 class="h4 mb-3"><i class="bi ${category.icon} me-2" aria-hidden="true"></i>${category.title} <span class="fc-listing-count">${grouped.length}</span></h3>
          <div class="fc-own-listing-grid">${cards}</div>
        </section>`;
      }).join("");
    } catch (error) {
      root.innerHTML = `<p class="fc-inline-error">${escapeHtml(error.message)}</p>`;
    }
  }

  document.addEventListener("click", async (event) => {
    const save = event.target.closest(".fc-save-listing");
    const remove = event.target.closest(".fc-delete-listing");
    if (!save && !remove) return;
    const button = save || remove;
    const card = button.closest(".fc-own-listing");
    button.disabled = true;
    try {
      if (save) {
        const pricePerKg = Number(card.querySelector(".fc-edit-price").value);
        const quantityKg = Number(card.querySelector(".fc-edit-quantity").value);
        const availability = card.querySelector(".fc-edit-status").value;
        const category = card.querySelector(".fc-edit-category").value;
        await api(`/api/listings/${encodeURIComponent(save.dataset.id)}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pricePerKg, quantityKg, availability, category }),
        });
        popup("Your crop price, available stock and status have been updated.", "Listing Updated");
      } else {
        if (!window.confirm("Delete this crop listing? This action cannot be undone.")) return;
        await api(`/api/listings/${encodeURIComponent(remove.dataset.id)}`, { method: "DELETE" });
        popup("Your crop listing has been deleted.", "Listing Deleted");
      }
      await loadMyListings();
    } catch (error) { popup(error.message, "Unable to Update Listing"); }
    finally { button.disabled = false; }
  });

  // Cart: load, update and remove items from MongoDB (never localStorage).
  const cartRoot = document.querySelector(".cart-page");
  if (cartRoot) {
    const cartList = cartRoot.querySelector(".cart-product-list");
    const formatMoney = (value) => money.format(Number(value) || 0);
    let currentItems = [];

    const totals = () => {
      const subtotal = currentItems.reduce((sum, item) => sum + Number(item.pricePerKg) * Number(item.quantityKg), 0);
      const tax = subtotal * 0.05;
      const delivery = subtotal > 0 ? 15 : 0;
      document.getElementById("cart-subtotal").textContent = formatMoney(subtotal);
      document.getElementById("cart-tax").textContent = formatMoney(tax);
      document.getElementById("cart-shipping").textContent = formatMoney(delivery);
      document.getElementById("cart-total").textContent = formatMoney(subtotal + tax + delivery);
      const checkout = cartRoot.querySelector(".checkout");
      if (checkout) checkout.disabled = currentItems.length === 0;
    };

    const renderCart = () => {
      cartList.replaceChildren();
      if (!currentItems.length) {
        cartList.innerHTML = `<div class="cart-empty-state"><div class="cart-empty-icon"><i class="bi bi-basket3"></i></div><h2>Your basket is ready for fresh produce</h2><p>Your saved cart will stay here when you sign out. Add products to continue.</p><a class="btn btn-primary px-4 py-3" href="/buy.html">Explore Products</a></div>`;
      } else {
        currentItems.forEach((item) => {
          const row = document.createElement("article");
          row.className = "cart-product-row";
          row.innerHTML = `
            <div class="cart-product-main"><img class="cart-product-image" src="${escapeHtml(item.imageUrl || "/img/tomato-fresh.webp")}" alt="${escapeHtml(item.name)}"><div class="cart-product-details"><h3 class="cart-product-title">${escapeHtml(item.name)}</h3><p class="cart-product-description">Fresh farm produce · Price per kilogram</p></div></div>
            <div class="cart-product-price" data-label="Price">${formatMoney(item.pricePerKg)} / kg</div>
            <label class="cart-product-quantity" data-label="Quantity"><input type="number" min="0.25" step="0.25" value="${Number(item.quantityKg)}" data-item-id="${escapeHtml(item._id)}" aria-label="Quantity in kilograms for ${escapeHtml(item.name)}"><span>kg</span></label>
            <div class="cart-product-line-total" data-label="Item total">${formatMoney(Number(item.pricePerKg) * Number(item.quantityKg))}</div>
            <button type="button" class="cart-remove-button" data-remove-id="${escapeHtml(item._id)}"><i class="bi bi-trash3" aria-hidden="true"></i><span>Remove</span></button>`;
          cartList.append(row);
        });
      }
      totals();
    };

    const refreshCart = async () => {
      const data = await api("/api/cart");
      currentItems = Array.isArray(data.items) ? data.items : [];
      renderCart();
    };

    cartRoot.addEventListener("change", async (event) => {
      const input = event.target.closest("[data-item-id]");
      if (!input) return;
      const quantityKg = Number(input.value);
      if (!Number.isFinite(quantityKg) || quantityKg < 0.25) {
        popup("Enter a quantity of at least 0.25 kg.", "Invalid Quantity");
        await refreshCart();
        return;
      }
      input.disabled = true;
      try {
        await api(`/api/cart/items/${encodeURIComponent(input.dataset.itemId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantityKg }) });
        await refreshCart();
      } catch (error) { popup(error.message, "Unable to Update Cart"); await refreshCart(); }
    });

    cartRoot.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-remove-id]");
      if (!button) return;
      button.disabled = true;
      try {
        await api(`/api/cart/items/${encodeURIComponent(button.dataset.removeId)}`, { method: "DELETE" });
        await refreshCart();
        popup("The product has been removed from your basket.", "Item Removed");
      } catch (error) { popup(error.message, "Unable to Remove Item"); }
    });

    cartRoot.querySelector(".checkout")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      if (!currentItems.length) return popup("Your cart is empty. Add products before checkout.", "Empty Cart");
      button.disabled = true;
      button.textContent = "Placing order...";
      try {
        const data = await api("/api/cart/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

        // The server has saved the order and cleared the database cart.
        // Update the page immediately so the customer sees an empty basket.
        currentItems = [];
        renderCart();

        popup(
          `Your order has been placed successfully!\\n\\nOrder number: ${data.order.orderNumber}\\nOrder total: ${formatMoney(data.order.total)}\\n\\nYour cart is now empty. No online payment was taken.`,
          "Order Placed Successfully"
        );
      } catch (error) { popup(error.message, "Checkout Failed"); }
      finally { button.disabled = currentItems.length === 0; button.innerHTML = '<i class="bi bi-shield-check me-2" aria-hidden="true"></i>Checkout'; }
    });

    refreshCart().catch((error) => {
      cartList.innerHTML = `<div class="fc-inline-error">${escapeHtml(error.message)}</div>`;
      totals();
    });
  }

  loadMarketplaceListings();
  loadMyListings();
})();
