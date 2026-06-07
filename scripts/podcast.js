(function initPodcastPage() {
    const episodesEl = document.getElementById('podcast-episodes');
    if (!episodesEl) return;

    const SPOTIFY_SHOW = 'https://open.spotify.com/show/2W1EDfZ6NJ9Su14Pbm0Mjt';

    fetch('/api/podcast/episodes')
        .then((res) => {
            if (!res.ok) throw new Error('Failed to load podcast');
            return res.json();
        })
        .then((data) => {
            if (!data.success) throw new Error(data.message || 'Podcast unavailable');

            const payload = data.data;
            const titleEl = document.getElementById('podcast-show-title');
            const artworkEl = document.getElementById('podcast-show-artwork');
            const descEl = document.getElementById('podcast-show-description');
            const spotifyEl = document.getElementById('podcast-spotify-link');
            const appleEl = document.getElementById('podcast-apple-link');

            if (titleEl && payload.showTitle) titleEl.textContent = payload.showTitle;
            if (artworkEl && payload.imageUrl) {
                artworkEl.src = payload.imageUrl;
                artworkEl.alt = payload.showTitle || 'The NotSus Podcast';
            }
            if (descEl && payload.showDescription) {
                descEl.textContent = payload.showDescription;
            }
            if (spotifyEl && payload.spotifyUrl) spotifyEl.href = payload.spotifyUrl;

            const subscribeEl = document.querySelector('.podcast-subscribe');
            if (appleEl && payload.appleUrl) {
                appleEl.href = payload.appleUrl;
                appleEl.style.display = 'flex';
            } else if (appleEl) {
                appleEl.style.display = 'none';
                if (subscribeEl) subscribeEl.classList.add('podcast-subscribe--solo');
            }

            const episodes = payload.episodes || [];
            if (episodes.length === 0) {
                episodesEl.innerHTML = '<p class="podcast-error">No episodes published yet. Subscribe on Spotify to get notified.</p>';
                return;
            }

            let html = '';

            if (payload.stale) {
                html += '<p class="podcast-error">Showing cached episodes — feed temporarily unavailable.</p>';
            }

            episodes.forEach((ep, index) => {
                const dateStr = ep.pubDate
                    ? new Date(ep.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                    : '';
                const audioBlock = ep.audioUrl
                    ? `<audio class="podcast-player" controls preload="metadata" aria-label="Play ${escapeAttr(ep.title)}">
                            <source src="${escapeAttr(ep.audioUrl)}" type="audio/mpeg">
                       </audio>`
                    : '';
                const externalLinks = `
                    <div class="podcast-episode-links">
                        <a href="${escapeAttr(payload.spotifyUrl || SPOTIFY_SHOW)}" target="_blank" rel="noopener noreferrer">On Spotify</a>
                        ${payload.appleUrl ? `<a href="${escapeAttr(payload.appleUrl)}" target="_blank" rel="noopener noreferrer">On Apple Podcasts</a>` : ''}
                        ${ep.episodePageUrl ? `<a href="${escapeAttr(ep.episodePageUrl)}" target="_blank" rel="noopener noreferrer">Episode Page</a>` : ''}
                    </div>`;

                html += `
                    <article class="podcast-episode">
                        <h3>${escapeHtml(ep.title)}</h3>
                        ${dateStr ? `<div class="podcast-episode-meta">${escapeHtml(dateStr)}${ep.duration ? ' · ' + escapeHtml(String(ep.duration)) : ''}</div>` : ''}
                        ${ep.description ? `<p class="podcast-episode-desc">${escapeHtml(ep.description.slice(0, 320))}${ep.description.length > 320 ? '…' : ''}</p>` : ''}
                        ${audioBlock}
                        ${externalLinks}
                    </article>
                `;
            });

            episodesEl.innerHTML = html;
        })
        .catch((err) => {
            console.error(err);
            episodesEl.innerHTML = `<p class="podcast-error">Could not load episodes right now. You can still listen on <a href="${SPOTIFY_SHOW}" target="_blank" rel="noopener noreferrer">Spotify</a>.</p>`;
        });

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function escapeAttr(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }
})();
