(() => {
  const articles = window.FC_BLOG_ARTICLES || [];
  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const grid = document.getElementById("blog-grid");
  const search = document.getElementById("blog-search");
  const empty = document.getElementById("blog-empty");
  function render() {
    if (!grid) return;
    const query = (search?.value || "").trim().toLowerCase();
    const filtered = articles.filter((item) => `${item.title} ${item.category} ${item.intro}`.toLowerCase().includes(query));
    grid.innerHTML = filtered.map((item) => `<div class="col-md-6 col-lg-4"><article class="fc-blog-card h-100"><a href="/blog-detail.html?slug=${encodeURIComponent(item.slug)}"><img src="/img/${escape(item.image)}" alt="${escape(item.title)}" loading="lazy"></a><div class="p-4"><div class="d-flex justify-content-between gap-2 mb-2"><small class="text-muted">${escape(item.date)}</small><span class="fc-blog-tag">${escape(item.category)}</span></div><h2 class="h5"><a href="/blog-detail.html?slug=${encodeURIComponent(item.slug)}">${escape(item.title)}</a></h2><p>${escape(item.intro)}</p><a class="fc-read-more" href="/blog-detail.html?slug=${encodeURIComponent(item.slug)}">Read Article <i class="bi bi-arrow-right"></i></a></div></article></div>`).join("");
    if (empty) empty.hidden = filtered.length > 0;
  }
  search?.addEventListener("input", render); render();
  const articleRoot = document.getElementById("blog-article");
  if (articleRoot) {
    const slug = new URLSearchParams(location.search).get("slug");
    const article = articles.find((item) => item.slug === slug);
    if (!article) { articleRoot.innerHTML = '<div class="alert alert-warning">This article could not be found. <a href="/blog.html">Browse all articles</a>.</div>'; return; }
    document.title = `${article.title} | Farming Collection`;
    articleRoot.innerHTML = `<img class="fc-article-cover" src="/img/${escape(article.image)}" alt="${escape(article.title)}"><div class="d-flex flex-wrap align-items-center gap-3 mt-4 mb-3"><span class="fc-blog-tag">${escape(article.category)}</span><small class="text-muted">${escape(article.date)}</small></div><h1 class="display-5">${escape(article.title)}</h1><p class="lead text-muted">${escape(article.intro)}</p>${article.body.map((paragraph) => `<p>${escape(paragraph)}</p>`).join("")}<div class="mt-5"><a class="btn btn-primary" href="/blog.html">Explore More Articles</a></div>`;
  }
})();
