export default function PrivacyPolicy() {
  return (
    <div style={{
      maxWidth: 800, margin: '0 auto', padding: '60px 24px',
      color: 'var(--text)', fontFamily: 'var(--font-display)'
    }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16,
          fontSize: 24, fontWeight: 800
        }}>
          <span style={{
            width: 36, height: 36, background: 'var(--indigo)', borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18
          }}>⚡</span>
          FlowSpace
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>Last updated: April 2026 · Early Access Version</p>
      </div>

      {[
        {
          title: '1. Early Access Notice',
          content: `FlowSpace is currently in early access. Features, policies, and terms may change as the platform evolves. By using FlowSpace during this period, you acknowledge that the platform is still under active development and may have limitations or changes without prior notice.`
        },
        {
          title: '2. Who We Are',
          content: `FlowSpace is operated by Phaniraj B N, an individual based in India. For any privacy-related queries, you can reach us at the contact information provided at the end of this policy.`
        },
        {
          title: '3. Information We Collect',
          content: `We collect the following information when you use FlowSpace:\n\n• Name, email address, and phone number (at registration)\n• Password (stored in encrypted form, never readable)\n• Payment information processed via Razorpay (we do not store card details — Razorpay handles this securely)\n• Stream data including stream titles, categories, viewer counts, and duration\n• Coins purchased, donations made, and subscription activity\n• Device and browser information for security purposes`
        },
        {
          title: '4. How We Use Your Information',
          content: `Your information is used to:\n\n• Create and manage your FlowSpace account\n• Enable livestreaming, chat, and creator features\n• Process payments and coin purchases via Razorpay\n• Send important platform notifications\n• Detect and prevent fraud, abuse, or policy violations\n• Improve the platform during the early access period`
        },
        {
          title: '5. Payments & No Refund Policy',
          content: `All payments on FlowSpace — including coin purchases, subscriptions, and Pay-Per-View access — are final and non-refundable. Once a payment is made, it cannot be reversed or refunded under any circumstances.\n\nPayments are processed securely through Razorpay. FlowSpace does not store your card, UPI, or banking details at any point.`
        },
        {
          title: '6. Data Sharing',
          content: `We do not sell your personal data. We share data only with:\n\n• Razorpay — for payment processing\n• Cloudinary — for media storage (avatars, stream thumbnails)\n• MongoDB Atlas — for secure database storage\n\nAll third-party services used are GDPR and data protection compliant.`
        },
        {
          title: '7. Data Retention',
          content: `Your data is retained as long as your account is active. If you delete your account, your personal data will be removed within 30 days. Stream recordings and transaction history may be retained for legal and financial compliance purposes.`
        },
        {
          title: '8. Your Rights',
          content: `As a user based in India, you are protected under the Information Technology Act, 2000 and applicable rules. You have the right to:\n\n• Access the data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your account and data\n\nTo exercise these rights, contact us at the email below.`
        },
        {
          title: '9. Children',
          content: `FlowSpace is not intended for users under the age of 13. We do not knowingly collect data from minors. If you believe a minor has registered, please contact us immediately.`
        },
        {
          title: '10. Changes to This Policy',
          content: `As FlowSpace is in early access, this policy may be updated periodically. Continued use of the platform after changes constitutes acceptance of the updated policy. We will notify users of significant changes where possible.`
        },
        {
          title: '11. Contact',
          content: `For any privacy concerns or data requests, contact:\n\nPhaniraj B N\nEmail: [your-email@example.com]\nIndia`
        },
      ].map(({ title, content }) => (
        <div key={title} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>{title}</h2>
          <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: 15, whiteSpace: 'pre-line' }}>{content}</p>
        </div>
      ))}
    </div>
  )
}