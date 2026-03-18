import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// Redirect to dashboard - membership is managed there now
export default function Membership() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(user ? '/dashboard' : '/auth?tab=signup');
  }, [user, navigate]);

  return null;
}
