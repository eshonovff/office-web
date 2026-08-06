import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("kitchen-sink", "routes/kitchen-sink.tsx"),
] satisfies RouteConfig;
