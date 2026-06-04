const Parser = require('rss-parser');

const RSS_URL = process.env.PODCAST_RSS_URL || 'https://anchor.fm/s/110e51648/podcast/rss';
const SPOTIFY_URL = process.env.PODCAST_SPOTIFY_URL || 'https://open.spotify.com/show/2W1EDfZ6NJ9Su14Pbm0Mjt';
const CACHE_TTL_MS = (parseInt(process.env.PODCAST_CACHE_HOURS, 10) || 2) * 60 * 60 * 1000;

const parser = new Parser({
    customFields: {
        item: ['itunes:duration']
    }
});

let cache = {
    fetchedAt: 0,
    data: null
};

function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapEpisode(item) {
    const enclosure = item.enclosure || {};
    const audioUrl = enclosure.url || null;
    return {
        title: item.title || 'Untitled episode',
        description: stripHtml(item.contentSnippet || item.content || item.summary || ''),
        pubDate: item.pubDate || item.isoDate || null,
        audioUrl,
        episodePageUrl: item.link || null,
        duration: item.itunes?.duration || item['itunes:duration'] || null,
        guid: item.guid || item.link || item.title
    };
}

async function fetchPodcastFeed() {
    const feed = await parser.parseURL(RSS_URL);
    const appleUrl = feed.itunes?.author
        ? null
        : (feed.link && feed.link.includes('podcasts.apple.com') ? feed.link : null);

    let applePodcastUrl = process.env.PODCAST_APPLE_URL || null;
    if (!applePodcastUrl && feed.itunes) {
        const atomLink = (feed.links || []).find((l) => l.rel === 'alternate' && l.type === 'text/html');
        if (atomLink && atomLink.href && atomLink.href.includes('podcasts.apple.com')) {
            applePodcastUrl = atomLink.href;
        }
    }

    const imageUrl = feed.itunes?.image
        || (feed.image && (feed.image.url || feed.image))
        || null;

    return {
        showTitle: feed.title || 'NotSus Podcast',
        showDescription: stripHtml(feed.description || ''),
        imageUrl,
        spotifyUrl: SPOTIFY_URL,
        appleUrl: applePodcastUrl,
        episodes: (feed.items || []).map(mapEpisode)
    };
}

async function getPodcastEpisodes() {
    const now = Date.now();
    if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.data;
    }

    try {
        const data = await fetchPodcastFeed();
        cache = { fetchedAt: now, data };
        return data;
    } catch (err) {
        console.error('Podcast RSS fetch failed:', err.message);
        if (cache.data) {
            return { ...cache.data, stale: true, error: err.message };
        }
        throw err;
    }
}

module.exports = { getPodcastEpisodes, SPOTIFY_URL, RSS_URL };
