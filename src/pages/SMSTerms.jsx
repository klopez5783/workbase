import { FileText, MessageSquare, Shield, HelpCircle, Phone, Mail } from 'lucide-react';

export default function SMSTerms() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare size={40} />
            <h1 className="text-4xl font-bold">WorkBase SMS Notification Program</h1>
          </div>
          <p className="text-blue-100 text-lg">
            Terms, Consent, and Privacy Information
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Program Overview */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Program Overview</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            WorkBase sends transactional SMS notifications to construction workers with secure,
            time-limited access links for mobile clock-in/clock-out functionality. This ensures
            workers can easily track their time on job sites using their mobile devices.
          </p>
        </section>

        {/* How Consent Is Collected */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">How Consent Is Collected</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Method 1: Administrator Enrollment
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Site administrators add workers to projects after obtaining verbal consent.
                Administrators confirm that workers agree to receive SMS notifications before
                adding their phone numbers to the system.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Method 2: Web Registration
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Workers who register through the web interface acknowledge SMS consent during
                account creation. By providing their phone number and completing registration,
                workers explicitly agree to receive SMS notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Message Content & Frequency */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Message Content & Frequency</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Message Type</p>
              <p className="text-gray-900">Transactional, worker-initiated notifications</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Frequency</p>
              <p className="text-gray-900">2-4 messages per work day, varies by work schedule</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Content</p>
              <p className="text-gray-900">
                Secure access links containing unique access keys for GPS-verified time tracking
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Example Message:</p>
              <p className="text-blue-800 text-sm font-mono">
                "New access link for Oak Street Project: https://workbase-app.com/worker/ABC123XYZ
                Valid for 30 minutes. Reply STOP to opt out."
              </p>
            </div>
          </div>
        </section>

        {/* Required Disclosures */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Required Disclosures</h2>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Cost</p>
                <p className="text-gray-700">
                  Message and data rates may apply based on your mobile carrier plan.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Opt-Out</p>
                <p className="text-gray-700">
                  Reply STOP to any message to unsubscribe immediately.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Help</p>
                <p className="text-gray-700">
                  Reply HELP to any message for support information.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <div>
                <p className="font-semibold text-gray-900">Privacy</p>
                <p className="text-gray-700">
                  Your information is handled according to our privacy policy and is never
                  shared with third parties for marketing purposes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Opt-Out Process */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Opt-Out Process</h2>
          </div>

          <p className="text-gray-700 mb-4">Workers can opt out at any time by:</p>

          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span className="text-gray-700 pt-0.5">Replying STOP to any SMS message</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span className="text-gray-700 pt-0.5">Contacting their site administrator</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span className="text-gray-700 pt-0.5">Emailing support (see contact information below)</span>
            </li>
          </ul>

          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mt-6">
            <p className="text-green-900 font-semibold">
              Opt-out requests are processed immediately and confirmed via SMS.
            </p>
          </div>
        </section>

        {/* Support */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Phone className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Support & Contact</h2>
          </div>

          <p className="text-gray-700 mb-6">
            For questions, assistance, or concerns about the SMS notification program:
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="text-gray-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Email Support</p>
                <a href="mailto:support@workbase-app.com" className="text-blue-600 font-semibold hover:underline">
                  support@workbase-app.com
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="text-gray-600" size={20} />
              <div>
                <p className="text-sm text-gray-600">Phone Support</p>
                <a href="tel:+1-555-0123" className="text-blue-600 font-semibold hover:underline">
                  +1 (555) 012-3456
                </a>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-6">
            <p className="text-sm text-gray-600">
              <strong>Business Hours:</strong> Monday - Friday, 8:00 AM - 6:00 PM EST<br />
              <strong>Emergency Support:</strong> Available 24/7 for critical issues
            </p>
          </div>
        </section>

        {/* Data Privacy & Security */}
        <section className="bg-white rounded-xl p-8 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Data Privacy & Security</h2>
          </div>

          <div className="space-y-4 text-gray-700">
            <p>
              WorkBase is committed to protecting your personal information. Here's how we
              handle your data:
            </p>

            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Phone numbers are stored securely and encrypted</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Access links expire after 30 minutes for security</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>GPS data is only collected during clock-in/out events</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>Your information is never sold or shared with third parties</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-600">•</span>
                <span>All data transmission uses industry-standard encryption</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Program Updates */}
        <section className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-blue-600" size={28} />
            <h2 className="text-2xl font-bold text-gray-900">Program Updates</h2>
          </div>

          <p className="text-gray-700">
            WorkBase reserves the right to modify this SMS program, including message frequency
            and content, with prior notice to enrolled users. Material changes will be communicated
            via SMS and email. Continued use of the service after notification constitutes acceptance
            of the updated terms.
          </p>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </section>

      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} WorkBase. All rights reserved.
          </p>
          <p className="text-gray-500 text-xs mt-2">
            This SMS program complies with TCPA regulations and industry best practices.
          </p>
        </div>
      </div>
    </div>
  );
}
