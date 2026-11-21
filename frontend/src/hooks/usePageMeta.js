import { useEffect } from 'react';

/**
 * Custom hook to update document title, meta descriptions, and robots indexation per route.
 *
 * @param {object} options
 * @param {string} [options.title] - Page title prefix
 * @param {string} [options.description] - Page meta description
 * @param {boolean} [options.noIndex] - Whether to set noindex, nofollow (for auth & private dashboards)
 * @param {string} [options.ogImage] - Open Graph preview image URL
 */
export default function usePageMeta({
  title,
  description = 'MediBridge is an enterprise medicine donation, pharmacist verification, and healthcare redistribution platform.',
  noIndex = false,
  ogImage = '/logo.svg',
} = {}) {
  useEffect(() => {
    // 1. Set document title
    const appName = 'MediBridge';
    document.title = title ? `${title} | ${appName}` : `${appName} - Medicine Donation & Verification Platform`;

    // 2. Set or create meta description
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', description);

    // 3. Set robots noindex/index tag
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.setAttribute('name', 'robots');
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');

    // 4. Open Graph tags
    const setOgMeta = (property, content) => {
      let ogTag = document.querySelector(`meta[property="${property}"]`);
      if (!ogTag) {
        ogTag = document.createElement('meta');
        ogTag.setAttribute('property', property);
        document.head.appendChild(ogTag);
      }
      ogTag.setAttribute('content', content);
    };

    setOgMeta('og:title', document.title);
    setOgMeta('og:description', description);
    setOgMeta('og:image', ogImage);
    setOgMeta('og:type', 'website');
  }, [title, description, noIndex, ogImage]);
}
