import { ImageResponse } from 'next/og';
import { SocialCard, SOCIAL_CARD_SIZE } from '@/features/seo/social-card';
import { TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';

export const alt = 'DBAcademy: learn SQL by solving a murder mystery';
export const size = SOCIAL_CARD_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <SocialCard
      eyebrow="Free interactive SQL course"
      title="Learn SQL by solving a murder mystery"
      footer={`${TOTAL_PATH_LESSONS} lessons · PostgreSQL · SQLite · NoSQL · in your browser`}
    />,
    size,
  );
}
