import { ImageResponse } from 'next/og';
import { SocialCard, SOCIAL_CARD_SIZE } from '@/features/seo/social-card';
import { TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';

export const alt = `${TOTAL_PATH_LESSONS} free interactive SQL lessons on DBAcademy`;
export const size = SOCIAL_CARD_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <SocialCard
      eyebrow="Free course"
      title={`${TOTAL_PATH_LESSONS} interactive SQL lessons`}
      footer="SELECT to window functions · PostgreSQL · SQLite · NoSQL"
    />,
    size,
  );
}
