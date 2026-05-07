'use client';

import { AdminLogin } from '@/components/AdminLogin';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ptm-admin-token');
    if (token) {
      setIsAuthenticated(true);
      router.push('/admin/dashboard');
    } else {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return <AdminLogin />;
}
