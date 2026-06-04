/**
 * Renders blog article pods on /blog/ from articles.json
 */
(function initBlogIndex() {
    const container = document.getElementById('blog-articles-root');
    if (!container) return;

    fetch('/blog/articles.json')
        .then((res) => {
            if (!res.ok) throw new Error('Failed to load articles');
            return res.json();
        })
        .then((articles) => {
            const section = document.createElement('div');
            section.className = 'app-section';
            section.innerHTML = '<h2 class="section-title">Blog Articles 📰</h2>';

            for (let i = 0; i < articles.length; i += 3) {
                const row = articles.slice(i, i + 3);
                const grid = document.createElement('div');
                grid.className = 'app-grid';

                row.forEach((article) => {
                    const a = document.createElement('a');
                    a.className = 'app-button blog-pod';
                    a.href = `${article.slug}.html`;
                    a.innerHTML = `
                        <p class="blog-pod-title">${escapeHtml(article.title)}</p>
                        <div class="app-description">${escapeHtml(article.description || '')}</div>
                    `;
                    grid.appendChild(a);
                });

                section.appendChild(grid);
            }

            container.appendChild(section);
        })
        .catch((err) => {
            console.error(err);
            container.innerHTML = '<p style="text-align:center;color:rgba(255,255,255,0.7);">Unable to load blog articles. Please refresh the page.</p>';
        });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
})();
