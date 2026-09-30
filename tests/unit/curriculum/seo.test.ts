import { describe, it, expect } from 'vitest';
import { LEARNING_PATH, findStepBySlug } from '@/features/learn/curriculum/path';
import {
  LESSON_DESCRIPTIONS, courseJsonLd, lessonBody, lessonDescription, lessonJsonLd, lessonUrl,
} from '@/features/learn/curriculum/seo';
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
import { SITE_URL } from '@/lib/site';

describe('lesson URLs', () => {
  it('are unique and URL-safe', () => {
    const slugs = LEARNING_PATH.map(s => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('stay the same once published (changing one breaks links and rankings)', () => {
    expect(findStepBySlug('sql-murder-mystery-crime-scene')?.lesson.id).toBe('1-1');
    expect(findStepBySlug('sql-left-join')?.lesson.id).toBe('join-2');
    expect(findStepBySlug('postgresql-window-functions')?.lesson.id).toBe('pg-2-1');
    expect(findStepBySlug('nosql-query-operators')?.lesson.id).toBe('mongo-1-3');
  });
});

describe('lesson descriptions', () => {
  it('exist for every lesson, hand-written', () => {
    for (const step of LEARNING_PATH) expect(LESSON_DESCRIPTIONS[step.lesson.id], step.lesson.id).toBeTruthy();
  });

  it('fit in a search result and are all different', () => {
    const all = LEARNING_PATH.map(lessonDescription);
    for (const d of all) {
      expect(d.length).toBeGreaterThanOrEqual(70);
      expect(d.length).toBeLessThanOrEqual(160);
    }
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('lesson page content', () => {
  it('drops the markdown title (the page renders its own heading)', () => {
    const body = lessonBody(LEARNING_PATH[0]);
    expect(body).not.toMatch(/^#\s/);
    expect(body).toContain('SQL City');
  });
});

describe('sitemap and robots', () => {
  it('list every lesson page on the official domain', () => {
    const urls = sitemap().map(e => e.url);
    expect(SITE_URL).toBe('https://www.dbacademy.online');
    for (const step of LEARNING_PATH) expect(urls).toContain(`${SITE_URL}/lessons/${step.slug}`);
    expect(urls).toContain(`${SITE_URL}/lessons`);
    expect(urls.every(u => u.startsWith(SITE_URL))).toBe(true);
  });

  it('point crawlers at the sitemap and keep personal pages out', () => {
    const r = robots();
    expect(r.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    expect(JSON.stringify(r.rules)).toMatch(/\/dashboard/);
  });
});

describe('structured data', () => {
  it('describes each lesson as a free learning resource in the course', () => {
    const [resource, breadcrumbs] = lessonJsonLd(LEARNING_PATH[8]);
    expect(resource).toMatchObject({ '@type': 'LearningResource', isAccessibleForFree: true, url: lessonUrl(LEARNING_PATH[8]) });
    expect(breadcrumbs['@type']).toBe('BreadcrumbList');
  });

  it('lists every lesson in the course', () => {
    const course = courseJsonLd();
    expect(course['@type']).toBe('Course');
    expect(course.hasPart).toHaveLength(LEARNING_PATH.length);
  });
});
