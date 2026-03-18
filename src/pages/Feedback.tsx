import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

export default function Feedback() {
  const [type, setType] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!type || !message.trim()) { toast.error('Please fill in all fields'); return; }
    toast.success('Thank you for your feedback!');
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="py-20 text-center">
        <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
        <p className="text-muted-foreground">Your feedback has been received. We appreciate it.</p>
        <Button className="mt-6" onClick={() => { setSubmitted(false); setType(''); setMessage(''); }}>Send More Feedback</Button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-2xl mx-auto px-4 lg:px-0">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Feedback</h1>
          <p className="text-muted-foreground text-sm">Help us improve your experience.</p>
        </div>

        <div className="rounded-[5px] border border-border bg-card p-5 sm:p-8 shadow-sm space-y-5">
          <div>
            <Label>Feedback Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-[5px]"><SelectValue placeholder="Select type..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="compliment">Compliment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Your Message</Label>
            <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder="Tell us what's on your mind..." />
          </div>
          <Button className="w-full font-semibold" onClick={handleSubmit}>Submit Feedback</Button>
        </div>
      </div>
    </div>
  );
}
