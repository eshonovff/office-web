import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/(auth)/layout.tsx', [route('login', 'routes/(auth)/login/route.tsx')]),

  layout('routes/(app)/layout.tsx', [
    index('routes/(app)/dashboard/route.tsx'),
    route('change-password', 'routes/(app)/change-password/route.tsx'),
    route('403', 'routes/(app)/403/route.tsx'),
    route('users', 'routes/(app)/users/route.tsx'),
    route('users/create', 'routes/(app)/users/create/route.tsx'),
    route('users/:id', 'routes/(app)/users/id/route.tsx'),
    route('roles', 'routes/(app)/roles/route.tsx'),
    route('projects', 'routes/(app)/projects/route.tsx'),
    route('projects/:id', 'routes/(app)/projects/id/route.tsx'),
  ]),

  ...(import.meta.env.DEV ? [route('kitchen-sink', 'routes/kitchen-sink.tsx')] : []),
] satisfies RouteConfig;
