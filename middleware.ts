import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/forms/create',
  '/forms/create/(.*)',
  '/forms/:id',
  '/forms/:id/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Check if it's a protected route but not a view route
  const url = req.nextUrl.pathname;
  const isViewRoute = url.includes('/view');
  const isEditResponseRoute = url.includes('/edit-response');
  
  if (isProtectedRoute(req) && !isViewRoute && !isEditResponseRoute) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};