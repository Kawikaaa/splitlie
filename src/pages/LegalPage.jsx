import { useNavigate } from 'react-router-dom'

const legalCopy = {
  privacy: {
    eyebrow: 'PRIVACY',
    title: 'Privacy Policy',
    updated: 'Last updated September 30, 2026',
    sections: [
      ['What Splitlie collects', 'Splitlie stores the account information you provide, the profile details you choose to add, and the financial records you create inside your spaces. When you sign in with Google, we receive basic profile information such as your name, email address, and profile image.'],
      ['How information is used', 'We use this information only to provide authentication, personal and shared money features, account recovery, and the settings you choose. Splitlie does not sell your personal information.'],
      ['Storage and sharing', 'Account and ledger data is stored through Supabase. Information in a shared space is visible to the members of that space. We do not share your information with advertisers.'],
      ['Your choices', 'You can update your profile and financial records in the app. You may also request account or data deletion by contacting the support address shown on the Google authorization screen.'],
      ['Security', 'We use managed authentication and database access controls to protect account data. No online service can guarantee absolute security, so please use a secure Google account or password.'],
    ],
  },
  terms: {
    eyebrow: 'TERMS',
    title: 'Terms of Service',
    updated: 'Last updated September 30, 2026',
    sections: [
      ['Using Splitlie', 'You may use Splitlie to organize personal or shared financial records. You are responsible for the accuracy of the information you enter and for activity performed through your account.'],
      ['Not financial advice', 'Splitlie is a record-keeping and planning tool. It does not provide banking, accounting, investment, tax, or legal advice.'],
      ['Shared spaces', 'Only invite people you trust. Members of a shared space may be able to view and change information in that space according to the permissions available in the product.'],
      ['Acceptable use', 'Do not misuse the service, attempt to access another person’s account, interfere with the service, or use Splitlie for unlawful activity.'],
      ['Service availability', 'Features may change as Splitlie develops. We may suspend access when necessary for security, maintenance, or misuse prevention.'],
    ],
  },
}

export default function LegalPage({ type }) {
  const navigate = useNavigate()
  const copy = legalCopy[type] ?? legalCopy.privacy

  return (
    <main className="legal-page">
      <nav className="legal-nav" aria-label="Public navigation">
        <button className="legal-brand" type="button" onClick={() => navigate('/welcome')}>
          SPLITLIE
        </button>
        <button className="legal-back" type="button" onClick={() => navigate('/welcome')}>
          Back to Splitlie
        </button>
      </nav>

      <article className="legal-card">
        <p className="legal-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className="legal-updated">{copy.updated}</p>

        <div className="legal-sections">
          {copy.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  )
}
