import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NotFoundPage = () => {
  const { isAuthenticated } = useAuthStore();

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
            {isAuthenticated ? (
              <Button asChild>
                <Link to="dashboard">Back to dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="login">Back to login</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
