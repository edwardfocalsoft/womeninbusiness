import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

// Admin landing - redirect to members page
export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      navigate(isAdmin ? '/admin/members' : '/dashboard');
    }
  }, [isAdmin, loading, navigate]);

  return null;
}
