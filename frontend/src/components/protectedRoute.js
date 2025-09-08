const ProtectedRoute = () => {
  const { user } = useAuth();

  if (!user) {
    // If there's no user, redirect to the login page.
    return <Navigate to="/login" />;
  }

  // If a user is logged in, render the nested child routes.
  return <Outlet />;
};