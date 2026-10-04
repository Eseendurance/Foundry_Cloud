export function ModernSaaSTemplate({
  title,
  heroText,
  ctaLink,
  ctaText,
  brandColor = "#4f46e5"
}: {
  title: string;
  heroText: string;
  ctaLink: string;
  ctaText: string;
  brandColor?: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #090d16; color: #f3f4f6; margin: 0; padding: 40px 20px; }
          .card { max-width: 560px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 16px; padding: 40px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .badge { display: inline-block; padding: 4px 12px; background: rgba(79, 70, 229, 0.15); border: 1px solid ${brandColor}; color: #818cf8; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 24px; }
          .heading { font-size: 28px; font-weight: 700; color: #ffffff; margin-bottom: 16px; line-height: 1.2; }
          .body-text { font-size: 16px; color: #9ca3af; line-height: 1.6; margin-bottom: 32px; }
          .btn { display: inline-block; padding: 14px 32px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; text-align: center; }
          .footer { margin-top: 40px; font-size: 12px; color: #4b5563; text-align: center; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Foundry Cloud Dispatch</div>
          <div class="heading">${title}</div>
          <div class="body-text">${heroText}</div>
          <a href="${ctaLink}" class="btn">${ctaText}</a>
        </div>
        <div class="footer">Sent via Foundry Native Dispatch Pipeline • Unsubscribe</div>
      </body>
    </html>
  `;
}