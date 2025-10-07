'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on public form view pages
  const isPublicFormView = pathname.includes('/forms/') && pathname.includes('/view');
  
  if (isPublicFormView) {
    return null;
  }
  
  return <Navbar />;
}