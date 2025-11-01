import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function NotFoundPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-[#fafafa]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">404</CardTitle>
          <p className="text-muted-foreground">Page not found</p>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Sorry, the page you visited does not exist.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link to={isAuthenticated ? 'dashboard' : 'login'}>
                {isAuthenticated ? 'Back to dashboard' : 'Back to login'}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
