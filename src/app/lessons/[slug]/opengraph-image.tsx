import { ImageResponse } from 'next/og';
import { SocialCard, SOCIAL_CARD_SIZE } from '@/features/seo/social-card';
import { ENGINE_LABEL, LEARNING_PATH, findStepBySlug } from '@/features/learn/curriculum/path';

export const alt = 'A free interactive DBAcademy lesson';
export const size = SOCIAL_CARD_SIZE;
export const contentType = 'image/png';

export function generateStaticParams() {
  return LEARNING_PATH.map(step => ({ slug: step.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const step = findStepBySlug((await params).slug);
  const title = step?.lesson.title ?? 'Interactive SQL lesson';
  const engine = step ? ENGINE_LABEL[step.module.engine] : 'SQL';
  return new ImageResponse(
    <SocialCard
      eyebrow={`${engine} lesson · free`}
      title={title}
      footer={step ? `Module ${step.moduleNumber}: ${step.module.title} · solve it in your browser` : 'Solve it in your browser'}
    />,
    size,
  );
}
