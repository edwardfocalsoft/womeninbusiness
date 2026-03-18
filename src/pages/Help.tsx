import { HelpCircle, Mail, Phone, MessageSquare } from 'lucide-react';

export default function Help() {
  return (
    <div className="py-8">
      <div className="max-w-3xl mx-auto px-4 lg:px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Help & Support</h1>
          <p className="text-muted-foreground text-sm">Need assistance? We're here to help.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <Mail className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-1">Email Us</h3>
            <p className="text-sm text-muted-foreground mb-3">Get a response within 24 hours.</p>
            <a href="mailto:ceo@womeninbusiness.org.za" className="text-sm text-primary hover:underline font-medium">ceo@womeninbusiness.org.za</a>
          </div>
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm">
            <Phone className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-1">Call / WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-3">Available Mon-Fri, 9am-5pm.</p>
            <a href="https://wa.me/27745892042" className="text-sm text-primary hover:underline font-medium">074 589 2042</a>
          </div>
          <div className="rounded-[5px] border border-border bg-card p-6 shadow-sm sm:col-span-2">
            <HelpCircle className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-bold mb-1">FAQs</h3>
            <div className="space-y-3 mt-4 text-sm">
              <div className="p-3 rounded-[5px] bg-background border border-border">
                <p className="font-semibold mb-1">How do I renew my membership?</p>
                <p className="text-muted-foreground">Go to your Dashboard and click "Renew Membership" if your plan has expired.</p>
              </div>
              <div className="p-3 rounded-[5px] bg-background border border-border">
                <p className="font-semibold mb-1">How do I RSVP for events?</p>
                <p className="text-muted-foreground">Navigate to Events, select an event, and click the RSVP button.</p>
              </div>
              <div className="p-3 rounded-[5px] bg-background border border-border">
                <p className="font-semibold mb-1">Can I download my membership card?</p>
                <p className="text-muted-foreground">Yes! Go to Membership → My Membership to view and print your card.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
