/**
 * The 1200×630 preview card shown when a page is shared (LinkedIn, Slack, X…).
 * Rendered by next/og, which supports a subset of CSS: every element with
 * more than one child needs display: flex.
 */
export const SOCIAL_CARD_SIZE = { width: 1200, height: 630 };

export function SocialCard({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '72px 80px', background: '#07090F', color: '#EDF1FA', fontFamily: 'sans-serif',
        backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(0,199,190,0.28), transparent 45%), radial-gradient(circle at 10% 95%, rgba(245,158,11,0.18), transparent 40%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5V19A9 3 0 0 0 21 19V5" />
            <path d="M3 12A9 3 0 0 0 21 12" />
          </svg>
        </div>
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>DBAcademy</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 30, fontWeight: 600, color: '#00C7BE', textTransform: 'uppercase', letterSpacing: 3 }}>{eyebrow}</div>
        <div style={{ fontSize: title.length > 34 ? 68 : 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title}</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 28, color: '#8A97B3' }}>
        <div style={{ display: 'flex' }}>{footer}</div>
        <div style={{ display: 'flex', color: '#F59E0B', fontWeight: 600 }}>dbacademy.online</div>
      </div>
    </div>
  );
}
