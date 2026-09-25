import { type RouteConfig, index, layout, route } from '@react-router/dev/routes';

export default [
  layout('routes/(public)/layout.tsx', [index('routes/(public)/landing/route.tsx')]),

  // One sign-in page for staff and мизоҷ alike, and the мизоҷ sign-up — all in one look.
  layout('routes/(auth)/layout.tsx', [
    route('login', 'routes/(auth)/login/route.tsx'),
    route('register', 'routes/(auth)/register/route.tsx'),
    route('verify-email', 'routes/(auth)/verify-email/route.tsx'),
    route('forgot-password', 'routes/(auth)/forgot-password/route.tsx'),
    route('reset-password', 'routes/(auth)/reset-password/route.tsx'),
  ]),
  route('account/login', 'routes/account-login-redirect.tsx'),

  layout('routes/(account)/layout.tsx', [
    route('account', 'routes/(account)/account/route.tsx'),
    route('account/billing', 'routes/(account)/billing/route.tsx'),
    route('account/automations', 'routes/(account)/automations/route.tsx'),
    route('account/automations/flows/:id', 'routes/(account)/automations/flows/id/route.tsx'),
    route('account/settings', 'routes/(account)/settings/route.tsx'),
    route('account/chats', 'routes/(account)/chats/route.tsx'),
    route('account/comments', 'routes/(account)/comments/route.tsx'),
  ]),

  layout('routes/(app)/layout.tsx', [
    route('dashboard', 'routes/(app)/dashboard/route.tsx', [
      index('routes/(app)/dashboard/index/route.tsx'),
      route('stats', 'routes/(app)/dashboard/stats/route.tsx'),
    ]),
    route('change-password', 'routes/(app)/change-password/route.tsx'),
    route('403', 'routes/(app)/403/route.tsx'),
    route('users', 'routes/(app)/users/route.tsx'),
    route('users/create', 'routes/(app)/users/create/route.tsx'),
    route('users/:id', 'routes/(app)/users/id/route.tsx'),
    route('roles', 'routes/(app)/roles/route.tsx'),
    route('projects', 'routes/(app)/projects/route.tsx'),
    route('projects/:id', 'routes/(app)/projects/id/route.tsx'),
    route('inbox', 'routes/(app)/inbox/route.tsx'),
    route('channels', 'routes/(app)/channels/route.tsx'),
    route('instagram-automation', 'routes/(app)/instagram-automation/redirect.tsx'),
    route('automations', 'routes/(app)/automations/route.tsx'),
    route('automations/flows/:id', 'routes/(app)/automations/flows/id/route.tsx'),
    route('subscriptions', 'routes/(app)/subscriptions/route.tsx'),
  ]),

  ...(import.meta.env.DEV ? [route('kitchen-sink', 'routes/kitchen-sink.tsx')] : []),
] satisfies RouteConfig;
