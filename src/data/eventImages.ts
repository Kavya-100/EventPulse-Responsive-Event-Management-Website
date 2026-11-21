import { EventCategory } from '../types/event';
import heroEventImg from '../assets/images/hero_event_crowd_1794262334609.jpg';
import techSummitImg from '../assets/images/event_tech_ai_summit_1794262335558.jpg';
import musicFestivalImg from '../assets/images/event_music_festival_1794262344491.jpg';
import businessSummitImg from '../assets/images/event_business_summit_1794262337177.jpg';
import designExpoImg from '../assets/images/event_design_expo_1794262336496.jpg';
import sportsMarathonImg from '../assets/images/event_sports_marathon_1794262360244.jpg';
import culinaryGalaImg from '../assets/images/event_culinary_gala_1794262360981.jpg';

export const HERO_EVENT_IMAGE = heroEventImg;

export const EVENT_IMAGES = {
  hero: heroEventImg,
  technology: techSummitImg,
  music: musicFestivalImg,
  business: businessSummitImg,
  design: designExpoImg,
  sports: sportsMarathonImg,
  culinary: culinaryGalaImg,
} as const;

const LEGACY_PATH_TO_BUNDLED: Record<string, string> = {
  'hero_event_crowd_1794262334609.jpg': heroEventImg,
  'event_tech_ai_summit_1794262335558.jpg': techSummitImg,
  'event_music_festival_1794262344491.jpg': musicFestivalImg,
  'event_business_summit_1794262337177.jpg': businessSummitImg,
  'event_design_expo_1794262336496.jpg': designExpoImg,
  'event_sports_marathon_1794262360244.jpg': sportsMarathonImg,
  'event_culinary_gala_1794262360981.jpg': culinaryGalaImg,
};

export function getCategoryEventImage(category: Exclude<EventCategory, 'All'>): string {
  switch (category) {
    case 'Music & Concerts':
      return musicFestivalImg;
    case 'Business & Leadership':
      return businessSummitImg;
    case 'Design & Arts':
      return designExpoImg;
    case 'Sports & Wellness':
      return sportsMarathonImg;
    case 'Culinary & Culture':
      return culinaryGalaImg;
    case 'Technology':
    default:
      return techSummitImg;
  }
}

/**
 * Resolves any legacy unbundled `/src/assets/images/...` path (e.g., from older localStorage records)
 * to its Vite-bundled production asset URL so images render cleanly on Vercel/Netlify.
 */
export function resolveBundledEventImage(
  imagePath: string | undefined,
  category: Exclude<EventCategory, 'All'>
): string {
  if (!imagePath) return getCategoryEventImage(category);
  if (imagePath.startsWith('/src/assets/images/')) {
    const filename = imagePath.split('/').pop() || '';
    if (LEGACY_PATH_TO_BUNDLED[filename]) {
      return LEGACY_PATH_TO_BUNDLED[filename];
    }
    return getCategoryEventImage(category);
  }
  return imagePath;
}
