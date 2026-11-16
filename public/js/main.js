(() => {
  "use strict";

  const navbar = document.querySelector(".navbar");
  document.querySelectorAll("body > .container-fluid.d-none.d-lg-block").forEach((brandStrip) => {
    if (brandStrip.querySelector(".navbar-brand")) brandStrip.remove();
  });
  const backToTop = document.querySelector(".back-to-top");

  const onScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    navbar?.classList.toggle("sticky-top", scrollTop > 40);
    if (backToTop) {
      backToTop.classList.toggle("d-none", scrollTop <= 100);
      backToTop.style.opacity = scrollTop > 100 ? "1" : "0";
      backToTop.style.pointerEvents = scrollTop > 100 ? "auto" : "none";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  backToTop?.addEventListener("click", (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Desktop hover for Bootstrap dropdowns, retaining click/touch behavior on small screens.
  const desktop = window.matchMedia("(min-width: 992px)");
  const configureDropdowns = () => {
    document.querySelectorAll(".navbar .dropdown").forEach((item) => {
      item.onmouseenter = desktop.matches ? () => {
        const toggle = item.querySelector('[data-bs-toggle="dropdown"]');
        if (toggle && window.bootstrap?.Dropdown) window.bootstrap.Dropdown.getOrCreateInstance(toggle).show();
      } : null;
      item.onmouseleave = desktop.matches ? () => {
        const toggle = item.querySelector('[data-bs-toggle="dropdown"]');
        if (toggle && window.bootstrap?.Dropdown) window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
      } : null;
    });
  };
  configureDropdowns();
  desktop.addEventListener?.("change", configureDropdowns);

  // Counter animation using IntersectionObserver.
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const node = entry.target;
      const target = Number((node.textContent || "").replace(/[^\d.-]/g, ""));
      if (!Number.isFinite(target)) return observer.unobserve(node);
      const startTime = performance.now();
      const duration = 2000;
      const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = Math.round(target * eased).toLocaleString();
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.unobserve(node);
    });
  }, { threshold: 0.35 });
  document.querySelectorAll("[data-toggle='counter-up'], [data-counter]").forEach((node) => counterObserver.observe(node));

  // Native horizontal carousel replacement for Owl Carousel.
  document.querySelectorAll(".js-carousel, .product-carousel, .testimonial-carousel").forEach((carousel) => {
    if (carousel.dataset.carouselReady === "true") return;
    const slides = Array.from(carousel.children).filter((node) => node.nodeType === 1);
    if (slides.length < 2) return;
    carousel.dataset.carouselReady = "true";
    carousel.classList.add("fc-carousel-track");
    slides.forEach((slide) => slide.classList.add("fc-carousel-slide"));

    const controls = document.createElement("div");
    controls.className = "fc-carousel-controls";
    const makeButton = (direction, label, icon) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fc-carousel-button";
      button.setAttribute("aria-label", label);
      button.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>`;
      button.addEventListener("click", () => {
        const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
        const pageStep = Math.max(1, carousel.clientWidth - gap);
        const maxScroll = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
        const atEnd = carousel.scrollLeft >= maxScroll - 8;
        const target = direction === "next"
          ? (atEnd ? 0 : Math.min(maxScroll, carousel.scrollLeft + pageStep))
          : (carousel.scrollLeft <= 8 ? maxScroll : Math.max(0, carousel.scrollLeft - pageStep));
        carousel.scrollTo({ left: target, behavior: "smooth" });
      });
      return button;
    };
    controls.append(
      makeButton("previous", "Previous items", "bi-arrow-left"),
      makeButton("next", "Next items", "bi-arrow-right")
    );
    carousel.insertAdjacentElement("afterend", controls);

    let timer = null;
    const start = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      stop();
      timer = window.setInterval(() => {
        const end = carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth - 8;
        const gap = parseFloat(getComputedStyle(carousel).gap) || 0;
        const pageStep = Math.max(1, carousel.clientWidth - gap);
        carousel.scrollTo({ left: end ? 0 : Math.min(carousel.scrollWidth - carousel.clientWidth, carousel.scrollLeft + pageStep), behavior: "smooth" });
      }, carousel.classList.contains("testimonial-carousel") ? 5000 : 4000);
    };
    const stop = () => { if (timer) window.clearInterval(timer); };
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);
    start();
  });


  // Shared Farming Collection modal and action handlers.
  function createModal() {
    let modal = document.getElementById("fc-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "fc-modal";
    modal.className = "fc-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="fc-modal-backdrop" data-modal-close="true">
        <section class="fc-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="fc-modal-title">
          <button class="fc-modal-close" type="button" aria-label="Close dialog" data-modal-close="true">&times;</button>
          <div class="fc-modal-mark"><i class="bi bi-check2" aria-hidden="true"></i></div>
          <h2 id="fc-modal-title" class="fc-modal-title"></h2>
          <p class="fc-modal-message"></p>
          <div class="fc-modal-field" hidden>
            <label for="fc-modal-quantity" class="form-label">Quantity (kg)</label>
            <input id="fc-modal-quantity" class="form-control" type="number" min="0.25" step="0.25" value="1" inputmode="decimal">
          </div>
          <div class="fc-modal-actions">
            <button class="btn btn-primary fc-modal-confirm" type="button">OK</button>
            <button class="btn btn-outline-secondary fc-modal-cancel" type="button" hidden>Cancel</button>
          </div>
        </section>
      </div>`;
    document.body.append(modal);

    modal.addEventListener("click", (event) => {
      if (event.target.matches("[data-modal-close]")) closeModal(null);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeModal(null);
    });
    return modal;
  }

  let modalResolver = null;
  function closeModal(value) {
    const modal = document.getElementById("fc-modal");
    if (!modal) return;
    modal.hidden = true;
    if (modalResolver) {
      const resolve = modalResolver;
      modalResolver = null;
      resolve(value);
    }
  }

  function showPopup(message, title = "Farming Collection") {
    const modal = createModal();
    modal.querySelector(".fc-modal-title").textContent = title;
    modal.querySelector(".fc-modal-message").textContent = message;
    modal.querySelector(".fc-modal-field").hidden = true;
    modal.querySelector(".fc-modal-cancel").hidden = true;
    modal.querySelector(".fc-modal-confirm").textContent = "OK";
    modal.querySelector(".fc-modal-mark").innerHTML = '<i class="bi bi-check2" aria-hidden="true"></i>';
    modal.hidden = false;
    modal.querySelector(".fc-modal-confirm").onclick = () => closeModal(true);
  }

  function askQuantity(cropName) {
    const modal = createModal();
    modal.querySelector(".fc-modal-title").textContent = `Sell ${cropName}`;
    modal.querySelector(".fc-modal-message").textContent = `Enter how many kilograms of ${cropName} you want to list for sale.`;
    modal.querySelector(".fc-modal-field").hidden = false;
    modal.querySelector(".fc-modal-cancel").hidden = false;
    modal.querySelector(".fc-modal-confirm").textContent = "Submit crop";
    modal.querySelector(".fc-modal-mark").innerHTML = '<i class="bi bi-basket2" aria-hidden="true"></i>';
    const input = modal.querySelector("#fc-modal-quantity");
    input.value = "1";
    modal.hidden = false;
    input.focus();

    return new Promise((resolve) => {
      modalResolver = resolve;
      modal.querySelector(".fc-modal-confirm").onclick = () => {
        const quantity = Number(input.value);
        if (!Number.isFinite(quantity) || quantity <= 0) {
          input.setCustomValidity("Enter a quantity greater than zero.");
          input.reportValidity();
          return;
        }
        input.setCustomValidity("");
        closeModal(quantity);
      };
      modal.querySelector(".fc-modal-cancel").onclick = () => closeModal(null);
    });
  }

  window.FCUI = { showPopup, askQuantity };

  // Normalize the footer across legacy pages so every footer destination works.
  function normalizeFooter() {
    if (document.querySelector(".fc-footer")) return;
    const oldFooter = document.querySelector(".bg-footer");
    if (oldFooter) {
      const wrapper = oldFooter.closest(".container-fluid") || oldFooter;
      const next = wrapper.nextElementSibling;
      wrapper.remove();
      if (next && next.classList.contains("bg-dark")) next.remove();
    }
    const footer = `
      <footer class="fc-footer"><div class="container"><div class="row g-4">
        <div class="col-lg-4"><a href="/index.html" class="fc-footer-brand">Farming <span>Collection</span></a><p>A digital marketplace connecting farmers and customers with fresh, locally grown produce.</p></div>
        <div class="col-6 col-lg-2"><h5>Quick Links</h5><a href="/index.html">Home</a><a href="/buy.html">Buy Produce</a><a href="/sell.html">Sell Produce</a><a href="/blog.html">Blog</a></div>
        <div class="col-6 col-lg-3"><h5>Information</h5><a href="/about.html">About Us</a><a href="/service.html">Our Services</a><a href="/contact.html">Contact</a><h5 class="mt-3">Account</h5><div class="fc-footer-account-links"></div></div>
        <div class="col-lg-3"><h5>Contact</h5><a href="mailto:farmingcollection@gmail.com">farmingcollection@gmail.com</a><p>Gujarat, India</p></div>
      </div><div class="fc-footer-bottom">© 2026 Farming Collection. All rights reserved.</div></div></footer>`;
    document.body.insertAdjacentHTML("beforeend", footer);
  }
  normalizeFooter();

  // One consistent navigation bar on every page; server session is authoritative.
  async function updateAuthNavigation() {
    const nav = document.querySelector(".navbar .navbar-nav");
    if (!nav) return;
    const navbarElement = nav.closest(".navbar");
    if (navbarElement && !navbarElement.querySelector(".fc-nav-brand")) {
      navbarElement.querySelectorAll(":scope > .navbar-brand").forEach((brand) => brand.remove());
      const brand = document.createElement("a");
      brand.className = "navbar-brand fc-nav-brand";
      brand.href = "/index.html";
      brand.innerHTML = '<i class="bi bi-leaf-fill me-2" aria-hidden="true"></i><span>Farming <b>Collection</b></span>';
      const toggler = navbarElement.querySelector(".navbar-toggler");
      navbarElement.insertBefore(brand, toggler || navbarElement.firstChild);
    }
    nav.style.visibility = "hidden";

    let user = null;
    let sessionData = { authenticated: false, profileComplete: false, user: null };
    try {
      const response = await fetch("/api/session", { headers: { Accept: "application/json" }, cache: "no-store" });
      sessionData = await response.json();
      if (response.ok && sessionData.authenticated) user = sessionData.user;
    } catch (error) {
      console.error("Unable to verify the login session:", error);
    }

    window.FC_AUTH = user;
    const currentPath = window.location.pathname;
    const protectedPaths = ["/buy.html", "/sell.html", "/cart.html", "/account.html"];
    if (user && !sessionData.profileComplete && currentPath !== "/profile-setup.html") {
      window.location.replace("/profile-setup.html");
      return;
    }
    if (!user && protectedPaths.includes(currentPath)) {
      const requestedPage = currentPath + window.location.search;
      window.location.replace(`/login.html?next=${encodeURIComponent(requestedPage)}`);
      return;
    }

    const profileReady = Boolean(user && sessionData.profileComplete);
    const links = [
      ["Home", "/index.html"],
      ...(profileReady ? [["Buy", "/buy.html"], ["Sell", "/sell.html"], ["My Account", "/account.html"]] : []),
      ["Blog", "/blog.html"], ["About", "/about.html"], ["Services", "/service.html"], ["Contact", "/contact.html"],
      ...(profileReady ? [["Cart", "/cart.html", '<i class="bi bi-cart3 me-1" aria-hidden="true"></i>']] : []),
      ...(user && !profileReady ? [["Complete Profile", "/profile-setup.html"]] : []),
      ...(!user ? [["Log In", "/login.html"], ["Sign Up", "/signup.html"]] : []),
    ];
    nav.replaceChildren();
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    links.forEach(([label, href, prefix = ""]) => {
      const link = document.createElement("a");
      const destination = new URL(href, window.location.origin);
      if (requestedNext && ["/login.html", "/signup.html"].includes(href) && requestedNext.startsWith("/") && !requestedNext.startsWith("//")) {
        destination.searchParams.set("next", requestedNext);
      }
      link.href = destination.pathname + destination.search;
      const active = currentPath === href || (currentPath === "/" && href === "/index.html");
      link.className = `nav-item nav-link${active ? " active" : ""}`;
      link.innerHTML = `${prefix}${label}`;
      nav.append(link);
    });

    // Footer account links follow the same authenticated state as the main navigation.
    const footer = document.querySelector(".fc-footer");
    let accountColumn = footer?.querySelector(".fc-footer-account-links");
    if (footer && !accountColumn) {
      const row = footer.querySelector(".row");
      if (row) {
        const column = document.createElement("div");
        column.className = "col-6 col-lg-2 fc-footer-account-column";
        column.innerHTML = '<h5>Account</h5><div class="fc-footer-account-links"></div>';
        row.append(column);
        accountColumn = column.querySelector(".fc-footer-account-links");
      }
    }
    if (accountColumn) {
      accountColumn.replaceChildren();
      const footerLinks = profileReady
        ? [["My Account", "/account.html"], ["Buy Produce", "/buy.html"], ["Sell Produce", "/sell.html"], ["My Cart", "/cart.html"], ["Log Out", "#fc-footer-logout"]]
        : user
          ? [["Complete Profile", "/profile-setup.html"], ["Log Out", "#fc-footer-logout"]]
          : [["Log In", "/login.html"], ["Sign Up", "/signup.html"]];
      footerLinks.forEach(([label, href]) => {
        const a = document.createElement("a"); a.href = href; a.textContent = label;
        if (href === "#fc-footer-logout") a.addEventListener("click", async (event) => {
          event.preventDefault();
          try { const response = await fetch("/api/logout", { method: "POST", headers: { Accept: "application/json" } }); if (!response.ok) throw new Error("Unable to log out."); window.location.replace("/index.html"); }
          catch (error) { showPopup(error.message, "Logout Failed"); }
        });
        accountColumn.append(a);
      });
    }

    if (user) {
      const logout = document.createElement("a");
      logout.href = "#";
      logout.className = "nav-item nav-link fc-logout-link";
      logout.textContent = "Log Out";
      logout.addEventListener("click", async (event) => {
        event.preventDefault();
        logout.classList.add("disabled");
        try {
          const response = await fetch("/api/logout", { method: "POST", headers: { Accept: "application/json" } });
          if (!response.ok) throw new Error("Unable to log out. Please try again.");
          // Cart is stored in MongoDB and intentionally survives logout.
          localStorage.removeItem("fc-user");
          window.location.replace("/index.html");
        } catch (error) {
          logout.classList.remove("disabled");
          showPopup(error.message, "Logout Failed");
        }
      });
      nav.append(logout);
    }
    nav.style.visibility = "visible";
  }
  updateAuthNavigation();
  window.addEventListener("pageshow", updateAuthNavigation);

  // Preserve the requested member page if the visitor chooses Sign Up instead of Log In.
  const nextPage = new URLSearchParams(window.location.search).get("next");
  if (nextPage && nextPage.startsWith("/") && !nextPage.startsWith("//")) {
    document.querySelectorAll('a[href="/signup.html"], a[href="/login.html"]').forEach((link) => {
      const target = new URL(link.href, window.location.origin);
      target.searchParams.set("next", nextPage);
      link.href = target.pathname + target.search;
    });
  }

  // Handle login and signup without a full-page API response.
  document.querySelectorAll("form.auth-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      const originalLabel = submitButton?.textContent;
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Please wait...";
      }

      try {
        const response = await fetch(form.action, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to continue. Please try again.");
        localStorage.removeItem("fc-user"); // Server session is authoritative.
        showPopup(result.message || "Welcome to Farming Collection!", "Success");
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const isSignup = form.action.includes("/api/signup");
        const nextPath = requestedNext ? requestedNext.split("?")[0] : "";
        const safeNext = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//") && !["/profile-setup.html", "/login.html", "/signup.html", "/info.html"].includes(nextPath) ? requestedNext : "";
        const destination = isSignup || result.profileComplete === false
          ? `/profile-setup.html${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""}`
          : safeNext || "/index.html";
        window.setTimeout(() => { window.location.href = destination; }, 900);
      } catch (error) {
        showPopup(error.message || "Something went wrong. Please try again.", "Unable to continue");
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalLabel;
        }
      }
    });
  });

})();
