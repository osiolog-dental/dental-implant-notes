import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F9F9F8] py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-[#E5E5E2] shadow-sm p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#2A2F35]" style={{ fontFamily: 'Work Sans, sans-serif' }}>
            Privacy Policy
          </h1>
          <p className="text-[#5C6773] mt-2 text-sm">Osiolog — Last updated: April 19, 2026</p>
        </div>

        <div className="space-y-8 text-[#2A2F35]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>

          <section>
            <h2 className="text-lg font-semibold mb-2">1. Who We Are</h2>
            <p className="text-[#5C6773] leading-relaxed">
              Osiolog ("we", "our", "us") is a dental implant case management platform built for licensed dental professionals in India and worldwide. Our registered domain is <strong>osiolog.com</strong>. For privacy-related queries, contact us at <a href="mailto:admin@osiolog.com" className="text-[#82A098] underline">admin@osiolog.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. What Data We Collect</h2>
            <div className="text-[#5C6773] leading-relaxed space-y-3">
              <p><strong className="text-[#2A2F35]">Doctor account data:</strong> Name, email address, phone number, dental registration number, college, specialization, clinic details, and profile photo.</p>
              <p><strong className="text-[#2A2F35]">Patient clinical data:</strong> Patient name, age, gender, contact details, medical history, dental implant records, FPD logs, surgical notes, ISQ values, follow-up dates, and radiograph/photo images uploaded by the treating doctor.</p>
              <p><strong className="text-[#2A2F35]">Usage data:</strong> Login timestamps, device type (web/Android/iOS), and app activity logs for security and debugging purposes.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. How We Use Your Data</h2>
            <ul className="text-[#5C6773] leading-relaxed list-disc list-inside space-y-1">
              <li>To provide implant case management features to the treating doctor</li>
              <li>To send push notifications for follow-up reminders (osseointegration milestones)</li>
              <li>To generate clinical reports and analytics for the doctor's own practice</li>
              <li>To maintain security, prevent fraud, and debug issues</li>
              <li>We do <strong className="text-[#2A2F35]">not</strong> sell, share, or use patient data for advertising</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. Data Storage & Security</h2>
            <p className="text-[#5C6773] leading-relaxed">
              All data is stored on AWS infrastructure in the <strong className="text-[#2A2F35]">ap-south-1 (Mumbai, India)</strong> region. Clinical records are stored in PostgreSQL on Amazon RDS. Photos and radiographs are stored in Amazon S3 with private access — they are never publicly accessible without a time-limited signed URL. All data in transit is encrypted via HTTPS/TLS. Authentication is handled by Google Firebase Authentication.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. Who Can Access Patient Data</h2>
            <p className="text-[#5C6773] leading-relaxed">
              Patient data is strictly scoped to the treating doctor who created the record. No other doctor or Osiolog staff can access a clinic's patient records. Osiolog engineers may access anonymised logs for debugging purposes only, never clinical records.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
            <p className="text-[#5C6773] leading-relaxed">
              Patient records are retained for as long as the doctor's account is active. If a doctor deletes their account, all associated patient records, implant logs, and uploaded images are permanently deleted within 30 days. Doctors can delete their account at any time from the Account page inside the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
            <ul className="text-[#5C6773] leading-relaxed list-disc list-inside space-y-1">
              <li><strong className="text-[#2A2F35]">Access:</strong> Request a copy of all data we hold about you</li>
              <li><strong className="text-[#2A2F35]">Correction:</strong> Update your profile details from the Account page</li>
              <li><strong className="text-[#2A2F35]">Deletion:</strong> Delete your account and all associated data from the Account page</li>
              <li><strong className="text-[#2A2F35]">Portability:</strong> Export your patient and implant data via the app's export feature</li>
            </ul>
            <p className="text-[#5C6773] leading-relaxed mt-3">
              For any data requests not covered above, email <a href="mailto:admin@osiolog.com" className="text-[#82A098] underline">admin@osiolog.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">8. Third-Party Services</h2>
            <div className="text-[#5C6773] leading-relaxed space-y-1">
              <p><strong className="text-[#2A2F35]">Google Firebase:</strong> Authentication — <a href="https://firebase.google.com/support/privacy" className="text-[#82A098] underline" target="_blank" rel="noreferrer">Firebase Privacy Policy</a></p>
              <p><strong className="text-[#2A2F35]">Amazon Web Services:</strong> Database and file storage — <a href="https://aws.amazon.com/privacy/" className="text-[#82A098] underline" target="_blank" rel="noreferrer">AWS Privacy Policy</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">9. Children's Privacy</h2>
            <p className="text-[#5C6773] leading-relaxed">
              Osiolog is intended for use by licensed dental professionals only. We do not knowingly collect data from individuals under 18 years of age.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">10. Changes to This Policy</h2>
            <p className="text-[#5C6773] leading-relaxed">
              We may update this policy from time to time. We will notify registered doctors via email before any material changes take effect. Continued use of the app after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">11. Contact</h2>
            <p className="text-[#5C6773] leading-relaxed">
              For any privacy-related questions or requests:<br />
              <strong className="text-[#2A2F35]">Email:</strong> <a href="mailto:admin@osiolog.com" className="text-[#82A098] underline">admin@osiolog.com</a><br />
              <strong className="text-[#2A2F35]">Website:</strong> <a href="https://osiolog.com" className="text-[#82A098] underline">osiolog.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
